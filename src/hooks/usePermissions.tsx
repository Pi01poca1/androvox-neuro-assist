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
      };
    }

    // Secretário - apenas agenda e cadastro
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
    };
  }, [userRole]);
}
