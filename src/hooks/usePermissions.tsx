import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Permission } from '@/types/roles';

export function usePermissions(): Permission {
  const { userRole } = useAuth();

  return useMemo(() => {
    if (userRole === 'profissional') {
      return {
        canViewSessions: true,
        canCreateSessions: true,
        canEditSessions: true,
        canDeleteSessions: true,
        canViewPatients: true,
        canCreatePatients: true,
        canEditPatients: true,
        canDeletePatients: true,
        canUseAI: true,
        canViewAILogs: true,
        canAccessSettings: true,
        canManageSchedule: true,
      };
    }

    // Secretário - cadastro de pacientes + gestão de agenda (sem dados clínicos)
    return {
      canViewSessions: false,
      canCreateSessions: false,
      canEditSessions: false,
      canDeleteSessions: false,
      canViewPatients: true,
      canCreatePatients: true,
      canEditPatients: true,
      canDeletePatients: false,
      canUseAI: false,
      canViewAILogs: false,
      canAccessSettings: false,
      canManageSchedule: true, // Secretário pode gerenciar agenda
    };
  }, [userRole]);
}
