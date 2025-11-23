export type GenderType = 'M' | 'F' | 'Outro' | 'Não informado';

export interface Patient {
  id: string;
  clinic_id: string;
  public_id: string;
  full_name: string | null;
  birth_date: string | null;
  gender: GenderType;
  notes_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientInput {
  public_id: string;
  full_name?: string;
  birth_date?: string;
  gender?: GenderType;
  notes_summary?: string;
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {
  id: string;
}
