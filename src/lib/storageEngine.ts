import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';
import { db } from './db';

/**
 * KOA Storage Engine
 * Handles file uploads and deletions for Supabase Storage
 */

const BUCKET_NAME = 'koa-attachments';

export async function uploadFile(file: File, folder: string): Promise<string> {
  // Validate file size (5MB limit)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  const fileToUpload = file.type.startsWith('image/') ? await imageCompression(file, options) : file;

  const fileExt = fileToUpload.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileToUpload);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function queueFileUpload(file: File, folder: string, recordId: string, tableName: string, columnName: string): Promise<{ attachment_url: string, thumbnail_url: string }> {
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  let thumbnailBase64 = '';

  if (file.type.startsWith('image/')) {
    thumbnailBase64 = await new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      createImageBitmap(file).then(async (bitmap) => {
        try {
          URL.revokeObjectURL(url);
          const MAX_WIDTH = 200;
          const scale = MAX_WIDTH / bitmap.width;
          const width = MAX_WIDTH;
          const height = bitmap.height * scale;

          let canvas: HTMLCanvasElement | OffscreenCanvas;
          let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

          if ('OffscreenCanvas' in window) {
            canvas = new OffscreenCanvas(width, height);
            ctx = canvas.getContext('2d');
          } else {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            ctx = canvas.getContext('2d');
          }

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();

          if (canvas instanceof OffscreenCanvas) {
            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          } else {
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          }
        } catch {
          reject(new Error('Image too large for offline storage or processing failed.'));
        }
      }).catch(() => reject(new Error('Failed to load image for thumbnail generation.')));
    });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  await db.media_upload_queue.add({
    fileData: file,
    fileName,
    folder,
    recordId,
    tableName,
    columnName,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retryCount: 0
  });

  return { attachment_url: `local://${fileName}`, thumbnail_url: thumbnailBase64 };
}

export async function processMediaUploadQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const pendingUploads = await db.media_upload_queue.where('status').anyOf('pending', 'failed').limit(20).toArray();
  
  await Promise.all(pendingUploads.map(async (item) => {
    try {
      if (item.status === 'uploading') return;

      await db.media_upload_queue.update(item.id!, { status: 'uploading' });
      
      const filePath = `${item.folder}/${item.fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, item.fileData);

      if (uploadError && !uploadError.message.includes('already exists')) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from(item.tableName)
        .update({ [item.columnName]: publicUrl })
        .eq('id', item.recordId);

      if (updateError) {
        if (updateError.code === 'PGRST116' || updateError.message.includes('0 rows')) {
          await db.media_upload_queue.update(item.id!, { status: 'pending' });
          return;
        }
        // Orphaned blob prevention
        await supabase.storage.from(BUCKET_NAME).remove([filePath]).catch(console.error);
        throw updateError;
      }

      const localTable = db.table(item.tableName);
      if (localTable) {
        await localTable.update(item.recordId, { [item.columnName]: publicUrl });
      }

      await db.media_upload_queue.delete(item.id!);
    } catch (error) {
      console.error(`Failed to upload queued media ${item.fileName}:`, error);
      
      // Exponential backoff
      const retryCount = (item.retryCount || 0) + 1;
      if (retryCount >= 3) {
        await db.media_upload_queue.update(item.id!, { status: 'quarantined', retryCount });
      } else {
        const delay = Math.min(60000, 2000 * Math.pow(2, retryCount));
        await db.media_upload_queue.update(item.id!, { status: 'failed', retryCount });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }));
}

// Reactive Hair-Trigger
if (typeof window !== 'undefined') {
  const wakeStorage = () => {
    setTimeout(() => processMediaUploadQueue().catch(console.error), 100);
  };
  db.media_upload_queue.hook('creating', wakeStorage);
  db.media_upload_queue.hook('updating', wakeStorage);
}

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const urlParts = fileUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
    }
  } catch (err) {
    console.error('Failed to parse file URL for deletion:', err);
  }
}
