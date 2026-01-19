import { MedicationFrequency, TeethingSymptom, ToothPosition } from './enums';

// Medicine
export interface Medicine {
  id: string;
  babyId: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  hoursInterval: number | null; // For 'everyHours' frequency
  instructions: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicineInput {
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  hoursInterval?: number | null;
  instructions?: string | null;
  photoUrl?: string | null;
}

// Medicine Log
export interface MedicineLog {
  id: string;
  medicineId: string;
  babyId: string;
  userId: string;
  timestamp: string;
  givenBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicineLogInput {
  timestamp: string;
  givenBy?: string | null;
  notes?: string | null;
}

// Vaccination
export interface Vaccination {
  id: string;
  babyId: string;
  userId: string;
  name: string;
  scheduledDate: string;
  administeredDate: string | null;
  location: string | null;
  notes: string | null;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVaccinationInput {
  name: string;
  scheduledDate: string;
  administeredDate?: string | null;
  location?: string | null;
  notes?: string | null;
  reminderEnabled?: boolean;
}

// Teething Event
export interface TeethingEvent {
  id: string;
  babyId: string;
  userId: string;
  toothPosition: ToothPosition;
  firstSignsDate: string | null;
  eruptionDate: string | null;
  symptoms: TeethingSymptom[];
  remediesUsed: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeethingEventInput {
  toothPosition: ToothPosition;
  firstSignsDate?: string | null;
  eruptionDate?: string | null;
  symptoms?: TeethingSymptom[];
  remediesUsed?: string | null;
  notes?: string | null;
}

// Pediatrician Note
export interface PediatricianNote {
  id: string;
  babyId: string;
  userId: string;
  date: string;
  concern: string;
  notes: string | null;
  isResolved: boolean;
  resolution: string | null;
  resolvedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePediatricianNoteInput {
  date: string;
  concern: string;
  notes?: string | null;
  isResolved?: boolean;
  resolution?: string | null;
}

// Helper functions
export function getNextDoseTime(lastDose: string, frequency: MedicationFrequency, hoursInterval?: number): Date | null {
  const lastDoseDate = new Date(lastDose);
  let hoursToAdd: number;

  switch (frequency) {
    case 'asNeeded':
      return null;
    case 'onceDaily':
      hoursToAdd = 24;
      break;
    case 'twiceDaily':
      hoursToAdd = 12;
      break;
    case 'threeTimesDaily':
      hoursToAdd = 8;
      break;
    case 'fourTimesDaily':
      hoursToAdd = 6;
      break;
    case 'everyHours':
      hoursToAdd = hoursInterval || 4;
      break;
    default:
      return null;
  }

  return new Date(lastDoseDate.getTime() + hoursToAdd * 60 * 60 * 1000);
}

export function getVaccinationStatus(vaccination: Vaccination): 'completed' | 'overdue' | 'upcoming' {
  if (vaccination.administeredDate) return 'completed';

  const scheduledDate = new Date(vaccination.scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scheduledDate < today) return 'overdue';
  return 'upcoming';
}

export function getDaysUntilVaccination(scheduledDate: string): number {
  const scheduled = new Date(scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);

  const diffTime = scheduled.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const TEETHING_REMEDIES = [
  'Cold teething ring',
  'Chilled washcloth',
  'Gentle gum massage',
  'Teething toys',
  'Cold fruit in mesh feeder',
  'Teething biscuits',
  'Pain reliever (as prescribed)',
  'Teething gel',
  'Extra cuddles',
  'Distraction/play',
];
