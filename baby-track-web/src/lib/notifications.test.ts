import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  getLastFeedingNotification,
  setLastFeedingNotification,
  getLastDiaperNotification,
  setLastDiaperNotification,
  getMedicineNotifiedToday,
  markMedicineNotified,
  clearFeedingNotificationTracking,
  clearDiaperNotificationTracking,
  getMilkExpiryNotified,
  markMilkExpiryNotified,
  clearMilkExpiryNotified,
} from './notifications';

class TestNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn().mockResolvedValue('granted');
  title: string;
  options?: NotificationOptions;
  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
  }
}

describe('notifications', () => {
  beforeEach(() => {
    localStorage.clear();
    // @ts-expect-error - test override
    global.Notification = TestNotification;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gets and sets notification tracking', () => {
    expect(getLastFeedingNotification()).toBeNull();
    setLastFeedingNotification('t1');
    expect(getLastFeedingNotification()).toBe('t1');

    expect(getLastDiaperNotification()).toBeNull();
    setLastDiaperNotification('t2');
    expect(getLastDiaperNotification()).toBe('t2');

    clearFeedingNotificationTracking();
    clearDiaperNotificationTracking();
    expect(getLastFeedingNotification()).toBeNull();
    expect(getLastDiaperNotification()).toBeNull();
  });

  it('tracks medicine notifications per day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T00:00:00.000Z'));

    expect(getMedicineNotifiedToday().size).toBe(0);
    markMedicineNotified('m1');
    const notified = getMedicineNotifiedToday();
    expect(notified.has('m1')).toBe(true);

    vi.setSystemTime(new Date('2025-02-02T00:00:00.000Z'));
    expect(getMedicineNotifiedToday().size).toBe(0);

    vi.useRealTimers();
  });

  it('tracks milk expiry notifications', () => {
    expect(getMilkExpiryNotified().size).toBe(0);
    markMilkExpiryNotified('s1');
    expect(getMilkExpiryNotified().has('s1')).toBe(true);
    clearMilkExpiryNotified('s1');
    expect(getMilkExpiryNotified().has('s1')).toBe(false);
  });

  it('returns permission status', () => {
    TestNotification.permission = 'granted';
    expect(getNotificationPermission()).toBe('granted');
  });

  it('requests permission', async () => {
    const result = await requestNotificationPermission();
    expect(TestNotification.requestPermission).toHaveBeenCalled();
    expect(result).toBe('granted');
  });

  it('shows a notification when granted', () => {
    TestNotification.permission = 'granted';
    const note = showNotification('Hello', { body: 'World' });
    expect(note).not.toBeNull();
  });

  it('does not show notification when not granted', () => {
    TestNotification.permission = 'denied';
    const note = showNotification('Hello', { body: 'World' });
    expect(note).toBeNull();
  });
});
