-- Create table to track deleted media files
CREATE TABLE public.deleted_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.deleted_media ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view deleted media"
ON public.deleted_media FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert deleted media"
ON public.deleted_media FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete deleted media records"
ON public.deleted_media FOR DELETE
USING (is_admin(auth.uid()));