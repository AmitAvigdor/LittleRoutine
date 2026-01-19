import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Baby, CreateBabyInput, UpdateBabyInput,
  FeedingSession, CreateFeedingSessionInput,
  PumpSession, CreatePumpSessionInput,
  BottleSession, CreateBottleSessionInput,
  MilkStash, CreateMilkStashInput,
  SleepSession, CreateSleepSessionInput,
  DiaperChange, CreateDiaperChangeInput,
  GrowthEntry, CreateGrowthEntryInput,
  Milestone, CreateMilestoneInput,
  Medicine, CreateMedicineInput,
  MedicineLog, CreateMedicineLogInput,
  Vaccination, CreateVaccinationInput,
  TeethingEvent, CreateTeethingEventInput,
  SolidFood, CreateSolidFoodInput,
  DiaryEntry, CreateDiaryEntryInput,
  PediatricianNote, CreatePediatricianNoteInput,
  AppSettings, UpdateAppSettingsInput,
  BabyMood,
} from '@/types';
import { DEFAULT_SETTINGS, calculateMilkExpiration } from '@/types';

// Helper to convert Firestore timestamps
function convertTimestamps<T extends object>(data: T): T {
  const result = { ...data } as Record<string, unknown>;
  for (const key in result) {
    const value = result[key];
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    }
  }
  return result as T;
}

// Generic subscribe function - uses only where clauses, sorts client-side
function subscribeToCollectionSimple<T>(
  collectionPath: string,
  whereField: string,
  whereValue: string,
  sortField: string,
  sortDirection: 'asc' | 'desc',
  callback: (items: T[]) => void
): () => void {
  const q = query(collection(db, collectionPath), where(whereField, '==', whereValue));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    })) as T[];
    // Sort client-side
    items.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField] as string;
      const bVal = (b as Record<string, unknown>)[sortField] as string;
      if (sortDirection === 'desc') {
        return new Date(bVal).getTime() - new Date(aVal).getTime();
      }
      return new Date(aVal).getTime() - new Date(bVal).getTime();
    });
    callback(items);
  }, (error) => {
    console.error(`Error subscribing to ${collectionPath}:`, error);
    callback([]);
  });
}

