-- Example RLS policies to allow admin users (profiles.role = 'admin') to insert/update/delete
-- Replace <schema> with your schema if needed (default: public)

-- Enable RLS on relevant tables
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS variant_images ENABLE ROW LEVEL SECURITY;

-- Function to check admin role by joining profiles
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
DECLARE
  p_role text;
BEGIN
  SELECT role INTO p_role FROM public.profiles WHERE id = auth.uid();
  RETURN p_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy examples: allow admins full access
CREATE POLICY "admins full access on products" ON products
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins full access on product_images" ON product_images
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins full access on product_variants" ON product_variants
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins full access on variant_images" ON variant_images
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Notes:
-- 1) The function is_admin() reads from public.profiles using auth.uid(). Ensure your profiles table is populated for auth.users.
-- 2) For more granular policies (allow owners or service role), adjust USING / WITH CHECK accordingly.
-- 3) Apply these statements in Supabase SQL editor as a project admin.
