import { getLocalDB, type LocalClinic, type LocalUser, type LocalPatient, type LocalSession, type LocalNotification, type LocalAILog, type LocalSessionAttachment, type LocalSessionHistory } from './localDb';

export interface BackupData {
  version: string;
  exportedAt: string;
  clinicId: string;
  clinicName: string;
  data: {
    clinic: LocalClinic | undefined;
    users: LocalUser[];
    patients: LocalPatient[];
    sessions: LocalSession[];
    notifications: LocalNotification[];
    aiLogs: LocalAILog[];
    attachments: LocalSessionAttachment[];
    history: LocalSessionHistory[];
  };
}

export interface SyncPackage {
  version: string;
  syncedAt: string;
  clinicId: string;
  type: 'full' | 'incremental';
  lastSyncTimestamp?: string;
  data: {
    patients: LocalPatient[];
    sessions: LocalSession[];
  };
}

// Export all data from a clinic for backup
export async function exportClinicBackup(clinicId: string): Promise<BackupData> {
  const db = await getLocalDB();
  
  const clinic = await db.get('clinics', clinicId);
  const users = await db.getAllFromIndex('users', 'by-clinic', clinicId);
  const patients = await db.getAllFromIndex('patients', 'by-clinic', clinicId);
  const sessions = await db.getAllFromIndex('sessions', 'by-clinic', clinicId);
  const notifications = await db.getAllFromIndex('notifications', 'by-clinic', clinicId);
  const aiLogs = await db.getAllFromIndex('ai_logs', 'by-clinic', clinicId);
  const attachments = await db.getAllFromIndex('session_attachments', 'by-clinic', clinicId);
  const history = await db.getAllFromIndex('session_history', 'by-clinic', clinicId);

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    clinicId,
    clinicName: clinic?.name || 'Unknown',
    data: {
      clinic,
      users: users.map(u => ({ ...u, password_hash: '' })), // Remove password hashes for security
      patients,
      sessions,
      notifications,
      aiLogs,
      attachments: attachments.map(a => ({ ...a, file_data: null })), // Don't include file data in JSON backup
      history,
    },
  };
}

// Download backup as JSON file
export async function downloadBackup(clinicId: string): Promise<void> {
  const backup = await exportClinicBackup(clinicId);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${backup.clinicName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import backup from JSON file
export async function importBackup(file: File): Promise<{ success: boolean; message: string; imported?: { patients: number; sessions: number } }> {
  try {
    const text = await file.text();
    const backup: BackupData = JSON.parse(text);
    
    if (!backup.version || !backup.data) {
      return { success: false, message: 'Arquivo de backup inválido' };
    }
    
    const db = await getLocalDB();
    let patientsImported = 0;
    let sessionsImported = 0;
    
    // Import patients
    for (const patient of backup.data.patients) {
      const existing = await db.get('patients', patient.id);
      if (!existing) {
        await db.put('patients', patient);
        patientsImported++;
      }
    }
    
    // Import sessions
    for (const session of backup.data.sessions) {
      const existing = await db.get('sessions', session.id);
      if (!existing) {
        await db.put('sessions', session);
        sessionsImported++;
      }
    }
    
    return {
      success: true,
      message: `Backup importado com sucesso!`,
      imported: { patients: patientsImported, sessions: sessionsImported },
    };
  } catch (error) {
    console.error('Error importing backup:', error);
    return { success: false, message: 'Erro ao processar arquivo de backup' };
  }
}

// Export sync package for shared folder synchronization
export async function exportSyncPackage(clinicId: string, lastSyncTimestamp?: string): Promise<SyncPackage> {
  const db = await getLocalDB();
  
  let patients = await db.getAllFromIndex('patients', 'by-clinic', clinicId);
  let sessions = await db.getAllFromIndex('sessions', 'by-clinic', clinicId);
  
  // Filter by last sync timestamp if incremental
  if (lastSyncTimestamp) {
    patients = patients.filter(p => p.updated_at > lastSyncTimestamp);
    sessions = sessions.filter(s => s.updated_at > lastSyncTimestamp);
  }
  
  return {
    version: '1.0',
    syncedAt: new Date().toISOString(),
    clinicId,
    type: lastSyncTimestamp ? 'incremental' : 'full',
    lastSyncTimestamp,
    data: {
      patients,
      sessions,
    },
  };
}

// Download sync package for shared folder
export async function downloadSyncPackage(clinicId: string): Promise<void> {
  const syncPackage = await exportSyncPackage(clinicId);
  const blob = new Blob([JSON.stringify(syncPackage, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `sync-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import sync package from shared folder
export async function importSyncPackage(file: File, clinicId: string): Promise<{ success: boolean; message: string; synced?: { patients: number; sessions: number } }> {
  try {
    const text = await file.text();
    const syncPackage: SyncPackage = JSON.parse(text);
    
    if (!syncPackage.version || !syncPackage.data) {
      return { success: false, message: 'Pacote de sincronização inválido' };
    }
    
    if (syncPackage.clinicId !== clinicId) {
      return { success: false, message: 'Este pacote pertence a outra clínica' };
    }
    
    const db = await getLocalDB();
    let patientsSynced = 0;
    let sessionsSynced = 0;
    
    // Merge patients (newer wins)
    for (const patient of syncPackage.data.patients) {
      const existing = await db.get('patients', patient.id);
      if (!existing || existing.updated_at < patient.updated_at) {
        await db.put('patients', patient);
        patientsSynced++;
      }
    }
    
    // Merge sessions (newer wins)
    for (const session of syncPackage.data.sessions) {
      const existing = await db.get('sessions', session.id);
      if (!existing || existing.updated_at < session.updated_at) {
        await db.put('sessions', session);
        sessionsSynced++;
      }
    }
    
    return {
      success: true,
      message: 'Sincronização concluída!',
      synced: { patients: patientsSynced, sessions: sessionsSynced },
    };
  } catch (error) {
    console.error('Error importing sync package:', error);
    return { success: false, message: 'Erro ao processar pacote de sincronização' };
  }
}

// Auto backup settings
const AUTO_BACKUP_KEY = 'autoBackupSettings';

interface AutoBackupSettings {
  enabled: boolean;
  intervalHours: number;
  lastBackupAt?: string;
  folderPath?: string;
}

export function getAutoBackupSettings(): AutoBackupSettings {
  const stored = localStorage.getItem(AUTO_BACKUP_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return { enabled: false, intervalHours: 24 };
}

export function setAutoBackupSettings(settings: AutoBackupSettings): void {
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(settings));
}

// Check if auto backup is due
export function isAutoBackupDue(): boolean {
  const settings = getAutoBackupSettings();
  if (!settings.enabled) return false;
  
  if (!settings.lastBackupAt) return true;
  
  const lastBackup = new Date(settings.lastBackupAt).getTime();
  const now = Date.now();
  const intervalMs = settings.intervalHours * 60 * 60 * 1000;
  
  return (now - lastBackup) >= intervalMs;
}

// Mark backup as completed
export function markAutoBackupCompleted(): void {
  const settings = getAutoBackupSettings();
  settings.lastBackupAt = new Date().toISOString();
  setAutoBackupSettings(settings);
}
