import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { AppRole } from '@/types/roles';

// Types for local database
export interface LocalUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  clinic_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface LocalClinic {
  id: string;
  name: string;
  logo_data: string | null; // Base64 encoded logo image
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LocalPatient {
  id: string;
  clinic_id: string;
  public_id: string;
  full_name: string | null;
  birth_date: string | null;
  gender: 'M' | 'F' | 'Outro' | 'Não informado';
  notes_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalSession {
  id: string;
  clinic_id: string;
  patient_id: string;
  session_date: string;
  mode: 'online' | 'presencial' | 'híbrida';
  status: 'agendada' | 'concluída' | 'cancelada' | null;
  session_type: 'anamnese' | 'avaliacao_neuropsicologica' | 'tcc' | 'intervencao_neuropsicologica' | 'retorno' | 'outra' | null;
  main_complaint: string | null;
  hypotheses: string | null;
  interventions: string | null;
  observations: string | null;
  scheduled_duration: number | null;
  ai_suggestions: unknown | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalNotification {
  id: string;
  clinic_id: string;
  user_id: string;
  session_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface LocalAILog {
  id: string;
  clinic_id: string;
  user_id: string;
  patient_id: string | null;
  action_type: string;
  input_summary: string | null;
  output_summary: string | null;
  full_prompt: string | null;
  created_at: string;
}

export interface LocalSessionAttachment {
  id: string;
  session_id: string;
  clinic_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  file_data: ArrayBuffer | null; // Store actual file data locally
  uploaded_by: string;
  uploaded_at: string;
}

export interface LocalSessionHistory {
  id: string;
  session_id: string;
  clinic_id: string;
  changed_by: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

interface AndrovoxLocalDB extends DBSchema {
  users: {
    key: string;
    value: LocalUser;
    indexes: { 'by-email': string; 'by-clinic': string };
  };
  clinics: {
    key: string;
    value: LocalClinic;
    indexes: { 'by-name': string };
  };
  patients: {
    key: string;
    value: LocalPatient;
    indexes: { 'by-clinic': string; 'by-public-id': string };
  };
  sessions: {
    key: string;
    value: LocalSession;
    indexes: { 'by-clinic': string; 'by-patient': string; 'by-date': string };
  };
  notifications: {
    key: string;
    value: LocalNotification;
    indexes: { 'by-user': string; 'by-clinic': string };
  };
  ai_logs: {
    key: string;
    value: LocalAILog;
    indexes: { 'by-clinic': string; 'by-user': string };
  };
  session_attachments: {
    key: string;
    value: LocalSessionAttachment;
    indexes: { 'by-session': string; 'by-clinic': string };
  };
  session_history: {
    key: string;
    value: LocalSessionHistory;
    indexes: { 'by-session': string; 'by-clinic': string };
  };
  local_session: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbInstance: IDBPDatabase<AndrovoxLocalDB> | null = null;

export async function getLocalDB(): Promise<IDBPDatabase<AndrovoxLocalDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AndrovoxLocalDB>('androvox-local-db', 1, {
    upgrade(db) {
      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const usersStore = db.createObjectStore('users', { keyPath: 'id' });
        usersStore.createIndex('by-email', 'email', { unique: true });
        usersStore.createIndex('by-clinic', 'clinic_id');
      }

      // Clinics store
      if (!db.objectStoreNames.contains('clinics')) {
        const clinicsStore = db.createObjectStore('clinics', { keyPath: 'id' });
        clinicsStore.createIndex('by-name', 'name');
      }

      // Patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientsStore.createIndex('by-clinic', 'clinic_id');
        patientsStore.createIndex('by-public-id', 'public_id');
      }

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('by-clinic', 'clinic_id');
        sessionsStore.createIndex('by-patient', 'patient_id');
        sessionsStore.createIndex('by-date', 'session_date');
      }

      // Notifications store
      if (!db.objectStoreNames.contains('notifications')) {
        const notificationsStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notificationsStore.createIndex('by-user', 'user_id');
        notificationsStore.createIndex('by-clinic', 'clinic_id');
      }

      // AI Logs store
      if (!db.objectStoreNames.contains('ai_logs')) {
        const aiLogsStore = db.createObjectStore('ai_logs', { keyPath: 'id' });
        aiLogsStore.createIndex('by-clinic', 'clinic_id');
        aiLogsStore.createIndex('by-user', 'user_id');
      }

      // Session Attachments store
      if (!db.objectStoreNames.contains('session_attachments')) {
        const attachmentsStore = db.createObjectStore('session_attachments', { keyPath: 'id' });
        attachmentsStore.createIndex('by-session', 'session_id');
        attachmentsStore.createIndex('by-clinic', 'clinic_id');
      }

      // Session History store
      if (!db.objectStoreNames.contains('session_history')) {
        const historyStore = db.createObjectStore('session_history', { keyPath: 'id' });
        historyStore.createIndex('by-session', 'session_id');
        historyStore.createIndex('by-clinic', 'clinic_id');
      }

      // Local session store (for auth session persistence)
      if (!db.objectStoreNames.contains('local_session')) {
        db.createObjectStore('local_session', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// UUID generator
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Simple password hashing using Web Crypto API (SHA-256)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'androvox-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

// Generate public_id for patients
export function generatePatientPublicId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'P';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============ USER OPERATIONS ============

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: AppRole,
  clinicId: string
): Promise<LocalUser> {
  const db = await getLocalDB();
  
  // Check if email already exists
  const existing = await db.getFromIndex('users', 'by-email', email);
  if (existing) {
    throw new Error('Email já está em uso');
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  
  const user: LocalUser = {
    id: generateUUID(),
    email,
    password_hash: passwordHash,
    full_name: fullName,
    clinic_id: clinicId,
    role,
    created_at: now,
    updated_at: now,
  };

  await db.put('users', user);
  return user;
}

export async function getUserByEmail(email: string): Promise<LocalUser | undefined> {
  const db = await getLocalDB();
  return db.getFromIndex('users', 'by-email', email);
}

export async function getUserById(id: string): Promise<LocalUser | undefined> {
  const db = await getLocalDB();
  return db.get('users', id);
}

export async function updateUser(id: string, updates: Partial<LocalUser>): Promise<LocalUser | undefined> {
  const db = await getLocalDB();
  const user = await db.get('users', id);
  if (!user) return undefined;

  const updated = {
    ...user,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await db.put('users', updated);
  return updated;
}

export async function getClinicUsers(clinicId: string): Promise<LocalUser[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('users', 'by-clinic', clinicId);
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getLocalDB();
  await db.delete('users', id);
}

// ============ CLINIC OPERATIONS ============

export async function createClinic(name: string, logoData?: string | null): Promise<LocalClinic> {
  const db = await getLocalDB();
  const now = new Date().toISOString();
  
  const clinic: LocalClinic = {
    id: generateUUID(),
    name,
    logo_data: logoData || null,
    settings: null,
    created_at: now,
    updated_at: now,
  };

  await db.put('clinics', clinic);
  return clinic;
}

export async function getClinicById(id: string): Promise<LocalClinic | undefined> {
  const db = await getLocalDB();
  return db.get('clinics', id);
}

export async function updateClinic(id: string, updates: Partial<LocalClinic>): Promise<LocalClinic | undefined> {
  const db = await getLocalDB();
  const clinic = await db.get('clinics', id);
  if (!clinic) return undefined;

  const updated = {
    ...clinic,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await db.put('clinics', updated);
  return updated;
}

// ============ PATIENT OPERATIONS ============

export async function createPatient(data: Omit<LocalPatient, 'id' | 'created_at' | 'updated_at' | 'public_id'>): Promise<LocalPatient> {
  const db = await getLocalDB();
  const now = new Date().toISOString();
  
  const patient: LocalPatient = {
    ...data,
    id: generateUUID(),
    public_id: generatePatientPublicId(),
    created_at: now,
    updated_at: now,
  };

  await db.put('patients', patient);
  return patient;
}

export async function getPatientsByClinic(clinicId: string): Promise<LocalPatient[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('patients', 'by-clinic', clinicId);
}

export async function getPatientById(id: string): Promise<LocalPatient | undefined> {
  const db = await getLocalDB();
  return db.get('patients', id);
}

export async function updatePatient(id: string, updates: Partial<LocalPatient>): Promise<LocalPatient | undefined> {
  const db = await getLocalDB();
  const patient = await db.get('patients', id);
  if (!patient) return undefined;

  const updated = {
    ...patient,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await db.put('patients', updated);
  return updated;
}

export async function deletePatient(id: string): Promise<void> {
  const db = await getLocalDB();
  await db.delete('patients', id);
}

// ============ SESSION OPERATIONS ============

export async function createSession(data: Omit<LocalSession, 'id' | 'created_at' | 'updated_at'>): Promise<LocalSession> {
  const db = await getLocalDB();
  const now = new Date().toISOString();
  
  const session: LocalSession = {
    ...data,
    id: generateUUID(),
    created_at: now,
    updated_at: now,
  };

  await db.put('sessions', session);
  return session;
}

export async function getSessionsByClinic(clinicId: string): Promise<LocalSession[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('sessions', 'by-clinic', clinicId);
}

export async function getSessionsByPatient(patientId: string): Promise<LocalSession[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('sessions', 'by-patient', patientId);
}

export async function getSessionById(id: string): Promise<LocalSession | undefined> {
  const db = await getLocalDB();
  return db.get('sessions', id);
}

export async function updateSession(id: string, updates: Partial<LocalSession>): Promise<LocalSession | undefined> {
  const db = await getLocalDB();
  const session = await db.get('sessions', id);
  if (!session) return undefined;

  const updated = {
    ...session,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await db.put('sessions', updated);
  return updated;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getLocalDB();
  await db.delete('sessions', id);
}

// ============ NOTIFICATION OPERATIONS ============

export async function createNotification(data: Omit<LocalNotification, 'id' | 'created_at'>): Promise<LocalNotification> {
  const db = await getLocalDB();
  
  const notification: LocalNotification = {
    ...data,
    id: generateUUID(),
    created_at: new Date().toISOString(),
  };

  await db.put('notifications', notification);
  return notification;
}

export async function getNotificationsByUser(userId: string): Promise<LocalNotification[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('notifications', 'by-user', userId);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const db = await getLocalDB();
  const notification = await db.get('notifications', id);
  if (notification) {
    await db.put('notifications', { ...notification, read: true });
  }
}

// ============ AI LOG OPERATIONS ============

export async function createAILog(data: Omit<LocalAILog, 'id' | 'created_at'>): Promise<LocalAILog> {
  const db = await getLocalDB();
  
  const log: LocalAILog = {
    ...data,
    id: generateUUID(),
    created_at: new Date().toISOString(),
  };

  await db.put('ai_logs', log);
  return log;
}

export async function getAILogsByClinic(clinicId: string): Promise<LocalAILog[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('ai_logs', 'by-clinic', clinicId);
}

// ============ SESSION ATTACHMENT OPERATIONS ============

export async function createSessionAttachment(data: Omit<LocalSessionAttachment, 'id' | 'uploaded_at'>): Promise<LocalSessionAttachment> {
  const db = await getLocalDB();
  
  const attachment: LocalSessionAttachment = {
    ...data,
    id: generateUUID(),
    uploaded_at: new Date().toISOString(),
  };

  await db.put('session_attachments', attachment);
  return attachment;
}

export async function getAttachmentsBySession(sessionId: string): Promise<LocalSessionAttachment[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('session_attachments', 'by-session', sessionId);
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await getLocalDB();
  await db.delete('session_attachments', id);
}

// ============ SESSION HISTORY OPERATIONS ============

export async function createSessionHistory(data: Omit<LocalSessionHistory, 'id' | 'changed_at'>): Promise<LocalSessionHistory> {
  const db = await getLocalDB();
  
  const history: LocalSessionHistory = {
    ...data,
    id: generateUUID(),
    changed_at: new Date().toISOString(),
  };

  await db.put('session_history', history);
  return history;
}

export async function getHistoryBySession(sessionId: string): Promise<LocalSessionHistory[]> {
  const db = await getLocalDB();
  return db.getAllFromIndex('session_history', 'by-session', sessionId);
}

// ============ LOCAL SESSION (AUTH PERSISTENCE) ============

export async function setLocalSession(userId: string): Promise<void> {
  const db = await getLocalDB();
  await db.put('local_session', { key: 'current_user', value: userId });
}

export async function getLocalSession(): Promise<string | null> {
  const db = await getLocalDB();
  const session = await db.get('local_session', 'current_user');
  return session?.value ?? null;
}

export async function clearLocalSession(): Promise<void> {
  const db = await getLocalDB();
  await db.delete('local_session', 'current_user');
}
