-- Une catégorie principale se référence elle-même comme parent.
-- Une sous-catégorie référence l'id de sa catégorie parente.

UPDATE public.categories
   SET parent_id = id
 WHERE parent_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_category_parent_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.parent_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_parent_id ON public.categories;

CREATE TRIGGER trg_categories_parent_id
BEFORE INSERT OR UPDATE OF parent_id ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.set_category_parent_id();
