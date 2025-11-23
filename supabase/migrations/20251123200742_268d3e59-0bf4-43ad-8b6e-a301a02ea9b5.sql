-- Fix security warnings: Set search_path for functions

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_clinic_id UUID;
BEGIN
  -- Create a new clinic for the user
  INSERT INTO public.clinics (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica'))
  RETURNING id INTO new_clinic_id;

  -- Create profile
  INSERT INTO public.profiles (id, clinic_id, full_name, role)
  VALUES (
    NEW.id,
    new_clinic_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );

  RETURN NEW;
END;
$$;