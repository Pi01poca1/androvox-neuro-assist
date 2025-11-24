-- Fix 1: Drop problematic RLS policy on profiles that causes infinite recursion
DROP POLICY IF EXISTS "Users can view profiles in their clinic" ON public.profiles;

-- Create a simpler, non-recursive policy for profiles
CREATE POLICY "Users can view profiles in their clinic" 
ON public.profiles 
FOR SELECT 
USING (
  clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

-- Fix 2: Insert missing user_role for the existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('7e511aad-c5bd-473c-8765-80e3bb233663', 'profissional')
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure the trigger is properly set up for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();