// ============ BABIES ============
export async function createBaby(userId: string, input: CreateBabyInput): Promise<string> {
  console.log('createBaby: Creating baby for userId:', userId);
  console.log('createBaby: Input:', input);
  const now = new Date().toISOString();
  const babyData = {
    ...input,
    userId,
    birthDate: input.birthDate || null,
    photoUrl: input.photoUrl || null,
    color: input.color || 'purple',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  console.log('createBaby: Full baby data to save:', babyData);
  const docRef = await addDoc(collection(db, 'babies'), babyData);
  console.log('createBaby: Created with ID:', docRef.id);
  return docRef.id;
}

export async function updateBaby(babyId: string, input: UpdateBabyInput): Promise<void> {
  await updateDoc(doc(db, 'babies', babyId), {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBaby(babyId: string): Promise<void> {
  await deleteDoc(doc(db, 'babies', babyId));
}

export async function getBaby(babyId: string): Promise<Baby | null> {
  const docSnap = await getDoc(doc(db, 'babies', babyId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Baby;
}

export function subscribeToBabies(userId: string, callback: (babies: Baby[]) => void): () => void {
  console.log('subscribeToBabies: Setting up subscription for userId:', userId);
  // Simple query without orderBy to avoid needing composite index
  const q = query(collection(db, 'babies'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    console.log('subscribeToBabies: Received snapshot with', snapshot.docs.length, 'docs');
    console.log('subscribeToBabies: fromCache:', snapshot.metadata.fromCache);
    console.log('subscribeToBabies: hasPendingWrites:', snapshot.metadata.hasPendingWrites);

    const babies = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('subscribeToBabies: Doc data:', doc.id, data);
      return {
        id: doc.id,
        ...convertTimestamps(data),
      };
    }) as Baby[];
    // Sort client-side
    babies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    console.log('subscribeToBabies: Calling callback with babies:', babies);
    callback(babies);
  }, (error) => {
    console.error('subscribeToBabies: ERROR:', error);
    console.error('subscribeToBabies: Error code:', error.code);
    console.error('subscribeToBabies: Error message:', error.message);
    // Call with empty array on error so app doesn't break
    callback([]);
  });
}

export async function setActiveBaby(userId: string, babyId: string): Promise<void> {
  // First, deactivate all babies
  const babiesQuery = query(collection(db, 'babies'), where('userId', '==', userId));
  const snapshot = await getDocs(babiesQuery);

  const updates = snapshot.docs.map(async (docSnap) => {
    await updateDoc(doc(db, 'babies', docSnap.id), { isActive: docSnap.id === babyId });
  });

  await Promise.all(updates);
}

// ============ FEEDING SESSIONS ============
export async function createFeedingSession(
  babyId: string,
  userId: string,
  input: CreateFeedingSessionInput
): Promise<string> {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'feedingSessions'), {
    ...input,
    babyId,
    userId,
    date: startTime.toISOString().split('T')[0],
    duration,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToFeedingSessions(
  babyId: string,
  callback: (sessions: FeedingSession[]) => void
): () => void {
  return subscribeToCollectionSimple<FeedingSession>(
    'feedingSessions',
    'babyId',
    babyId,
    'startTime',
    'desc',
    callback
  );
}

// ============ PUMP SESSIONS ============
export async function createPumpSession(
  babyId: string,
  userId: string,
  input: CreatePumpSessionInput
): Promise<string> {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'pumpSessions'), {
    ...input,
    babyId,
    userId,
    date: startTime.toISOString().split('T')[0],
    duration,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToPumpSessions(
  babyId: string,
  callback: (sessions: PumpSession[]) => void
): () => void {
  return subscribeToCollectionSimple<PumpSession>(
    'pumpSessions',
    'babyId',
    babyId,
    'startTime',
    'desc',
    callback
  );
}

// ============ BOTTLE SESSIONS ============
export async function createBottleSession(
  babyId: string,
  userId: string,
  input: CreateBottleSessionInput
): Promise<string> {
  const now = new Date().toISOString();
  const timestamp = new Date(input.timestamp);

  const docRef = await addDoc(collection(db, 'bottleSessions'), {
    ...input,
    babyId,
    userId,
    date: timestamp.toISOString().split('T')[0],
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToBottleSessions(
  babyId: string,
  callback: (sessions: BottleSession[]) => void
): () => void {
  return subscribeToCollectionSimple<BottleSession>(
    'bottleSessions',
    'babyId',
    babyId,
    'timestamp',
    'desc',
    callback
  );
}

// ============ MILK STASH ============
export async function createMilkStash(userId: string, input: CreateMilkStashInput): Promise<string> {
  const now = new Date().toISOString();
  const expirationDate = calculateMilkExpiration(input.pumpedDate, input.location);

  const docRef = await addDoc(collection(db, 'milkStash'), {
    ...input,
    userId,
    date: new Date().toISOString().split('T')[0],
    expirationDate,
    isUsed: false,
    usedDate: null,
    isInUse: false,
    inUseStartDate: null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function markMilkStashInUse(stashId: string, inUse: boolean): Promise<void> {
  await updateDoc(doc(db, 'milkStash', stashId), {
    isInUse: inUse,
    inUseStartDate: inUse ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
}

export async function markMilkStashUsed(stashId: string): Promise<void> {
  await updateDoc(doc(db, 'milkStash', stashId), {
    isUsed: true,
    usedDate: new Date().toISOString(),
    isInUse: false,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToMilkStash(
  userId: string,
  callback: (stash: MilkStash[]) => void
): () => void {
  // Custom query with two where clauses, sort client-side
  const q = query(
    collection(db, 'milkStash'),
    where('userId', '==', userId),
    where('isUsed', '==', false)
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    })) as MilkStash[];
    // Sort by expiration date ascending
    items.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
    callback(items);
  }, (error) => {
    console.error('Error subscribing to milkStash:', error);
    callback([]);
  });
}

// ============ SLEEP SESSIONS ============
export async function createSleepSession(
  babyId: string,
  userId: string,
  input: CreateSleepSessionInput
): Promise<string> {
  const now = new Date().toISOString();
  const startTime = new Date(input.startTime);

  const docRef = await addDoc(collection(db, 'sleepSessions'), {
    ...input,
    babyId,
    userId,
    date: startTime.toISOString().split('T')[0],
    duration: 0,
    endTime: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function endSleepSession(
  sessionId: string,
  endTime: string,
  notes?: string | null,
  babyMood?: BabyMood | null
): Promise<void> {
  const docSnap = await getDoc(doc(db, 'sleepSessions', sessionId));
  if (!docSnap.exists()) {
    throw new Error(`Sleep session ${sessionId} not found`);
  }

  const session = docSnap.data();
  const startTime = new Date(session.startTime);
  const end = new Date(endTime);
  const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);

  await updateDoc(doc(db, 'sleepSessions', sessionId), {
    endTime,
    duration,
    isActive: false,
    notes: notes ?? session.notes,
    babyMood: babyMood ?? session.babyMood,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToSleepSessions(
  babyId: string,
  callback: (sessions: SleepSession[]) => void
): () => void {
  return subscribeToCollectionSimple<SleepSession>(
    'sleepSessions',
    'babyId',
    babyId,
    'startTime',
    'desc',
    callback
  );
}

// ============ DIAPER CHANGES ============
export async function createDiaperChange(
  babyId: string,
  userId: string,
  input: CreateDiaperChangeInput
): Promise<string> {
  const now = new Date().toISOString();
  const timestamp = new Date(input.timestamp);

  const docRef = await addDoc(collection(db, 'diaperChanges'), {
    ...input,
    babyId,
    userId,
    date: timestamp.toISOString().split('T')[0],
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToDiaperChanges(
  babyId: string,
  callback: (changes: DiaperChange[]) => void
): () => void {
  return subscribeToCollectionSimple<DiaperChange>(
    'diaperChanges',
    'babyId',
    babyId,
    'timestamp',
    'desc',
    callback
  );
}

// ============ GROWTH ENTRIES ============
export async function createGrowthEntry(
  babyId: string,
  userId: string,
  input: CreateGrowthEntryInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'growthEntries'), {
    ...input,
    babyId,
    userId,
    weight: input.weight ?? null,
    weightUnit: input.weightUnit ?? 'lbs',
    height: input.height ?? null,
    heightUnit: input.heightUnit ?? 'in',
    headCircumference: input.headCircumference ?? null,
    headCircumferenceUnit: input.headCircumferenceUnit ?? 'in',
    photoUrl: input.photoUrl ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToGrowthEntries(
  babyId: string,
  callback: (entries: GrowthEntry[]) => void
): () => void {
  return subscribeToCollectionSimple<GrowthEntry>(
    'growthEntries',
    'babyId',
    babyId,
    'date',
    'desc',
    callback
  );
}

// ============ MILESTONES ============
export async function createMilestone(
  babyId: string,
  userId: string,
  input: CreateMilestoneInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'milestones'), {
    ...input,
    babyId,
    userId,
    isAchieved: !!input.achievedDate,
    achievedDate: input.achievedDate ?? null,
    photoUrl: input.photoUrl ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function markMilestoneAchieved(
  milestoneId: string,
  achievedDate: string
): Promise<void> {
  await updateDoc(doc(db, 'milestones', milestoneId), {
    isAchieved: true,
    achievedDate,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToMilestones(
  babyId: string,
  callback: (milestones: Milestone[]) => void
): () => void {
  return subscribeToCollectionSimple<Milestone>(
    'milestones',
    'babyId',
    babyId,
    'createdAt',
    'desc',
    callback
  );
}

// ============ MEDICINES ============
export async function createMedicine(
  babyId: string,
  userId: string,
  input: CreateMedicineInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'medicines'), {
    ...input,
    babyId,
    userId,
    hoursInterval: input.hoursInterval ?? null,
    instructions: input.instructions ?? null,
    photoUrl: input.photoUrl ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateMedicine(medicineId: string, updates: Partial<Medicine>): Promise<void> {
  await updateDoc(doc(db, 'medicines', medicineId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToMedicines(
  babyId: string,
  callback: (medicines: Medicine[]) => void
): () => void {
  return subscribeToCollectionSimple<Medicine>(
    'medicines',
    'babyId',
    babyId,
    'createdAt',
    'desc',
    callback
  );
}

// ============ MEDICINE LOGS ============
export async function createMedicineLog(
  medicineId: string,
  babyId: string,
  userId: string,
  input: CreateMedicineLogInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'medicineLogs'), {
    ...input,
    medicineId,
    babyId,
    userId,
    givenBy: input.givenBy ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToMedicineLogs(
  medicineId: string,
  callback: (logs: MedicineLog[]) => void
): () => void {
  return subscribeToCollectionSimple<MedicineLog>(
    'medicineLogs',
    'medicineId',
    medicineId,
    'timestamp',
    'desc',
    callback
  );
}

// ============ VACCINATIONS ============
export async function createVaccination(
  babyId: string,
  userId: string,
  input: CreateVaccinationInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'vaccinations'), {
    ...input,
    babyId,
    userId,
    administeredDate: input.administeredDate ?? null,
    location: input.location ?? null,
    notes: input.notes ?? null,
    reminderEnabled: input.reminderEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function markVaccinationAdministered(
  vaccinationId: string,
  administeredDate: string,
  location?: string
): Promise<void> {
  await updateDoc(doc(db, 'vaccinations', vaccinationId), {
    administeredDate,
    location: location ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToVaccinations(
  babyId: string,
  callback: (vaccinations: Vaccination[]) => void
): () => void {
  return subscribeToCollectionSimple<Vaccination>(
    'vaccinations',
    'babyId',
    babyId,
    'scheduledDate',
    'asc',
    callback
  );
}

// ============ TEETHING EVENTS ============
export async function createTeethingEvent(
  babyId: string,
  userId: string,
  input: CreateTeethingEventInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'teethingEvents'), {
    ...input,
    babyId,
    userId,
    firstSignsDate: input.firstSignsDate ?? null,
    eruptionDate: input.eruptionDate ?? null,
    symptoms: input.symptoms ?? [],
    remediesUsed: input.remediesUsed ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateTeethingEvent(
  eventId: string,
  updates: Partial<TeethingEvent>
): Promise<void> {
  await updateDoc(doc(db, 'teethingEvents', eventId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToTeethingEvents(
  babyId: string,
  callback: (events: TeethingEvent[]) => void
): () => void {
  return subscribeToCollectionSimple<TeethingEvent>(
    'teethingEvents',
    'babyId',
    babyId,
    'createdAt',
    'desc',
    callback
  );
}

// ============ SOLID FOODS ============
export async function createSolidFood(
  babyId: string,
  userId: string,
  input: CreateSolidFoodInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'solidFoods'), {
    ...input,
    babyId,
    userId,
    isFirstIntroduction: input.isFirstIntroduction ?? false,
    reaction: input.reaction ?? null,
    reactionNotes: input.reactionNotes ?? null,
    liked: input.liked ?? null,
    photoUrl: input.photoUrl ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToSolidFoods(
  babyId: string,
  callback: (foods: SolidFood[]) => void
): () => void {
  return subscribeToCollectionSimple<SolidFood>(
    'solidFoods',
    'babyId',
    babyId,
    'date',
    'desc',
    callback
  );
}

// ============ DIARY ENTRIES ============
export async function createDiaryEntry(
  babyId: string,
  userId: string,
  input: CreateDiaryEntryInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'diaryEntries'), {
    ...input,
    babyId,
    userId,
    title: input.title ?? null,
    notes: input.notes ?? null,
    photoUrl: input.photoUrl ?? null,
    mood: input.mood ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export function subscribeToDiaryEntries(
  babyId: string,
  callback: (entries: DiaryEntry[]) => void
): () => void {
  return subscribeToCollectionSimple<DiaryEntry>(
    'diaryEntries',
    'babyId',
    babyId,
    'date',
    'desc',
    callback
  );
}

// ============ PEDIATRICIAN NOTES ============
export async function createPediatricianNote(
  babyId: string,
  userId: string,
  input: CreatePediatricianNoteInput
): Promise<string> {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, 'pediatricianNotes'), {
    ...input,
    babyId,
    userId,
    isResolved: input.isResolved ?? false,
    resolution: input.resolution ?? null,
    resolvedDate: null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function resolvePediatricianNote(
  noteId: string,
  resolution: string
): Promise<void> {
  await updateDoc(doc(db, 'pediatricianNotes', noteId), {
    isResolved: true,
    resolution,
    resolvedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToPediatricianNotes(
  babyId: string,
  callback: (notes: PediatricianNote[]) => void
): () => void {
  return subscribeToCollectionSimple<PediatricianNote>(
    'pediatricianNotes',
    'babyId',
    babyId,
    'date',
    'desc',
    callback
  );
}

// ============ APP SETTINGS ============
export async function getOrCreateSettings(userId: string): Promise<AppSettings> {
  const settingsQuery = query(
    collection(db, 'appSettings'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(settingsQuery);

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...convertTimestamps(doc.data()) } as AppSettings;
  }

  // Create default settings
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'appSettings'), {
    ...DEFAULT_SETTINGS,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    ...DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateSettings(
  settingsId: string,
  input: UpdateAppSettingsInput
): Promise<void> {
  await updateDoc(doc(db, 'appSettings', settingsId), {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToSettings(
  userId: string,
  callback: (settings: AppSettings | null) => void
): () => void {
  const q = query(collection(db, 'appSettings'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      console.log('Settings: No settings found for user');
      callback(null);
      return;
    }
    const doc = snapshot.docs[0];
    callback({ id: doc.id, ...convertTimestamps(doc.data()) } as AppSettings);
  }, (error) => {
    console.error('Error subscribing to settings:', error);
  });
}

// ============ DELETE OPERATIONS ============
export async function deleteDocument(collectionPath: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, collectionPath, docId));
}
