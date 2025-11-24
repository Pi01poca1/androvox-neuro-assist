import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AndrovoxDB extends DBSchema {
  patients: {
    key: string;
    value: {
      id: string;
      clinic_id: string;
      public_id: string;
      full_name: string | null;
      birth_date: string | null;
      gender: string;
      notes_summary: string | null;
      created_at: string;
      updated_at: string;
      _synced: boolean;
      _deleted?: boolean;
    };
    indexes: { 'by-clinic': string; 'by-synced': number };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      clinic_id: string;
      patient_id: string;
      session_date: string;
      mode: string;
      status: string;
      main_complaint: string | null;
      hypotheses: string | null;
      interventions: string | null;
      observations: string | null;
      created_at: string;
      updated_at: string;
      _synced: boolean;
      _deleted?: boolean;
    };
    indexes: { 'by-clinic': string; 'by-patient': string; 'by-synced': number };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      entity_type: 'patient' | 'session';
      entity_id: string;
      operation: 'create' | 'update' | 'delete';
      data: any;
      created_at: string;
      synced: boolean;
      error?: string;
    };
    indexes: { 'by-synced': number };
  };
}

let dbInstance: IDBPDatabase<AndrovoxDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<AndrovoxDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AndrovoxDB>('androvox-db', 1, {
    upgrade(db) {
      // Patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientStore.createIndex('by-clinic', 'clinic_id');
        patientStore.createIndex('by-synced', '_synced');
      }

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-clinic', 'clinic_id');
        sessionStore.createIndex('by-patient', 'patient_id');
        sessionStore.createIndex('by-synced', '_synced');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-synced', 'synced');
      }
    },
  });

  return dbInstance;
}

// Patient operations
export async function savePatientToIDB(patient: any) {
  const db = await getDB();
  await db.put('patients', { ...patient, _synced: false });
}

export async function getPatientsFromIDB(clinicId: string) {
  const db = await getDB();
  const index = db.transaction('patients').store.index('by-clinic');
  const patients = await index.getAll(clinicId);
  return patients.filter(p => !p._deleted);
}

export async function deletePatientFromIDB(patientId: string) {
  const db = await getDB();
  const patient = await db.get('patients', patientId);
  if (patient) {
    await db.put('patients', { ...patient, _deleted: true, _synced: false });
  }
}

// Session operations
export async function saveSessionToIDB(session: any) {
  const db = await getDB();
  await db.put('sessions', { ...session, _synced: false });
}

export async function getSessionsFromIDB(clinicId: string) {
  const db = await getDB();
  const index = db.transaction('sessions').store.index('by-clinic');
  const sessions = await index.getAll(clinicId);
  return sessions.filter(s => !s._deleted);
}

export async function getPatientSessionsFromIDB(patientId: string) {
  const db = await getDB();
  const index = db.transaction('sessions').store.index('by-patient');
  const sessions = await index.getAll(patientId);
  return sessions.filter(s => !s._deleted);
}

export async function deleteSessionFromIDB(sessionId: string) {
  const db = await getDB();
  const session = await db.get('sessions', sessionId);
  if (session) {
    await db.put('sessions', { ...session, _deleted: true, _synced: false });
  }
}

// Sync queue operations
export async function addToSyncQueue(
  entityType: 'patient' | 'session',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  data: any
) {
  const db = await getDB();
  const queueItem = {
    id: `${entityType}-${entityId}-${operation}-${Date.now()}`,
    entity_type: entityType,
    entity_id: entityId,
    operation,
    data,
    created_at: new Date().toISOString(),
    synced: false,
  };
  await db.put('syncQueue', queueItem);
  return queueItem;
}

export async function getPendingSyncItems() {
  const db = await getDB();
  const index = db.transaction('syncQueue').store.index('by-synced');
  return await index.getAll(0); // 0 = false (not synced)
}

export async function markSyncItemComplete(itemId: string) {
  const db = await getDB();
  const item = await db.get('syncQueue', itemId);
  if (item) {
    await db.put('syncQueue', { ...item, synced: true });
  }
}

export async function markSyncItemError(itemId: string, error: string) {
  const db = await getDB();
  const item = await db.get('syncQueue', itemId);
  if (item) {
    await db.put('syncQueue', { ...item, error });
  }
}

export async function clearSyncedItems() {
  const db = await getDB();
  const index = db.transaction('syncQueue', 'readwrite').store.index('by-synced');
  const syncedItems = await index.getAll(1); // 1 = true (synced)
  
  const tx = db.transaction('syncQueue', 'readwrite');
  for (const item of syncedItems) {
    await tx.store.delete(item.id);
  }
  await tx.done;
}
