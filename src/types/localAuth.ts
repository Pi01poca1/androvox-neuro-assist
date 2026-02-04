import type { AppRole } from './roles';

export interface LocalUserProfile {
  id: string;
  email: string;
  full_name: string;
  clinic_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface LocalAuthContextType {
  user: LocalUserProfile | null;
  profile: LocalUserProfile | null;
  userRole: AppRole | null;
  clinicId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, clinicName?: string, logoData?: string | null) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}
