import { randomUUID } from 'crypto';
import { supabase } from '../config/supabase.js';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 3600;

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isAllowedImageMime(mimetype) {
  return Object.prototype.hasOwnProperty.call(EXTENSION_BY_MIME, mimetype);
}

export async function uploadProgressPhoto({ memberId, buffer, mimetype }) {
  const ext = EXTENSION_BY_MIME[mimetype];
  const storagePath = `${memberId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimetype,
    upsert: false,
  });
  if (error) throw error;

  return storagePath;
}

export async function getSignedViewUrl(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

// One batched request for a whole gallery, instead of one round-trip per photo.
export async function getSignedViewUrls(storagePaths) {
  if (!storagePaths.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  const urlByPath = {};
  data.forEach((entry) => {
    urlByPath[entry.path] = entry.signedUrl;
  });
  return urlByPath;
}

export async function getSignedDownloadUrl(storagePath, downloadFilename) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, { download: downloadFilename || true });
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteProgressPhotoFile(storagePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}
