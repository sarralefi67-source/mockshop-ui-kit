-- Promotions globales avec product_id obligatoire.
-- applies_to_all = true signifie que la remise vise tous les produits.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price numeric(10,3);

-- Les coupons utilisés sont conservés pour l'historique des commandes.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_coupon_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE NO ACTION;

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS applies_to_all boolean NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS trg_promotions_refresh ON public.promotions;
DROP TRIGGER IF EXISTS trg_promotions_update_cost_price ON public.promotions;
DROP FUNCTION IF EXISTS public.refresh_all_promo_items();
DROP FUNCTION IF EXISTS public.refresh_promo_for_item(uuid, uuid);
DROP FUNCTION IF EXISTS public.trg_promotions_refresh();
DROP FUNCTION IF EXISTS public.get_effective_promo_price(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.refresh_products_cost_price();
DROP FUNCTION IF EXISTS public.refresh_product_variants_cost_price();
DROP FUNCTION IF EXISTS public.refresh_all_promo_prices();
DROP FUNCTION IF EXISTS public.trg_promotions_update_cost_price();
DROP FUNCTION IF EXISTS public.deactivate_expired_promotions();

CREATE OR REPLACE FUNCTION public.get_effective_promo_price(
  p_product_id uuid,
  p_variant_id uuid,
  p_price numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_type text;
  v_value numeric;
  v_effective numeric;
BEGIN
  SELECT discount_type, discount_value
    INTO v_type, v_value
    FROM public.promotions
   WHERE is_active = true
     AND (
       (variant_id IS NOT NULL AND variant_id = p_variant_id)
       OR (
         variant_id IS NULL
         AND (applies_to_all = true OR product_id = p_product_id)
       )
     )
     AND (starts_at IS NULL OR starts_at <= now())
     AND (ends_at IS NULL OR ends_at >= now())
   ORDER BY
     CASE WHEN variant_id IS NOT NULL THEN 0 ELSE 1 END,
     discount_value DESC
   LIMIT 1;

  IF v_type IS NULL THEN
    RETURN p_price;
  END IF;

  IF v_type = 'percentage' THEN
    v_effective := round(greatest(0, p_price * (1 - v_value / 100))::numeric, 3);
  ELSE
    v_effective := round(greatest(0, p_price - v_value)::numeric, 3);
  END IF;

  RETURN v_effective;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_products_cost_price()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products AS product
     SET cost_price = public.get_effective_promo_price(product.id, NULL, product.base_price)
   WHERE true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_product_variants_cost_price()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.product_variants AS variant
     SET cost_price = public.get_effective_promo_price(
       variant.product_id,
       variant.id,
       variant.price
     )
   WHERE true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_all_promo_prices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_products_cost_price();
  PERFORM public.refresh_product_variants_cost_price();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_promotions_update_cost_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_all_promo_prices();
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_promotions_update_cost_price
AFTER INSERT OR UPDATE OR DELETE ON public.promotions
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_promotions_update_cost_price();

CREATE OR REPLACE FUNCTION public.deactivate_expired_promotions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deactivated_count integer;
BEGIN
  UPDATE public.promotions
     SET is_active = false
   WHERE is_active = true
     AND ends_at IS NOT NULL
     AND ends_at < now();

  GET DIAGNOSTICS deactivated_count = ROW_COUNT;
  RETURN deactivated_count;
END;
$$;

-- Initialiser cost_price pour les produits déjà présents.
SELECT public.refresh_products_cost_price();
SELECT public.refresh_product_variants_cost_price();

-- Planification automatique horaire si pg_cron est activé dans Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'deactivate-expired-promotions';

    PERFORM cron.schedule(
      'deactivate-expired-promotions',
      '0 * * * *',
      'SELECT public.deactivate_expired_promotions();'
    );
  END IF;
END;
$$;

-- Le prix promotionnel est calculé avec :
-- public.get_effective_promo_price(product_id, variant_id, prix)
