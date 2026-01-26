import { useAuth } from '@/hooks/useAuth';
import {
  getPatientsByClinic,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getSessionsByClinic,
  getSessionsByPatient,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getNotificationsByUser,
  createNotification,
  markNotificationAsRead,
  getAILogsByClinic,
  createAILog,
  getAttachmentsBySession,
  createSessionAttachment,
  deleteAttachment,
  getHistoryBySession,
  createSessionHistory,
  getClinicById,
  getClinicUsers,
  type LocalPatient,
  type LocalSession,
  type LocalNotification,
  type LocalAILog,
  type LocalSessionAttachment,
  type LocalSessionHistory,
  type LocalClinic,
  type LocalUser,
} from '@/lib/localDb';

// Re-export types for compatibility
export type {
  LocalPatient as Patient,
  LocalSession as Session,
  LocalNotification as Notification,
  LocalAILog as AILog,
  LocalSessionAttachment as SessionAttachment,
  LocalSessionHistory as SessionHistory,
  LocalClinic as Clinic,
  LocalUser as User,
};

// Hook for local data operations
export function useLocalData() {
  const { user, clinicId } = useAuth();

  return {
    // Patient operations
    patients: {
      getAll: () => clinicId ? getPatientsByClinic(clinicId) : Promise.resolve([]),
      getById: getPatientById,
      create: (data: Omit<LocalPatient, 'id' | 'created_at' | 'updated_at' | 'public_id'>) => createPatient(data),
      update: updatePatient,
      delete: deletePatient,
    },
    
    // Session operations
    sessions: {
      getAll: () => clinicId ? getSessionsByClinic(clinicId) : Promise.resolve([]),
      getByPatient: getSessionsByPatient,
      getById: getSessionById,
      create: (data: Omit<LocalSession, 'id' | 'created_at' | 'updated_at'>) => createSession(data),
      update: updateSession,
      delete: deleteSession,
    },
    
    // Notification operations
    notifications: {
      getAll: () => user?.id ? getNotificationsByUser(user.id) : Promise.resolve([]),
      create: (data: Omit<LocalNotification, 'id' | 'created_at'>) => createNotification(data),
      markAsRead: markNotificationAsRead,
    },
    
    // AI Log operations
    aiLogs: {
      getAll: () => clinicId ? getAILogsByClinic(clinicId) : Promise.resolve([]),
      create: (data: Omit<LocalAILog, 'id' | 'created_at'>) => createAILog(data),
    },
    
    // Attachment operations
    attachments: {
      getBySession: getAttachmentsBySession,
      create: (data: Omit<LocalSessionAttachment, 'id' | 'uploaded_at'>) => createSessionAttachment(data),
      delete: deleteAttachment,
    },
    
    // History operations
    history: {
      getBySession: getHistoryBySession,
      create: (data: Omit<LocalSessionHistory, 'id' | 'changed_at'>) => createSessionHistory(data),
    },
    
    // Clinic operations
    clinic: {
      get: () => clinicId ? getClinicById(clinicId) : Promise.resolve(undefined),
      getTeam: () => clinicId ? getClinicUsers(clinicId) : Promise.resolve([]),
    },
    
    // Context
    clinicId,
    userId: user?.id,
  };
}
