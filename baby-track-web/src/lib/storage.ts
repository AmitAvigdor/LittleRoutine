import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './firebase';

// Compress image before upload
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload types
type UploadType = 'babies' | 'growth' | 'milestones' | 'diary' | 'foods' | 'medicines';

// Upload image and get URL
export async function uploadImage(
  userId: string,
  type: UploadType,
  file: File,
  entityId?: string
): Promise<string> {
  const timestamp = Date.now();
  const filename = entityId
    ? `${entityId}_${timestamp}.jpg`
    : `${timestamp}.jpg`;

  const path = `users/${userId}/${type}/${filename}`;
  const storageRef = ref(storage, path);

  // Compress image before uploading
  const compressedBlob = await compressImage(file);

  await uploadBytes(storageRef, compressedBlob, {
    contentType: 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}

// Delete image by URL
export async function deleteImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Could not delete image:', error);
  }
}

// Upload baby photo
export async function uploadBabyPhoto(userId: string, babyId: string, file: File): Promise<string> {
  return uploadImage(userId, 'babies', file, babyId);
}

// Upload growth entry photo
export async function uploadGrowthPhoto(userId: string, file: File): Promise<string> {
  return uploadImage(userId, 'growth', file);
}

// Upload milestone photo
export async function uploadMilestonePhoto(userId: string, file: File): Promise<string> {
  return uploadImage(userId, 'milestones', file);
}

// Upload diary entry photo
export async function uploadDiaryPhoto(userId: string, file: File): Promise<string> {
  return uploadImage(userId, 'diary', file);
}

// Upload food photo
export async function uploadFoodPhoto(userId: string, file: File): Promise<string> {
  return uploadImage(userId, 'foods', file);
}

// Upload medicine photo
export async function uploadMedicinePhoto(userId: string, file: File): Promise<string> {
  return uploadImage(userId, 'medicines', file);
}
