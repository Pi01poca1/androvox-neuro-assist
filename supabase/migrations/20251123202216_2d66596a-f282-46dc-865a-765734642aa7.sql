-- Create app_role enum for security
CREATE TYPE public.app_role AS ENUM ('profissional', 'secretario');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update handle_new_user to create role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_clinic_id UUID;
  user_role app_role;
BEGIN
  -- Determine role from metadata
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'profissional'::app_role
  );

  -- Create clinic only for profissional
  IF user_role = 'profissional' THEN
    INSERT INTO public.clinics (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica'))
    RETURNING id INTO new_clinic_id;
  ELSE
    -- Secretario must be assigned to existing clinic
    new_clinic_id := (NEW.raw_user_meta_data->>'clinic_id')::UUID;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, clinic_id, full_name, role)
  VALUES (
    NEW.id,
    new_clinic_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'role'
  );

  -- Create role entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- Update patients RLS to restrict secretarios
DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.patients;
CREATE POLICY "Users can view patients in their clinic"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinicians can insert patients" ON public.patients;
CREATE POLICY "Users can insert patients"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinicians can update patients in their clinic" ON public.patients;
CREATE POLICY "Users can update patients"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Restrict sessions access - only profissionais
DROP POLICY IF EXISTS "Users can view sessions in their clinic" ON public.sessions;
CREATE POLICY "Profissionais can view sessions"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'profissional')
  );

DROP POLICY IF EXISTS "Clinicians can insert sessions" ON public.sessions;
CREATE POLICY "Profissionais can insert sessions"
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'profissional')
  );

DROP POLICY IF EXISTS "Clinicians can update sessions" ON public.sessions;
CREATE POLICY "Profissionais can update sessions"
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'profissional')
  );

DROP POLICY IF EXISTS "Clinicians can delete sessions" ON public.sessions;
CREATE POLICY "Profissionais can delete sessions"
  ON public.sessions
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'profissional')
  );

-- Function to generate unique public_id for patients
CREATE OR REPLACE FUNCTION public.generate_patient_public_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: PAC-YYYYMMDD-XXXX
    new_id := 'PAC-' || 
              TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
              LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM patients WHERE public_id = new_id) INTO id_exists;
    
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Trigger to auto-generate public_id if not provided
CREATE OR REPLACE FUNCTION public.ensure_patient_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := public.generate_patient_public_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_patient_public_id_trigger
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_patient_public_id();