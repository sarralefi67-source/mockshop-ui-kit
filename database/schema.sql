-- =========================================================
-- SCHEMA E-COMMERCE — Supabase / Postgres
-- Catégories imbriquées, variantes dynamiques, promos, coupons,
-- panier, commandes, wishlist, newsletter
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. PROFILS (extension de auth.users)
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  newsletter_opt_in boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 2. CATEGORIES (auto-référencées = niveaux illimités)
-- ---------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_categories_parent on categories(parent_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

-- Génération automatique de slugs pour les URLs publiques.
create extension if not exists unaccent;

create or replace function public.generate_category_slug(
  p_name text,
  p_category_id uuid default null
)
returns text
language plpgsql
stable
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 2;
begin
  base_slug := lower(regexp_replace(unaccent(coalesce(p_name, '')), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '(^-|-$)', '', 'g');

  if base_slug = '' then
    base_slug := 'categorie';
  end if;

  candidate := base_slug;
  while exists (
    select 1
      from public.categories
     where slug = candidate
       and (p_category_id is null or id <> p_category_id)
  ) loop
    candidate := base_slug || '-' || suffix;
    suffix := suffix + 1;
  end loop;

  return candidate;
end;
$$;

create or replace function public.set_category_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug := public.generate_category_slug(new.name, new.id);
  return new;
end;
$$;

drop trigger if exists trg_categories_set_slug on public.categories;
create trigger trg_categories_set_slug
before insert or update of name on public.categories
for each row
execute function public.set_category_slug();

-- ---------------------------------------------------------
-- 3. PRODUITS
-- ---------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  brand text,
  base_price numeric(10,3) not null,       -- prix si pas de variantes / prix de départ
  cost_price numeric(10,3),
  sku text unique,
  has_variants boolean default false,
  stock_quantity int default 0,             -- utilisé seulement si has_variants = false
  weight numeric,
  is_active boolean default true,
  meta_title text,
  meta_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_category on products(category_id);
create index idx_products_slug on products(slug);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  url text not null,
  position int default 0,
  is_main boolean default false
);

-- ---------------------------------------------------------
-- 4. ATTRIBUTS & VARIANTES DYNAMIQUES
-- ---------------------------------------------------------
create table attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- ex: Couleur, Taille, Capacité
  display_type text default 'select'        -- select | color_swatch | image_swatch
);

create table attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid references attributes(id) on delete cascade,
  value text not null,                      -- ex: Rouge, XL, 128Go
  color_hex text,                           -- si display_type = color_swatch
  position int default 0
);

create table product_attributes (
  product_id uuid references products(id) on delete cascade,
  attribute_id uuid references attributes(id) on delete cascade,
  primary key (product_id, attribute_id)
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  sku text unique,
  price numeric(10,3) not null,
  cost_price numeric(10,3),               -- prix promotionnel calculé, null si aucune promo
  compare_at_price numeric(10,3),           -- prix barré / solde
  stock_quantity int default 0,
  is_active boolean default true,
  position int default 0,
  created_at timestamptz default now()
);

create index idx_variants_product on product_variants(product_id);

create table variant_attribute_values (
  variant_id uuid references product_variants(id) on delete cascade,
  attribute_value_id uuid references attribute_values(id) on delete cascade,
  primary key (variant_id, attribute_value_id)
);

-- images spécifiques à chaque variante (ex: galerie change selon la couleur choisie)
create table variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references product_variants(id) on delete cascade,
  url text not null,
  position int default 0
);

create index idx_variant_images_variant on variant_images(variant_id);

-- ---------------------------------------------------------
-- 5. PROMOTIONS (soldes automatiques, affichées sur la fiche produit)
-- ---------------------------------------------------------
create table promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade, -- null = toute la gamme
  discount_type text check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,3) not null,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean default true
);

-- ---------------------------------------------------------
-- 6. COUPONS (codes promo au checkout)
-- ---------------------------------------------------------
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text check (discount_type in ('percentage','fixed','free_shipping')),
  discount_value numeric(10,3),
  min_order_amount numeric(10,3) default 0,
  max_uses int,
  max_uses_per_user int default 1,
  used_count int default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true
);

