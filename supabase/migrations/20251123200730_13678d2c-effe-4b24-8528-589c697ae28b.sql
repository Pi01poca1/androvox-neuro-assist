-- ANDROVOX ASSIST - NEUROPSICOLOGIA
-- Database schema for clinical psychology/neuropsychology practice

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE privacy_mode AS ENUM ('ID', 'NOME');
CREATE TYPE gender_type AS ENUM ('M', 'F', 'Outro', 'Não informado');
CREATE TYPE session_mode AS ENUM ('online', 'presencial', 'híbrida');
CREATE TYPE user_role AS ENUM ('admin', 'clinico', 'assistente');

-- Clinics table
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'clinico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  public_id TEXT NOT NULL,
  full_name TEXT,
  birth_date DATE,
  gender gender_type DEFAULT 'Não informado',
  notes_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, public_id)
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  mode session_mode NOT NULL DEFAULT 'presencial',
  main_complaint TEXT,
  observations TEXT,
  interventions TEXT,
  hypotheses TEXT,
  ai_suggestions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI audit logs table
CREATE TABLE public.ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  full_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offline sync queue table
CREATE TABLE public.sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  data JSONB NOT NULL,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinics
CREATE POLICY "Users can view their own clinic"
  ON public.clinics FOR SELECT
  USING (id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update their clinic"
  ON public.clinics FOR UPDATE
  USING (id IN (
    SELECT clinic_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their clinic"
  ON public.profiles FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for patients
CREATE POLICY "Users can view patients in their clinic"
  ON public.patients FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clinicians can insert patients"
  ON public.patients FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clinicians can update patients in their clinic"
  ON public.patients FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete patients in their clinic"
  ON public.patients FOR DELETE
  USING (clinic_id IN (
    SELECT clinic_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'clinico')
  ));

-- RLS Policies for sessions
CREATE POLICY "Users can view sessions in their clinic"
  ON public.sessions FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clinicians can insert sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clinicians can update sessions"
  ON public.sessions FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Clinicians can delete sessions"
  ON public.sessions FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for ai_logs
CREATE POLICY "Users can view ai_logs in their clinic"
  ON public.ai_logs FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert ai_logs"
  ON public.ai_logs FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for sync_queue
CREATE POLICY "Users can view their own sync queue"
  ON public.sync_queue FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert to sync queue"
  ON public.sync_queue FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync queue"
  ON public.sync_queue FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile and clinic on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for better performance
CREATE INDEX idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX idx_patients_public_id ON public.patients(public_id);
CREATE INDEX idx_sessions_clinic_id ON public.sessions(clinic_id);
CREATE INDEX idx_sessions_patient_id ON public.sessions(patient_id);
CREATE INDEX idx_sessions_date ON public.sessions(session_date DESC);
CREATE INDEX idx_ai_logs_clinic_id ON public.ai_logs(clinic_id);
CREATE INDEX idx_ai_logs_patient_id ON public.ai_logs(patient_id);
CREATE INDEX idx_sync_queue_user_id ON public.sync_queue(user_id);
CREATE INDEX idx_sync_queue_synced ON public.sync_queue(synced);