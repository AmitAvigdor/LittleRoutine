import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImage, deleteImage } from './storage';

const refMock = vi.fn((storage: unknown, path: string) => ({ storage, path }));
const uploadBytesMock = vi.fn().mockResolvedValue(undefined);
const getDownloadURLMock = vi.fn().mockResolvedValue('https://example.com/file.jpg');
const deleteObjectMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/firebase', () => ({ storage: {} }));
vi.mock('firebase/storage', () => ({
  ref: (...args: unknown[]) => refMock(...args as [unknown, string]),
  uploadBytes: (...args: unknown[]) => uploadBytesMock(...args),
  getDownloadURL: (...args: unknown[]) => getDownloadURLMock(...args),
  deleteObject: (...args: unknown[]) => deleteObjectMock(...args),
}));

describe('storage helpers', () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.clearAllMocks();

    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        const event = { target: { result: 'data:image/jpeg;base64,aaa' } } as unknown as ProgressEvent<FileReader>;
        this.onload?.(event);
      }
    }

    class MockImage {
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      width = 1200;
      height = 800;
      set src(_value: string) {
        this.onload?.();
      }
    }

    // @ts-expect-error - test override
    global.FileReader = MockFileReader;
    // @ts-expect-error - test override
    global.Image = MockImage;

    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (blob: Blob | null) => void) => {
            cb(new Blob(['x'], { type: 'image/jpeg' }));
          },
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
  });

  it('uploads image and returns download URL', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const url = await uploadImage('user1', 'babies', file, 'baby1');

    expect(refMock).toHaveBeenCalled();
    expect(uploadBytesMock).toHaveBeenCalled();
    expect(getDownloadURLMock).toHaveBeenCalled();
    expect(url).toBe('https://example.com/file.jpg');
  });

  it('deletes image by URL', async () => {
    await deleteImage('https://example.com/file.jpg');
    expect(deleteObjectMock).toHaveBeenCalled();
  });
});
