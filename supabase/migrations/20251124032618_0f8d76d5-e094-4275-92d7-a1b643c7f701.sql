-- Add session status field
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('agendada', 'concluída', 'cancelada');
  END IF;
END $$;

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS status session_status DEFAULT 'agendada',
ADD COLUMN IF NOT EXISTS scheduled_duration INTEGER DEFAULT 60, -- duration in minutes
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'reminder', 'cancellation', 'update', 'general'
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark notifications as read
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_sessions_status_date ON public.sessions(status, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_reminder ON public.sessions(session_date, reminder_sent) WHERE status = 'agendada';

-- Function to send session reminders
CREATE OR REPLACE FUNCTION public.get_upcoming_sessions_for_reminders()
RETURNS TABLE (
  session_id UUID,
  patient_id UUID,
  professional_id UUID,
  session_date TIMESTAMP WITH TIME ZONE,
  patient_name TEXT,
  professional_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id as session_id,
    s.patient_id,
    s.created_by as professional_id,
    s.session_date,
    p.full_name as patient_name,
    u.email as professional_email
  FROM sessions s
  JOIN patients p ON s.patient_id = p.id
  JOIN auth.users u ON s.created_by = u.id
  WHERE s.status = 'agendada'
    AND s.reminder_sent = false
    AND s.session_date > now()
    AND s.session_date <= now() + interval '24 hours'
  ORDER BY s.session_date ASC
$$;