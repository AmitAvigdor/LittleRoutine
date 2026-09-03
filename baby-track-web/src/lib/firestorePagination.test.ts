import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  documentId: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  arrayUnion: vi.fn(),
  collection: firestoreMocks.collection,
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  documentId: firestoreMocks.documentId,
  getDoc: vi.fn(),
  getDocs: firestoreMocks.getDocs,
  limit: firestoreMocks.limit,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: firestoreMocks.orderBy,
  query: firestoreMocks.query,
  runTransaction: vi.fn(),
  startAfter: firestoreMocks.startAfter,
  Timestamp: class Timestamp {},
  updateDoc: vi.fn(),
  where: firestoreMocks.where,
  writeBatch: vi.fn(),
}));

vi.mock('./firestoreClient', () => ({ db: { id: 'test-db' } }));
vi.mock('@/stores/appStore', () => ({
  useAppStore: {
    getState: () => ({ setPendingWrites: vi.fn() }),
  },
}));

import { getActivityPage, subscribeToFeedingSessions } from './firestore';

function createDocument(id: string, startTime: string) {
  const data = {
    babyId: 'baby-1',
    startTime,
    createdAt: startTime,
    updatedAt: startTime,
  };

  return {
    id,
    data: () => data,
    get: (field: string) => data[field as keyof typeof data],
  };
}

describe('Firestore ordered queries and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.collection.mockImplementation((...args) => ({ type: 'collection', args }));
    firestoreMocks.where.mockImplementation((...args) => ({ type: 'where', args }));
    firestoreMocks.orderBy.mockImplementation((...args) => ({ type: 'orderBy', args }));
    firestoreMocks.documentId.mockReturnValue('__name__');
    firestoreMocks.limit.mockImplementation((value) => ({ type: 'limit', value }));
    firestoreMocks.startAfter.mockImplementation((...args) => ({ type: 'startAfter', args }));
    firestoreMocks.query.mockImplementation((...args) => ({ type: 'query', args }));
  });

  it('orders and limits live subscriptions on the Firestore server', () => {
    const unsubscribe = vi.fn();
    firestoreMocks.onSnapshot.mockImplementation((_query, onNext) => {
      onNext({ docs: [] });
      return unsubscribe;
    });
    const callback = vi.fn();

    const stop = subscribeToFeedingSessions('baby-1', callback, 25);

    expect(firestoreMocks.where).toHaveBeenCalledWith('babyId', '==', 'baby-1');
    expect(firestoreMocks.orderBy).toHaveBeenNthCalledWith(1, 'startTime', 'desc');
    expect(firestoreMocks.orderBy).toHaveBeenNthCalledWith(2, '__name__', 'desc');
    expect(firestoreMocks.limit).toHaveBeenCalledWith(25);
    expect(callback).toHaveBeenCalledWith([]);

    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('returns a stable cursor and one page without exposing the lookahead item', async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        createDocument('session-3', '2026-08-03T10:00:00.000Z'),
        createDocument('session-2', '2026-08-02T10:00:00.000Z'),
        createDocument('session-1', '2026-08-01T10:00:00.000Z'),
      ],
    });

    const page = await getActivityPage('feedingSessions', 'baby-1', null, 2);

    expect(page.items.map((item) => item.id)).toEqual(['session-3', 'session-2']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual({
      sortValue: '2026-08-02T10:00:00.000Z',
      documentId: 'session-2',
    });
    expect(firestoreMocks.limit).toHaveBeenCalledWith(3);
  });

  it('starts the next page after both the sort value and document id', async () => {
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
    const cursor = {
      sortValue: '2026-08-02T10:00:00.000Z',
      documentId: 'session-2',
    };

    await getActivityPage('feedingSessions', 'baby-1', cursor, 50);

    expect(firestoreMocks.startAfter).toHaveBeenCalledWith(
      cursor.sortValue,
      cursor.documentId
    );
  });
});
