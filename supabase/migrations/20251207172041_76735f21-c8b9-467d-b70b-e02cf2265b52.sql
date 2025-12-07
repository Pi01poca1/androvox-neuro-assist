-- Drop the insecure view
DROP VIEW IF EXISTS public.clinic_team;

-- Create a security definer function to get clinic team members
CREATE OR REPLACE FUNCTION public.get_clinic_team(_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  clinic_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  role app_role,
  email TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE p.clinic_id = _clinic_id
    AND _clinic_id = (SELECT profiles.clinic_id FROM profiles WHERE profiles.id = auth.uid());
$$;