export type SessionMode = 'online' | 'presencial' | 'híbrida';

export interface ClinicalSession {
  id: string;
  clinic_id: string;
  patient_id: string;
  session_date: string;
  mode: SessionMode;
  main_complaint: string | null;
  observations: string | null;
  interventions: string | null;
  hypotheses: string | null;
  ai_suggestions: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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
