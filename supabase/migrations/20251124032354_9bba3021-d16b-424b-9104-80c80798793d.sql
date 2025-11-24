-- Create storage bucket for session attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-attachments', 'session-attachments', false);

-- Create session_attachments table
CREATE TABLE IF NOT EXISTS public.session_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_attachments ENABLE ROW LEVEL SECURITY;

-- Profissionais can view attachments in their clinic
CREATE POLICY "Profissionais can view session attachments"
  ON public.session_attachments
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
    AND has_role(auth.uid(), 'profissional'::app_role)
  );

-- Profissionais can insert attachments
CREATE POLICY "Profissionais can insert session attachments"
  ON public.session_attachments
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
    AND has_role(auth.uid(), 'profissional'::app_role)
    AND uploaded_by = auth.uid()
  );

-- Profissionais can delete their own attachments
CREATE POLICY "Profissionais can delete session attachments"
  ON public.session_attachments
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
    AND has_role(auth.uid(), 'profissional'::app_role)
  );

-- Storage policies for session-attachments bucket
-- Users can view files from their clinic's sessions
CREATE POLICY "Users can view session attachment files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'session-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT clinic_id::text
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Users can upload files to their clinic folder
CREATE POLICY "Users can upload session attachment files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'session-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT clinic_id::text
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Users can delete files from their clinic folder
CREATE POLICY "Users can delete session attachment files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'session-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT clinic_id::text
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );