-- Fix the handle_new_user function to properly cast role to user_role enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _clinic_id uuid;
  _role user_role;
BEGIN
  -- Determine role based on metadata, default to 'clinico'
  _role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::user_role,
    'clinico'::user_role
  );

  -- If creating a new professional, create a new clinic
  IF _role = 'clinico' OR _role = 'admin' THEN
    INSERT INTO public.clinics (name)
    VALUES (COALESCE(new.raw_user_meta_data ->> 'clinic_name', 'Minha Clínica'))
    RETURNING id INTO _clinic_id;
  END IF;

  -- Insert the profile
  INSERT INTO public.profiles (id, full_name, role, clinic_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    _role,
    _clinic_id
  );

  -- Insert into user_roles table (for app_role)
  -- Map user_role to app_role: clinico/admin -> profissional, assistente -> secretario
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    CASE 
      WHEN _role IN ('clinico', 'admin') THEN 'profissional'::app_role
      ELSE 'secretario'::app_role
    END
  );

  RETURN new;
END;
$$;