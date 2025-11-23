import type { User, Session } from '@supabase/supabase-js';

export type { User, Session };

export interface UserProfile {
  id: string;
  clinic_id: string;
  full_name: string;
  role: 'admin' | 'clinico' | 'assistente';
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, clinicName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}
