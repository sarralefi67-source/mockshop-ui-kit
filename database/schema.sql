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
  position int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_categories_parent on categories(parent_id);

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

-- NOTE: à dupliquer/adapter pour attributes, attribute_values, product_variants (write),
-- promotions, coupons, order_items, addresses, carts, cart_items etc.
