// Notification utilities for browser notifications

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  return result as NotificationPermissionStatus;
}

export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (getNotificationPermission() !== 'granted') return null;

  try {
    return new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options,
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
    return null;
  }
}

// Storage keys for tracking sent notifications
const STORAGE_KEYS = {
  FEEDING_LAST_NOTIFIED: 'notification_feeding_last',
  FEEDING_LAST_ACTIVITY: 'notification_feeding_activity',
  DIAPER_LAST_NOTIFIED: 'notification_diaper_last',
  DIAPER_LAST_ACTIVITY: 'notification_diaper_activity',
  MEDICINE_NOTIFIED_TODAY: 'notification_medicine_today',
  MEDICINE_NOTIFIED_DATE: 'notification_medicine_date',
  MILK_EXPIRY_NOTIFIED: 'notification_milk_expiry_notified',
};

export function getLastFeedingNotification(): string | null {
  return localStorage.getItem(STORAGE_KEYS.FEEDING_LAST_NOTIFIED);
}

export function setLastFeedingNotification(timestamp: string): void {
  localStorage.setItem(STORAGE_KEYS.FEEDING_LAST_NOTIFIED, timestamp);
}

export function getLastFeedingActivity(): string | null {
  return localStorage.getItem(STORAGE_KEYS.FEEDING_LAST_ACTIVITY);
}

export function setLastFeedingActivity(timestamp: string): void {
  localStorage.setItem(STORAGE_KEYS.FEEDING_LAST_ACTIVITY, timestamp);
}

export function getLastDiaperNotification(): string | null {
  return localStorage.getItem(STORAGE_KEYS.DIAPER_LAST_NOTIFIED);
}

export function setLastDiaperNotification(timestamp: string): void {
  localStorage.setItem(STORAGE_KEYS.DIAPER_LAST_NOTIFIED, timestamp);
}

export function getLastDiaperActivity(): string | null {
  return localStorage.getItem(STORAGE_KEYS.DIAPER_LAST_ACTIVITY);
}

export function setLastDiaperActivity(timestamp: string): void {
  localStorage.setItem(STORAGE_KEYS.DIAPER_LAST_ACTIVITY, timestamp);
}

export function getMedicineNotifiedToday(): Set<string> {
  const today = new Date().toISOString().split('T')[0];
  const storedDate = localStorage.getItem(STORAGE_KEYS.MEDICINE_NOTIFIED_DATE);

  // Reset if it's a new day
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_KEYS.MEDICINE_NOTIFIED_DATE, today);
    localStorage.setItem(STORAGE_KEYS.MEDICINE_NOTIFIED_TODAY, '[]');
    return new Set();
  }

  const stored = localStorage.getItem(STORAGE_KEYS.MEDICINE_NOTIFIED_TODAY);
  if (!stored) return new Set();

  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

export function markMedicineNotified(medicineId: string): void {
  const notified = getMedicineNotifiedToday();
  notified.add(medicineId);
  localStorage.setItem(STORAGE_KEYS.MEDICINE_NOTIFIED_TODAY, JSON.stringify([...notified]));
}

export function clearFeedingNotificationTracking(): void {
  localStorage.removeItem(STORAGE_KEYS.FEEDING_LAST_NOTIFIED);
}

export function clearDiaperNotificationTracking(): void {
  localStorage.removeItem(STORAGE_KEYS.DIAPER_LAST_NOTIFIED);
}

export function getMilkExpiryNotified(): Set<string> {
  const stored = localStorage.getItem(STORAGE_KEYS.MILK_EXPIRY_NOTIFIED);
  if (!stored) return new Set();
  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

export function markMilkExpiryNotified(milkStashId: string): void {
  const notified = getMilkExpiryNotified();
  notified.add(milkStashId);
  localStorage.setItem(STORAGE_KEYS.MILK_EXPIRY_NOTIFIED, JSON.stringify([...notified]));
}

export function clearMilkExpiryNotified(milkStashId: string): void {
  const notified = getMilkExpiryNotified();
  notified.delete(milkStashId);
  localStorage.setItem(STORAGE_KEYS.MILK_EXPIRY_NOTIFIED, JSON.stringify([...notified]));
}
