import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { shouldSuppressNotifications } from '@/types/settings';
import {
  getNotificationPermission,
  showNotification,
  getLastFeedingNotification,
  setLastFeedingNotification,
  getLastFeedingActivity,
  setLastFeedingActivity,
  getLastDiaperNotification,
  setLastDiaperNotification,
  getLastDiaperActivity,
  setLastDiaperActivity,
  getMedicineNotifiedToday,
  markMedicineNotified,
  clearFeedingNotificationTracking,
  clearDiaperNotificationTracking,
  getMilkExpiryNotified,
  markMilkExpiryNotified,
} from '@/lib/notifications';
import {
  subscribeToDiaperChanges,
  subscribeToFeedingSessions,
  subscribeToBottleSessions,
  subscribeToMedicines,
  subscribeToMedicineLogs,
  subscribeToMilkStash,
} from '@/lib/firestore';
import type { FeedingSession, BottleSession, DiaperChange, Medicine, MedicineLog, MilkStash } from '@/types';
import { getRoomTempExpirationMinutes } from '@/types/feeding';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export function useNotifications() {
  const { settings, selectedBaby, userId } = useAppStore();
  const feedingSessionsRef = useRef<FeedingSession[]>([]);
  const bottleSessionsRef = useRef<BottleSession[]>([]);
  const diaperChangesRef = useRef<DiaperChange[]>([]);
  const medicinesRef = useRef<Medicine[]>([]);
  const medicineLogsRef = useRef<MedicineLog[]>([]);
  const milkStashRef = useRef<MilkStash[]>([]);

  // Get most recent feeding time across all types
  const getMostRecentFeedingTime = useCallback((): string | null => {
    const allFeedings: { time: string }[] = [];

    // Add breastfeeding sessions
    feedingSessionsRef.current
      .filter((s) => !s.isActive && s.endTime)
      .forEach((s) => allFeedings.push({ time: s.endTime! }));

    // Add bottle sessions
    bottleSessionsRef.current.forEach((s) => allFeedings.push({ time: s.timestamp }));

    if (allFeedings.length === 0) return null;

    // Sort by time descending and return most recent
    allFeedings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return allFeedings[0].time;
  }, []);

  // Get most recent diaper change time
  const getMostRecentDiaperTime = useCallback((): string | null => {
    if (diaperChangesRef.current.length === 0) return null;

    const sorted = [...diaperChangesRef.current].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0].timestamp;
  }, []);

  // Check feeding reminder
  const checkFeedingReminder = useCallback(() => {
    if (!settings?.feedingReminderEnabled) return;
    if (!selectedBaby) return;
    if (getNotificationPermission() !== 'granted') return;
    if (shouldSuppressNotifications(settings)) return;

    const mostRecentFeeding = getMostRecentFeedingTime();
    if (!mostRecentFeeding) return;

    // Check if this is a new activity (reset tracking)
    const lastTrackedActivity = getLastFeedingActivity();
    if (lastTrackedActivity !== mostRecentFeeding) {
      setLastFeedingActivity(mostRecentFeeding);
      clearFeedingNotificationTracking();
      return; // New activity, start fresh
    }

    // Check if we already notified for this interval
    const lastNotified = getLastFeedingNotification();
    if (lastNotified) {
      const hoursSinceNotification =
        (Date.now() - new Date(lastNotified).getTime()) / (1000 * 60 * 60);
      if (hoursSinceNotification < settings.feedingReminderInterval) {
        return; // Already notified within interval
      }
    }

    // Check if interval has passed since last feeding
    const hoursSinceFeeding =
      (Date.now() - new Date(mostRecentFeeding).getTime()) / (1000 * 60 * 60);

    if (hoursSinceFeeding >= settings.feedingReminderInterval) {
      const hoursAgo = Math.floor(hoursSinceFeeding);
      const minutesAgo = Math.floor((hoursSinceFeeding - hoursAgo) * 60);
      const timeAgo =
        hoursAgo > 0
          ? `${hoursAgo}h ${minutesAgo}m`
          : `${minutesAgo}m`;

      showNotification(`Time to feed ${selectedBaby.name}!`, {
        body: `Last feeding was ${timeAgo} ago`,
        tag: 'feeding-reminder',
              });

      setLastFeedingNotification(new Date().toISOString());
    }
  }, [settings, selectedBaby, getMostRecentFeedingTime]);

  // Check diaper reminder
  const checkDiaperReminder = useCallback(() => {
    if (!settings?.diaperReminderEnabled) return;
    if (!selectedBaby) return;
    if (getNotificationPermission() !== 'granted') return;
    if (shouldSuppressNotifications(settings)) return;

    const mostRecentDiaper = getMostRecentDiaperTime();
    if (!mostRecentDiaper) return;

    // Check if this is a new activity (reset tracking)
    const lastTrackedActivity = getLastDiaperActivity();
    if (lastTrackedActivity !== mostRecentDiaper) {
      setLastDiaperActivity(mostRecentDiaper);
      clearDiaperNotificationTracking();
      return; // New activity, start fresh
    }

    // Check if we already notified for this interval
    const lastNotified = getLastDiaperNotification();
    if (lastNotified) {
      const hoursSinceNotification =
        (Date.now() - new Date(lastNotified).getTime()) / (1000 * 60 * 60);
      if (hoursSinceNotification < settings.diaperReminderInterval) {
        return; // Already notified within interval
      }
    }

    // Check if interval has passed since last diaper change
    const hoursSinceDiaper =
      (Date.now() - new Date(mostRecentDiaper).getTime()) / (1000 * 60 * 60);

    if (hoursSinceDiaper >= settings.diaperReminderInterval) {
      const hoursAgo = Math.floor(hoursSinceDiaper);
      const minutesAgo = Math.floor((hoursSinceDiaper - hoursAgo) * 60);
      const timeAgo =
        hoursAgo > 0
          ? `${hoursAgo}h ${minutesAgo}m`
          : `${minutesAgo}m`;

      showNotification(`Time to check ${selectedBaby.name}'s diaper!`, {
        body: `Last change was ${timeAgo} ago`,
        tag: 'diaper-reminder',
              });

      setLastDiaperNotification(new Date().toISOString());
    }
  }, [settings, selectedBaby, getMostRecentDiaperTime]);

  // Check medicine reminders
  const checkMedicineReminders = useCallback(() => {
    if (!settings?.medicineReminderEnabled) return;
    if (!selectedBaby) return;
    if (getNotificationPermission() !== 'granted') return;
    if (shouldSuppressNotifications(settings)) return;

    const activeMedicines = medicinesRef.current.filter((m) => m.isActive);
    const notifiedToday = getMedicineNotifiedToday();

    for (const medicine of activeMedicines) {
      // Skip if already notified today
      if (notifiedToday.has(medicine.id)) continue;

      // Skip "as needed" medicines
      if (medicine.frequency === 'asNeeded') continue;

      // Get last dose for this medicine
      const medicineLogsForThis = medicineLogsRef.current.filter(
        (log) => log.medicineId === medicine.id
      );

      // Calculate if medicine is due
      let isDue = false;
      let minutesUntilDue = Infinity;

      if (medicine.frequency === 'everyHours' && medicine.hoursInterval) {
        // For "every X hours" medicines
        if (medicineLogsForThis.length === 0) {
          // Never given, consider it due
          isDue = true;
        } else {
          const lastDose = medicineLogsForThis.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0];
          const hoursSinceLastDose =
            (Date.now() - new Date(lastDose.timestamp).getTime()) / (1000 * 60 * 60);
          const hoursUntilDue = medicine.hoursInterval - hoursSinceLastDose;
          minutesUntilDue = hoursUntilDue * 60;

          if (minutesUntilDue <= settings.medicineReminderMinutesBefore) {
            isDue = true;
          }
        }
      } else {
        // For frequency-based medicines (once, twice, thrice, fourTimes daily)
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = medicineLogsForThis.filter(
          (log) => log.timestamp.split('T')[0] === today
        );

        const requiredDoses: Record<string, number> = {
          once: 1,
          twice: 2,
          thrice: 3,
          fourTimes: 4,
        };

        const required = requiredDoses[medicine.frequency] || 0;
        const given = todayLogs.length;

        // If doses are still needed today and it's past a reasonable time
        if (given < required) {
          const currentHour = new Date().getHours();
          // Simple heuristic: spread doses across waking hours (8am-10pm)
          const doseHours = [8, 12, 16, 20].slice(0, required);
          const nextDoseHour = doseHours.find((h) => h > currentHour - 1);

          if (nextDoseHour !== undefined) {
            const minutesUntilNextDose = (nextDoseHour - currentHour) * 60 - new Date().getMinutes();
            if (minutesUntilNextDose <= settings.medicineReminderMinutesBefore && minutesUntilNextDose >= 0) {
              isDue = true;
            }
          }
        }
      }

      if (isDue) {
        showNotification(`Time for ${medicine.name}`, {
          body: medicine.dosage ? `Dosage: ${medicine.dosage}` : `Give ${medicine.name} to ${selectedBaby.name}`,
          tag: `medicine-${medicine.id}`,
                  });

        markMedicineNotified(medicine.id);
      }
    }
  }, [settings, selectedBaby]);

  // Check milk expiry reminder (for milk "on the go" / at room temperature)
  const checkMilkExpiryReminder = useCallback(() => {
    if (getNotificationPermission() !== 'granted') return;
    if (settings && shouldSuppressNotifications(settings)) return;

    const notified = getMilkExpiryNotified();

    // Check milk items that are "in use" (at room temperature)
    for (const milk of milkStashRef.current) {
      if (!milk.isInUse || !milk.inUseStartDate) continue;
      if (notified.has(milk.id)) continue;

      const minutesRemaining = getRoomTempExpirationMinutes(milk.inUseStartDate);

      // Notify when 30 minutes or less remaining
      if (minutesRemaining <= 30 && minutesRemaining > 0) {
        showNotification('Milk expiring soon!', {
          body: `Your milk on the go expires in ${minutesRemaining} minutes. Use it or store it!`,
          tag: `milk-expiry-${milk.id}`,
        });
        markMilkExpiryNotified(milk.id);
      }

      // Notify when expired
      if (minutesRemaining <= 0) {
        showNotification('Milk has expired!', {
          body: 'Your milk on the go has been at room temperature for over 4 hours and should be discarded.',
          tag: `milk-expiry-${milk.id}`,
        });
        markMilkExpiryNotified(milk.id);
      }
    }
  }, [settings]);

  // Subscribe to data
  useEffect(() => {
    if (!selectedBaby) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to feeding sessions
    unsubscribers.push(
      subscribeToFeedingSessions(selectedBaby.id, (sessions) => {
        feedingSessionsRef.current = sessions;
      })
    );

    // Subscribe to bottle sessions
    unsubscribers.push(
      subscribeToBottleSessions(selectedBaby.id, (sessions) => {
        bottleSessionsRef.current = sessions;
      })
    );

    // Subscribe to diaper changes
    unsubscribers.push(
      subscribeToDiaperChanges(selectedBaby.id, (changes) => {
        diaperChangesRef.current = changes;
      })
    );

    // Subscribe to medicines
    unsubscribers.push(
      subscribeToMedicines(selectedBaby.id, (medicines) => {
        medicinesRef.current = medicines;
      })
    );

    // Subscribe to medicine logs
    unsubscribers.push(
      subscribeToMedicineLogs(selectedBaby.id, (logs) => {
        medicineLogsRef.current = logs;
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [selectedBaby]);

  // Subscribe to milk stash (user-based, not baby-based)
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToMilkStash(userId, (stash) => {
      milkStashRef.current = stash;
    });

    return () => unsubscribe();
  }, [userId]);

  // Set up interval to check reminders
  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(() => {
      checkFeedingReminder();
      checkDiaperReminder();
      checkMedicineReminders();
      checkMilkExpiryReminder();
    }, 5000);

    // Regular interval checks
    const interval = setInterval(() => {
      checkFeedingReminder();
      checkDiaperReminder();
      checkMedicineReminders();
      checkMilkExpiryReminder();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkFeedingReminder, checkDiaperReminder, checkMedicineReminders, checkMilkExpiryReminder]);
}
