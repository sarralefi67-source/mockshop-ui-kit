-- Checkout: a single transactional RPC instead of raw client-side INSERTs.
-- Reasons this has to be server-side, not RLS + direct inserts:
--   - price/stock must be re-validated from the DB, never trusted from the
--     client (a malicious client could otherwise submit any unit_price);
--   - stock must be decremented atomically with the order (row locks via
--     `for update`) so two simultaneous orders on the last unit can't both
--     succeed;
--   - a coupon must be validated + its usage recorded without ever exposing
--     the `coupons` table to public SELECT (it has no public read policy —
--     see the RLS audit).
-- Requires an account (auth.uid() must be set) per product decision.

create or replace function public.create_order(
  p_items jsonb,               -- [{product_id, variant_id, variant_label, quantity}]
  p_governorate text,
  p_shipping_address jsonb,    -- {full_name, phone, line1, city, governorate, postal_code}
  p_coupon_code text default null,
  p_notes text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_order_id uuid;
  v_item jsonb;
  v_qty int;
  v_product record;
  v_variant record;
  v_promo record;
  v_base_price numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
  v_order_id uuid;
  v_coupon record;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing_order_id from public.orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      return (select jsonb_build_object('id', id, 'order_number', order_number, 'total', total)
              from public.orders where id = v_existing_order_id);
    end if;
  end if;

  select price into v_shipping from public.shipping_rates
    where governorate = p_governorate and is_active = true;
  if v_shipping is null then
    raise exception 'Shipping not available for this governorate';
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_amount, discount_amount, total,
    shipping_address, billing_address, payment_method, payment_status, notes, idempotency_key
  )
  values (
    v_user_id, 'pending', 0, v_shipping, 0, 0,
    p_shipping_address, p_shipping_address, 'cod', 'unpaid', p_notes, p_idempotency_key
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select id, name, sku, base_price, stock_quantity, is_active
      into v_product
      from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

    if v_product.id is null or v_product.is_active is false then
      raise exception 'Product not available';
    end if;

    -- active promotion for this product (product_id is UNIQUE — at most one)
    select discount_type, discount_value into v_promo
      from public.promotions
      where product_id = v_product.id and is_active = true
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now());

    if nullif(v_item->>'variant_id', '') is not null then
      select id, sku, price, stock_quantity, is_active
        into v_variant
        from public.product_variants
        where id = (v_item->>'variant_id')::uuid and product_id = v_product.id
        for update;
      if v_variant.id is null or v_variant.is_active is false then
        raise exception 'Variant not available';
      end if;
      if v_variant.stock_quantity < v_qty then
        raise exception 'Insufficient stock for %', v_product.name;
      end if;
      v_base_price := v_variant.price;
      update public.product_variants set stock_quantity = stock_quantity - v_qty where id = v_variant.id;
    else
      if v_product.stock_quantity < v_qty then
        raise exception 'Insufficient stock for %', v_product.name;
      end if;
      v_base_price := v_product.base_price;
      update public.products set stock_quantity = stock_quantity - v_qty where id = v_product.id;
      v_variant.sku := null;
    end if;

    v_unit_price := case
      when v_promo.discount_type = 'percentage' then greatest(0, v_base_price * (1 - v_promo.discount_value / 100))
      when v_promo.discount_type = 'fixed' then greatest(0, v_base_price - v_promo.discount_value)
      else v_base_price
    end;
    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, total
    )
    values (
      v_order_id, v_product.id, nullif(v_item->>'variant_id', '')::uuid, v_product.name,
      nullif(v_item->>'variant_label', ''), coalesce(v_variant.sku, v_product.sku), v_unit_price, v_qty, v_line_total
    );

    v_variant := null;
  end loop;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select * into v_coupon from public.coupons
      where upper(code) = upper(trim(p_coupon_code)) and is_active = true
        and (starts_at is null or starts_at <= now())
        and (expires_at is null or expires_at >= now())
      for update;
    if v_coupon.id is null then
      raise exception 'Invalid or expired coupon';
    end if;
    if v_coupon.min_order_amount is not null and v_subtotal < v_coupon.min_order_amount then
      raise exception 'Order does not meet the minimum amount for this coupon';
    end if;
    if v_coupon.max_uses is not null and coalesce(v_coupon.used_count, 0) >= v_coupon.max_uses then
      raise exception 'Coupon usage limit reached';
    end if;
    if v_coupon.max_uses_per_user is not null then
      if (select count(*) from public.coupon_usages where coupon_id = v_coupon.id and user_id = v_user_id)
         >= v_coupon.max_uses_per_user then
        raise exception 'You have already used this coupon';
      end if;
    end if;

    if v_coupon.discount_type = 'percentage' then
      v_discount := v_subtotal * (coalesce(v_coupon.discount_value, 0) / 100);
    elsif v_coupon.discount_type = 'fixed' then
      v_discount := least(coalesce(v_coupon.discount_value, 0), v_subtotal);
    elsif v_coupon.discount_type = 'free_shipping' then
      v_shipping := 0;
    end if;

    update public.coupons set used_count = coalesce(used_count, 0) + 1 where id = v_coupon.id;
    insert into public.coupon_usages (coupon_id, user_id, order_id) values (v_coupon.id, v_user_id, v_order_id);
    update public.orders set coupon_id = v_coupon.id where id = v_order_id;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_shipping;

  update public.orders
    set subtotal = v_subtotal, discount_amount = v_discount, shipping_amount = v_shipping, total = v_total
    where id = v_order_id;

  return (select jsonb_build_object('id', id, 'order_number', order_number, 'total', total)
          from public.orders where id = v_order_id);
end;
$$;

grant execute on function public.create_order(jsonb, text, jsonb, text, text, text) to authenticated;

-- Coupon validation for the "Appliquer" button in the cart summary, before
-- the order actually exists — coupons has no public SELECT policy (by
-- design, codes shouldn't be enumerable), so this is the only way a
-- customer can check a code. Read-only, no side effects.
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_coupon record;
  v_user_id uuid := auth.uid();
  v_uses int := 0;
begin
  select * into v_coupon from public.coupons
    where upper(code) = upper(trim(p_code)) and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now());

  if v_coupon.id is null then
    return jsonb_build_object('ok', false, 'message', 'Code promo invalide ou expiré.');
  end if;
  if v_coupon.min_order_amount is not null and p_subtotal < v_coupon.min_order_amount then
    return jsonb_build_object('ok', false, 'message', format('Minimum %s DT d''achat requis.', v_coupon.min_order_amount));
  end if;
  if v_coupon.max_uses is not null and coalesce(v_coupon.used_count, 0) >= v_coupon.max_uses then
    return jsonb_build_object('ok', false, 'message', 'Ce code a atteint sa limite d''utilisation.');
  end if;
  if v_user_id is not null and v_coupon.max_uses_per_user is not null then
    select count(*) into v_uses from public.coupon_usages where coupon_id = v_coupon.id and user_id = v_user_id;
    if v_uses >= v_coupon.max_uses_per_user then
      return jsonb_build_object('ok', false, 'message', 'Vous avez déjà utilisé ce code.');
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
end;
$$;

grant execute on function public.validate_coupon(text, numeric) to authenticated;
