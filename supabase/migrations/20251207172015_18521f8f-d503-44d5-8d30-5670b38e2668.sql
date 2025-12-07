-- Create table for secretary invitations
CREATE TABLE public.secretary_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(clinic_id, email, status)
);

-- Enable RLS
ALTER TABLE public.secretary_invitations ENABLE ROW LEVEL SECURITY;

-- Professionals can view invitations for their clinic
CREATE POLICY "Professionals can view invitations"
ON public.secretary_invitations
FOR SELECT
USING (
  clinic_id IN (
    SELECT profiles.clinic_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND has_role(auth.uid(), 'profissional'::app_role)
);

-- Professionals can create invitations for their clinic
CREATE POLICY "Professionals can create invitations"
ON public.secretary_invitations
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT profiles.clinic_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND has_role(auth.uid(), 'profissional'::app_role)
  AND invited_by = auth.uid()
);

-- Professionals can update/cancel invitations
CREATE POLICY "Professionals can update invitations"
ON public.secretary_invitations
FOR UPDATE
USING (
  clinic_id IN (
    SELECT profiles.clinic_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND has_role(auth.uid(), 'profissional'::app_role)
);

-- Professionals can delete invitations
CREATE POLICY "Professionals can delete invitations"
ON public.secretary_invitations
FOR DELETE
USING (
  clinic_id IN (
    SELECT profiles.clinic_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND has_role(auth.uid(), 'profissional'::app_role)
);

-- Function to accept invitation and assign clinic to secretary
CREATE OR REPLACE FUNCTION public.accept_secretary_invitation(
  _invitation_token TEXT,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Find valid invitation
  SELECT * INTO _invitation
  FROM public.secretary_invitations
  WHERE token = _invitation_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update profile with clinic_id
  UPDATE public.profiles
  SET clinic_id = _invitation.clinic_id
  WHERE id = _user_id;
  
  -- Mark invitation as accepted
  UPDATE public.secretary_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation.id;
  
  RETURN TRUE;
END;
$$;

-- Create view for clinic team members
CREATE OR REPLACE VIEW public.clinic_team AS
SELECT 
  p.id,
  p.full_name,
  p.clinic_id,
  p.created_at,
  ur.role,
  u.email
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
JOIN auth.users u ON u.id = p.id
WHERE p.clinic_id IS NOT NULL;