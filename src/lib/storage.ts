import supabase from './supabase';

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/quicktime', 'video/mpeg', 'video/webm'];

type UploadResult = { url: string } | { error: string };

function validateImage(file: { size: number; type: string }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Image too large. Max size is 10MB.`;
  }
  return null;
}

function validateVideo(file: { size: number; type: string }): string | null {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return `Video too large. Max size is 100MB.`;
  }
  return null;
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'video/mp4': 'mp4',
    'video/mov': 'mov',
    'video/quicktime': 'mov',
    'video/mpeg': 'mpeg',
    'video/webm': 'webm',
  };
  return map[mimeType] ?? 'bin';
}

async function uploadAndGetUrl(
  bucket: string,
  path: string,
  file: { uri: string; type: string; size: number; name?: string },
  upsert = true
): Promise<UploadResult> {
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: file.type,
    upsert,
  });

  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function uploadProfilePhoto(
  userId: string,
  file: { uri: string; type: string; size: number }
): Promise<UploadResult> {
  const validationError = validateImage(file);
  if (validationError) return { error: validationError };

  const path = `${userId}/avatar.jpg`;
  return uploadAndGetUrl('profile-photos', path, file);
}

export async function uploadCoverPhoto(
  userId: string,
  file: { uri: string; type: string; size: number }
): Promise<UploadResult> {
  const validationError = validateImage(file);
  if (validationError) return { error: validationError };

  const path = `${userId}/cover.jpg`;
  return uploadAndGetUrl('cover-photos', path, file);
}

export async function uploadPostMedia(
  userId: string,
  file: { uri: string; type: string; size: number },
  type: 'photo' | 'video'
): Promise<UploadResult> {
  const validationError = type === 'photo' ? validateImage(file) : validateVideo(file);
  if (validationError) return { error: validationError };

  const ext = getExtension(file.type);
  const timestamp = Date.now();
  const path = `${userId}/${timestamp}.${ext}`;
  return uploadAndGetUrl('post-media', path, file, false);
}

export async function uploadIntroVideo(
  userId: string,
  file: { uri: string; type: string; size: number }
): Promise<UploadResult> {
  const validationError = validateVideo(file);
  if (validationError) return { error: validationError };

  const ext = getExtension(file.type);
  const path = `${userId}/intro.${ext}`;
  return uploadAndGetUrl('intro-videos', path, file);
}

export async function deleteFile(bucket: string, path: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error ? error.message : null };
}