create table coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id) on delete cascade,
  user_id uuid references auth.users(id),
  order_id uuid,
  used_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 7. ADRESSES
-- ---------------------------------------------------------
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address_line text,
  city text,
  governorate text,
  postal_code text,
  is_default boolean default false
);

-- ---------------------------------------------------------
-- 8. PANIER
-- ---------------------------------------------------------
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,                          -- pour les invités
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references carts(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  quantity int not null default 1,
  unit_price numeric(10,3) not null,
  added_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 9. COMMANDES
-- ---------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references auth.users(id),
  status text default 'pending' check (status in
    ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal numeric(10,3) not null,
  discount_amount numeric(10,3) default 0,
  shipping_amount numeric(10,3) default 0,
  total numeric(10,3) not null,
  coupon_id uuid references coupons(id),
  shipping_address jsonb,
  billing_address jsonb,
  payment_method text,
  payment_status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  product_name text not null,               -- snapshot au moment de l'achat
  variant_label text,                       -- ex: "Rouge / XL"
  sku text,
  unit_price numeric(10,3) not null,
  quantity int not null,
  total numeric(10,3) not null
);

alter table coupon_usages
  add constraint fk_coupon_usage_order foreign key (order_id) references orders(id) on delete set null;

-- ---------------------------------------------------------
-- 10. FAVORIS
-- ---------------------------------------------------------
create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- ---------------------------------------------------------
-- 11. NEWSLETTER
-- ---------------------------------------------------------
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  is_active boolean default true,
  subscribed_at timestamptz default now()
);

-- =========================================================
-- ROW LEVEL SECURITY (exemple de base — à compléter table par table)
-- =========================================================

alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table variant_images enable row level security;
alter table orders enable row level security;
alter table cart_items enable row level security;
alter table wishlists enable row level security;
alter table profiles enable row level security;

-- Lecture publique du catalogue actif
create policy "public read active categories" on categories
  for select using (is_active = true);

create policy "public read active products" on products
  for select using (is_active = true);

create policy "public read active variants" on product_variants
  for select using (is_active = true);

create policy "public read variant images" on variant_images
  for select using (true);

-- Un client ne voit/gère que ses propres données
create policy "user reads own profile" on profiles
  for select using (auth.uid() = id);

create policy "user manages own wishlist" on wishlists
  for all using (auth.uid() = user_id);

create policy "user reads own orders" on orders
  for select using (auth.uid() = user_id);

-- Admin = accès total (basé sur profiles.role)
create policy "admin full access categories" on categories
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin full access products" on products
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ---------------------------------------------------------
-- AUTO-GENERATED FIELDS: SKU / ORDER NUMBER
-- These helpers generate server-side values so the frontend doesn't
-- have to synthesize or display internal-only fields.
-- ---------------------------------------------------------

-- sequence for human-friendly order numbers
create sequence if not exists order_number_seq start 1000;

create function generate_order_number() returns text language sql stable as $$
  select 'ORD-' || nextval('order_number_seq')::text;
$$;

create function products_set_defaults() returns trigger as $$
begin
  if new.sku is null or new.sku = '' then
    new.sku := concat('P-', substr(md5(gen_random_uuid()::text), 1, 8));
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

create function variants_set_defaults() returns trigger as $$
begin
  if new.sku is null or new.sku = '' then
    new.sku := concat('V-', substr(md5(gen_random_uuid()::text), 1, 8));
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

-- attach triggers
drop trigger if exists trg_products_defaults on products;
create trigger trg_products_defaults before insert on products
  for each row execute procedure products_set_defaults();

drop trigger if exists trg_variants_defaults on product_variants;
create trigger trg_variants_defaults before insert on product_variants
  for each row execute procedure variants_set_defaults();

-- order number trigger
drop trigger if exists trg_orders_number on orders;
create trigger trg_orders_number before insert on orders
  for each row execute procedure (
    begin
      if new.order_number is null or new.order_number = '' then
        new.order_number := generate_order_number();
      end if;
      if new.created_at is null then
        new.created_at := now();
      end if;
      return new;
    end;
  );

