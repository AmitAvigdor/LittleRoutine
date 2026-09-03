import {
  createBottleSession,
  createBottleSessionFromMilkStash,
  createCompleteSleepSession,
  createDiaperChange,
  createFeedingSession,
  createPumpSession,
  deleteBottleSession,
  deleteDiaperChange,
  deleteFeedingSession,
  deletePumpSession,
  deleteSleepSession,
} from '@/lib/firestore';
import type { DashboardRecentActivity } from './recentActivity';

export async function deleteDashboardRecentActivity(
  activity: DashboardRecentActivity
): Promise<void> {
  switch (activity.sessionType) {
    case 'breastfeeding':
      await deleteFeedingSession(activity.session.id);
      break;
    case 'pump':
      await deletePumpSession(activity.session.id);
      break;
    case 'bottle':
      await deleteBottleSession(activity.session.id);
      break;
    case 'sleep':
      await deleteSleepSession(activity.session.id);
      break;
    case 'diaper':
      await deleteDiaperChange(activity.session.id);
      break;
  }
}

export async function restoreDashboardRecentActivity(
  activity: DashboardRecentActivity
): Promise<DashboardRecentActivity> {
  const restoredAt = new Date().toISOString();

  switch (activity.sessionType) {
    case 'breastfeeding': {
      const session = activity.session;
      if (!session.endTime) throw new Error('Completed feeding is missing an end time.');
      const id = await createFeedingSession(session.babyId, session.userId, {
        breastSide: session.breastSide,
        startTime: session.startTime,
        endTime: session.endTime,
        notes: session.notes,
        babyMood: session.babyMood,
        momMood: session.momMood,
        loggedBy: session.loggedBy,
      });
      return {
        ...activity,
        session: { ...session, id, createdAt: restoredAt, updatedAt: restoredAt },
      };
    }
    case 'pump': {
      const session = activity.session;
      if (!session.endTime) throw new Error('Completed pump is missing an end time.');
      const id = await createPumpSession(session.babyId, session.userId, {
        startTime: session.startTime,
        endTime: session.endTime,
        side: session.side,
        volume: session.volume,
        volumeUnit: session.volumeUnit,
        notes: session.notes,
        momMood: session.momMood,
      });
      return {
        ...activity,
        session: { ...session, id, createdAt: restoredAt, updatedAt: restoredAt },
      };
    }
    case 'bottle': {
      const session = activity.session;
      const input = {
        timestamp: session.timestamp,
        volume: session.volume,
        volumeUnit: session.volumeUnit,
        contentType: session.contentType,
        notes: session.notes,
        babyMood: session.babyMood,
      };
      const id = session.milkStashId
        ? await createBottleSessionFromMilkStash(session.babyId, session.userId, {
            ...input,
            milkStashId: session.milkStashId,
          })
        : await createBottleSession(session.babyId, session.userId, input);
      return {
        ...activity,
        session: { ...session, id, createdAt: restoredAt, updatedAt: restoredAt },
      };
    }
    case 'sleep': {
      const session = activity.session;
      if (!session.endTime) throw new Error('Completed sleep is missing an end time.');
      const id = await createCompleteSleepSession(session.babyId, session.userId, {
        startTime: session.startTime,
        endTime: session.endTime,
        type: session.type,
        notes: session.notes,
        babyMood: session.babyMood,
      });
      return {
        ...activity,
        session: { ...session, id, createdAt: restoredAt, updatedAt: restoredAt },
      };
    }
    case 'diaper': {
      const session = activity.session;
      const id = await createDiaperChange(session.babyId, session.userId, {
        type: session.type === 'wet' ? 'wet' : 'full',
        timestamp: session.timestamp,
        notes: session.notes,
        babyMood: session.babyMood,
      });
      return {
        ...activity,
        session: {
          ...session,
          id,
          type: session.type === 'wet' ? 'wet' : 'full',
          createdAt: restoredAt,
          updatedAt: restoredAt,
        },
      };
    }
  }
}
