import type { AppRole } from './roles';

// Re-export for backward compatibility
export type { AppRole };

export interface UserProfile {
  id: string;
  clinic_id: string;
  full_name: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  userRole: AppRole | null;
  clinicId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, clinicName?: string, logoData?: string | null) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}
