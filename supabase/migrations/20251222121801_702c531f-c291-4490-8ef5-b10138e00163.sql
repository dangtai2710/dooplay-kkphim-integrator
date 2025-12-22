-- Post categories for blog posts
CREATE TABLE IF NOT EXISTS public.post_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  seo_title TEXT,
  seo_description TEXT,
  seo_keyword TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Link posts to a category (single category like basic WP setup)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'posts'
      AND constraint_name = 'posts_category_id_fkey'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES public.post_categories(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_category_id ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_post_categories_deleted_at ON public.post_categories(deleted_at);

-- Timestamp trigger for post_categories
DROP TRIGGER IF EXISTS update_post_categories_updated_at ON public.post_categories;
CREATE TRIGGER update_post_categories_updated_at
BEFORE UPDATE ON public.post_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

-- Policies: viewable like other taxonomies
DROP POLICY IF EXISTS "Post categories are viewable by everyone" ON public.post_categories;
CREATE POLICY "Post categories are viewable by everyone"
ON public.post_categories
FOR SELECT
USING ((deleted_at IS NULL) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert post categories" ON public.post_categories;
CREATE POLICY "Admins can insert post categories"
ON public.post_categories
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update post categories" ON public.post_categories;
CREATE POLICY "Admins can update post categories"
ON public.post_categories
FOR UPDATE
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete post categories" ON public.post_categories;
CREATE POLICY "Admins can delete post categories"
ON public.post_categories
FOR DELETE
USING (is_admin(auth.uid()));

-- Allow public to read published posts (keep deleted hidden)
-- Note: posts SELECT policy currently is (deleted_at IS NULL). Keep as-is; no change needed.