-- ---------------------------------------------------------
-- 12. Ajout des champs promo stockés et routines de mise à jour
-- ---------------------------------------------------------
alter table products
  add column if not exists promo_percent numeric(5,2) default 0,
  add column if not exists price_after_promo numeric(10,3);

alter table product_variants
  add column if not exists promo_percent numeric(5,2) default 0,
  add column if not exists price_after_promo numeric(10,3);

-- calcule et stocke la promo pour un produit ou une variante
create or replace function refresh_promo_for_item(p_product_id uuid, p_variant_id uuid default null)
returns void language plpgsql as $$
declare
  v_price numeric;
  v_id uuid;
  v_type text;
  v_value numeric;
  v_effective numeric;
  v_percent numeric := 0;
begin
  if p_variant_id is not null then
    select price into v_price from product_variants where id = p_variant_id;
  else
    select base_price into v_price from products where id = p_product_id;
  end if;

  if v_price is null then
    return;
  end if;

  -- trouver la promotion applicable (variante prioritaire)
  select id, discount_type, discount_value
    into v_id, v_type, v_value
  from promotions
  where is_active = true
    and ( (variant_id is not null and variant_id = p_variant_id)
       or (variant_id is null and (product_id is null or product_id = p_product_id)) )
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  order by (case when variant_id is not null then 0 else 1 end), discount_value desc
  limit 1;

  if v_id is null then
    v_effective := v_price;
    v_percent := 0;
  else
    if v_type = 'percentage' then
      v_percent := v_value;
      v_effective := round(greatest(0, v_price * (1 - v_value / 100))::numeric, 3);
    elsif v_type = 'fixed' then
      v_effective := round(greatest(0, v_price - v_value)::numeric, 3);
      v_percent := case when v_price > 0 then round(((v_price - v_effective) / v_price) * 100, 3) else 0 end;
    else
      v_effective := v_price;
      v_percent := 0;
    end if;
  end if;

  if p_variant_id is not null then
    update product_variants set promo_percent = v_percent, price_after_promo = v_effective where id = p_variant_id;
  else
    update products set promo_percent = v_percent, price_after_promo = v_effective where id = p_product_id;
  end if;

  return;
end;
$$;

-- recalcule les prix promotionnels de tout le catalogue pour une promotion globale
create or replace function refresh_all_promo_items()
returns void language plpgsql as $$
declare
  item record;
begin
  for item in select id from products loop
    perform refresh_promo_for_item(item.id);
  end loop;

  for item in select id, product_id from product_variants loop
    perform refresh_promo_for_item(item.product_id, item.id);
  end loop;
end;
$$;

-- trigger pour rafraîchir les champs stockés quand une promotion change
create or replace function trg_promotions_refresh() returns trigger as $$
begin
  -- sur insert/update: refresh for NEW target
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if NEW.product_id is null then
      perform refresh_all_promo_items();
    else
      perform refresh_promo_for_item(NEW.product_id, NEW.variant_id);
    end if;
  end if;

  -- sur update/delete: aussi rafraîchir pour l'ancienne cible si différente
  if (tg_op = 'UPDATE' or tg_op = 'DELETE') then
    if TG_OP = 'DELETE' then
      if OLD.product_id is null then
        perform refresh_all_promo_items();
      else
        perform refresh_promo_for_item(OLD.product_id, OLD.variant_id);
      end if;
    elsif TG_OP = 'UPDATE' then
      if OLD.product_id is distinct from NEW.product_id or OLD.variant_id is distinct from NEW.variant_id then
        if OLD.product_id is null then
          perform refresh_all_promo_items();
        else
          perform refresh_promo_for_item(OLD.product_id, OLD.variant_id);
        end if;
      end if;
    end if;
  end if;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_promotions_refresh on promotions;
create trigger trg_promotions_refresh after insert or update or delete on promotions
  for each row execute procedure trg_promotions_refresh();


-- NOTE: à dupliquer/adapter pour attributes, attribute_values, product_variants (write),
-- promotions, coupons, order_items, addresses, carts, cart_items etc.
