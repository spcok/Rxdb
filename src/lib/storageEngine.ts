import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function queueFileUpload(file: File, folder: string, _recordId: string, _tableName: string, _columnName: string): Promise<{ attachment_url: string, thumbnail_url: string }> {
  // For now, during RxDB migration, we will upload directly.
  // Offline media queuing can be re-implemented using RxDB attachments later.
  const publicUrl = await uploadFile(file, folder);
  
  // We don't have thumbnail generation here for simplicity, but we could add it back if needed.
  return { attachment_url: publicUrl, thumbnail_url: publicUrl };
}

export async function processMediaUploadQueue(): Promise<void> {
  // No-op for now
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
