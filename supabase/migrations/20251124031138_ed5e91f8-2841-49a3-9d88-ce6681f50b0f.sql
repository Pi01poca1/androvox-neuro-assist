-- Create session_history table for audit trail
CREATE TABLE IF NOT EXISTS public.session_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  clinic_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;

-- Profissionais can view session history in their clinic
CREATE POLICY "Profissionais can view session history"
  ON public.session_history
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
    AND has_role(auth.uid(), 'profissional'::app_role)
  );

-- Create function to track session changes
CREATE OR REPLACE FUNCTION public.track_session_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  field_record RECORD;
BEGIN
  -- Track creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.session_history (
      session_id, changed_by, change_type, clinic_id
    ) VALUES (
      NEW.id, NEW.created_by, 'created', NEW.clinic_id
    );
    RETURN NEW;
  END IF;

  -- Track updates
  IF TG_OP = 'UPDATE' THEN
    -- Track session_date changes
    IF OLD.session_date IS DISTINCT FROM NEW.session_date THEN
      INSERT INTO public.session_history (
        session_id, changed_by, change_type, field_name, old_value, new_value, clinic_id
      ) VALUES (
        NEW.id, auth.uid(), 'updated', 'session_date', 
        OLD.session_date::TEXT, NEW.session_date::TEXT, NEW.clinic_id
      );
    END IF;

    -- Track mode changes
    IF OLD.mode IS DISTINCT FROM NEW.mode THEN
      INSERT INTO public.session_history (
        session_id, changed_by, change_type, field_name, old_value, new_value, clinic_id
      ) VALUES (
        NEW.id, auth.uid(), 'updated', 'mode', 
        OLD.mode::TEXT, NEW.mode::TEXT, NEW.clinic_id
      );
    END IF;

    -- Track main_complaint changes
    IF OLD.main_complaint IS DISTINCT FROM NEW.main_complaint THEN
      INSERT INTO public.session_history (
        session_id, changed_by, change_type, field_name, old_value, new_value, clinic_id
      ) VALUES (
        NEW.id, auth.uid(), 'updated', 'main_complaint', 
        OLD.main_complaint, NEW.main_complaint, NEW.clinic_id
      );
    END IF;

    -- Track hypotheses changes
    IF OLD.hypotheses IS DISTINCT FROM NEW.hypotheses THEN
      INSERT INTO public.session_history (
        session_id, changed_by, change_type, field_name, old_value, new_value, clinic_id
      ) VALUES (
        NEW.id, auth.uid(), 'updated', 'hypotheses', 
        OLD.hypotheses, NEW.hypotheses, NEW.clinic_id
      );
    END IF;

    -- Track interventions changes
    IF OLD.interventions IS DISTINCT FROM NEW.interventions THEN
      INSERT INTO public.session_history (
        session_id, changed_by, change_type, field_name, old_value, new_value, clinic_id
      ) VALUES (
        NEW.id, auth.uid(), 'updated', 'interventions', 
        OLD.interventions, NEW.interventions, NEW.clinic_id
      );
    END IF;

    -- Track observations changes
    IF OLD.observations IS DISTINCT FROM NEW.observations THEN
      INSERT INTO public.session_history (
        session_id, changed_by, change_type, field_name, old_value, new_value, clinic_id
      ) VALUES (
        NEW.id, auth.uid(), 'updated', 'observations', 
        OLD.observations, NEW.observations, NEW.clinic_id
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Track deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.session_history (
      session_id, changed_by, change_type, clinic_id
    ) VALUES (
      OLD.id, auth.uid(), 'deleted', OLD.clinic_id
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger for automatic tracking
CREATE TRIGGER track_session_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.track_session_changes();