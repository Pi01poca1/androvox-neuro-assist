export type AppRole = 'profissional' | 'secretario';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Permission {
  canViewSessions: boolean;
  canCreateSessions: boolean;
  canEditSessions: boolean;
  canDeleteSessions: boolean;
  canViewPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canUseAI: boolean;
  canViewAILogs: boolean;
  canAccessSettings: boolean;
  canManageSchedule: boolean;
}
