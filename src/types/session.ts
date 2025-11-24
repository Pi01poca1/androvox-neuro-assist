export type SessionMode = 'online' | 'presencial' | 'híbrida';
export type SessionStatus = 'agendada' | 'concluída' | 'cancelada';

export interface Session {
  id: string;
  clinic_id: string;
  patient_id: string;
  session_date: string;
  mode: SessionMode;
  status?: SessionStatus;
  scheduled_duration?: number;
  reminder_sent?: boolean;
  main_complaint: string | null;
  observations: string | null;
  interventions: string | null;
  hypotheses: string | null;
  ai_suggestions: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patients?: {
    id: string;
    public_id: string;
    full_name: string | null;
  };
}

export interface ClinicalSession extends Session {}

export interface CreateSessionInput {
  patient_id: string;
  session_date?: string;
  mode?: SessionMode;
  main_complaint?: string;
  observations?: string;
  interventions?: string;
  hypotheses?: string;
}

export interface UpdateSessionInput extends Partial<CreateSessionInput> {
  id: string;
}

export interface AISessionSuggestion {
  type: 'hypothesis' | 'intervention' | 'summary';
  content: string;
  confidence: 'high' | 'medium' | 'low';
  created_at: string;
}
