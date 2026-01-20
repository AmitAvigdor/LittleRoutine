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
  MomMood,
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
  const docRef = await addDoc(collection(db, 'babies'), babyData);
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
  const q = query(collection(db, 'babies'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const babies = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    })) as Baby[];
    // Sort client-side
    babies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(babies);
  }, (error) => {
    console.error('Error subscribing to babies:', error);
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

// Start a new feeding session (timer mode)
export async function startFeedingSession(
  babyId: string,
  userId: string,
  input: {
    startTime: string;
    breastSide: 'left' | 'right';
  }
): Promise<string> {
  const now = new Date().toISOString();
  const startTime = new Date(input.startTime);

  const docRef = await addDoc(collection(db, 'feedingSessions'), {
    babyId,
    userId,
    breastSide: input.breastSide,
    startTime: input.startTime,
    endTime: null,
    date: startTime.toISOString().split('T')[0],
    duration: 0,
    isActive: true,
    notes: null,
    babyMood: null,
    momMood: null,
    loggedBy: null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// End an active feeding session
export async function endFeedingSession(
  sessionId: string,
  endTime: string,
  notes?: string | null,
  babyMood?: BabyMood | null,
  momMood?: MomMood | null
): Promise<void> {
  const docSnap = await getDoc(doc(db, 'feedingSessions', sessionId));
  if (!docSnap.exists()) {
    throw new Error(`Feeding session ${sessionId} not found`);
  }

  const session = convertTimestamps(docSnap.data());
  const startTime = new Date(session.startTime);
  const end = new Date(endTime);
  const duration = Math.max(0, Math.floor((end.getTime() - startTime.getTime()) / 1000));

  await updateDoc(doc(db, 'feedingSessions', sessionId), {
    endTime,
    duration,
    isActive: false,
    notes: notes ?? session.notes ?? null,
    babyMood: babyMood ?? session.babyMood ?? null,
    momMood: momMood ?? session.momMood ?? null,
    updatedAt: new Date().toISOString(),
  });
}

// Create a complete feeding session (manual entry)
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
    isActive: false,
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

// Start a new pump session (timer mode)
export async function startPumpSession(
  babyId: string,
  userId: string,
  input: {
    startTime: string;
    side: 'left' | 'right' | 'both';
    volumeUnit: 'oz' | 'ml';
  }
): Promise<string> {
  const now = new Date().toISOString();
  const startTime = new Date(input.startTime);

  const docRef = await addDoc(collection(db, 'pumpSessions'), {
    babyId,
    userId,
    side: input.side,
    startTime: input.startTime,
    endTime: null,
    date: startTime.toISOString().split('T')[0],
    duration: 0,
    volume: 0,
    volumeUnit: input.volumeUnit,
    isActive: true,
    notes: null,
    momMood: null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// End an active pump session
export async function endPumpSession(
  sessionId: string,
  endTime: string,
  volume: number,
  volumeUnit: 'oz' | 'ml',
  notes?: string | null,
  momMood?: MomMood | null
): Promise<void> {
  const docSnap = await getDoc(doc(db, 'pumpSessions', sessionId));
  if (!docSnap.exists()) {
    throw new Error(`Pump session ${sessionId} not found`);
  }

  const session = convertTimestamps(docSnap.data());
  const startTime = new Date(session.startTime);
  const end = new Date(endTime);
  const duration = Math.max(0, Math.floor((end.getTime() - startTime.getTime()) / 1000));

  await updateDoc(doc(db, 'pumpSessions', sessionId), {
    endTime,
    duration,
    volume,
    volumeUnit,
    isActive: false,
    notes: notes ?? session.notes ?? null,
    momMood: momMood ?? session.momMood ?? null,
    updatedAt: new Date().toISOString(),
  });
}

// Create a complete pump session (manual entry)
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
    isActive: false,
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

export async function updateMilkStashVolume(stashId: string, newVolume: number): Promise<void> {
  await updateDoc(doc(db, 'milkStash', stashId), {
    volume: newVolume,
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

// Create a complete sleep session (for manual entry)
export async function createCompleteSleepSession(
  babyId: string,
  userId: string,
  input: {
    startTime: string;
    endTime: string;
    type: 'nap' | 'night';
    notes?: string | null;
    babyMood?: BabyMood | null;
  }
): Promise<string> {
  const now = new Date().toISOString();
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  const docRef = await addDoc(collection(db, 'sleepSessions'), {
    babyId,
    userId,
    startTime: input.startTime,
    endTime: input.endTime,
    type: input.type,
    date: startTime.toISOString().split('T')[0],
    duration,
    isActive: false,
    notes: input.notes || null,
    babyMood: input.babyMood || null,
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

  const session = convertTimestamps(docSnap.data());
  const startTime = new Date(session.startTime);
  const end = new Date(endTime);
  const duration = Math.max(0, Math.floor((end.getTime() - startTime.getTime()) / 1000));

  await updateDoc(doc(db, 'sleepSessions', sessionId), {
    endTime,
    duration,
    isActive: false,
    notes: notes ?? session.notes ?? null,
    babyMood: babyMood ?? session.babyMood ?? null,
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
      callback(null);
      return;
    }
    const docSnap = snapshot.docs[0];
    callback({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as AppSettings);
  }, (error) => {
    console.error('Error subscribing to settings:', error);
    callback(null);
  });
}

// ============ UPDATE SESSION OPERATIONS ============

// Update a sleep session
export async function updateSleepSession(
  sessionId: string,
  updates: {
    startTime?: string;
    endTime?: string | null;
    type?: 'nap' | 'night';
    notes?: string | null;
    babyMood?: BabyMood | null;
  }
): Promise<void> {
  const docSnap = await getDoc(doc(db, 'sleepSessions', sessionId));
  if (!docSnap.exists()) {
    throw new Error(`Sleep session ${sessionId} not found`);
  }

  const session = convertTimestamps(docSnap.data());
  const startTime = updates.startTime ? new Date(updates.startTime) : new Date(session.startTime);
  const endTime = updates.endTime ? new Date(updates.endTime) : (session.endTime ? new Date(session.endTime) : null);

  const duration = endTime
    ? Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000))
    : session.duration;

  await updateDoc(doc(db, 'sleepSessions', sessionId), {
    ...updates,
    date: startTime.toISOString().split('T')[0],
    duration,
    updatedAt: new Date().toISOString(),
  });
}

// Update a feeding (breastfeeding) session
export async function updateFeedingSession(
  sessionId: string,
  updates: {
    startTime?: string;
    endTime?: string;
    breastSide?: 'left' | 'right';
    notes?: string | null;
    babyMood?: BabyMood | null;
    momMood?: MomMood | null;
  }
): Promise<void> {
  const docSnap = await getDoc(doc(db, 'feedingSessions', sessionId));
  if (!docSnap.exists()) {
    throw new Error(`Feeding session ${sessionId} not found`);
  }

  const session = convertTimestamps(docSnap.data());
  const startTime = updates.startTime ? new Date(updates.startTime) : new Date(session.startTime);
  const endTime = updates.endTime ? new Date(updates.endTime) : new Date(session.endTime);
  const duration = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

  await updateDoc(doc(db, 'feedingSessions', sessionId), {
    ...updates,
    date: startTime.toISOString().split('T')[0],
    duration,
    updatedAt: new Date().toISOString(),
  });
}

// Update a pump session
export async function updatePumpSession(
  sessionId: string,
  updates: {
    startTime?: string;
    endTime?: string;
    side?: 'left' | 'right' | 'both';
    volume?: number;
    volumeUnit?: 'oz' | 'ml';
    notes?: string | null;
    momMood?: MomMood | null;
  }
): Promise<void> {
  const docSnap = await getDoc(doc(db, 'pumpSessions', sessionId));
  if (!docSnap.exists()) {
    throw new Error(`Pump session ${sessionId} not found`);
  }

  const session = convertTimestamps(docSnap.data());
  const startTime = updates.startTime ? new Date(updates.startTime) : new Date(session.startTime);
  const endTime = updates.endTime ? new Date(updates.endTime) : new Date(session.endTime);
  const duration = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

  await updateDoc(doc(db, 'pumpSessions', sessionId), {
    ...updates,
    date: startTime.toISOString().split('T')[0],
    duration,
    updatedAt: new Date().toISOString(),
  });
}

// Update a bottle session
export async function updateBottleSession(
  sessionId: string,
  updates: {
    timestamp?: string;
    volume?: number;
    volumeUnit?: 'oz' | 'ml';
    contentType?: 'breastMilk' | 'formula' | 'mixed';
    notes?: string | null;
    babyMood?: BabyMood | null;
  }
): Promise<void> {
  const timestamp = updates.timestamp ? new Date(updates.timestamp) : undefined;
  const dateUpdate = timestamp ? { date: timestamp.toISOString().split('T')[0] } : {};

  await updateDoc(doc(db, 'bottleSessions', sessionId), {
    ...updates,
    ...dateUpdate,
    updatedAt: new Date().toISOString(),
  });
}

// ============ DELETE SESSION OPERATIONS ============
export async function deleteSleepSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'sleepSessions', sessionId));
}

export async function deleteFeedingSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'feedingSessions', sessionId));
}

export async function deletePumpSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'pumpSessions', sessionId));
}

export async function deleteBottleSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'bottleSessions', sessionId));
}

// ============ GENERIC DELETE OPERATION ============
export async function deleteDocument(collectionPath: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, collectionPath, docId));
}
