import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateMemberQrDataUrl } from '../services/qrcode.js';
import { syncExpiredMembers } from '../services/memberMaintenance.js';
import { attachPaymentStatus } from '../services/subscriptionStatus.js';
import { ValidationError } from '../utils/validate.js';
import {
  isAllowedImageMime,
  uploadProgressPhoto as uploadToStorage,
  getSignedViewUrls,
  getSignedDownloadUrl,
  deleteProgressPhotoFile,
} from '../services/progressPhotoStorage.js';

const PHOTO_TYPES = ['before', 'progress', 'after'];

export const myProfile = asyncHandler(async (req, res) => {
  await syncExpiredMembers(req.auth.gymId);

  const { data, error } = await supabase
    .from('members')
    .select('*, membership_plans(name, duration_days, price)')
    .eq('id', req.auth.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Member not found' });

  const { password_hash, ...safe } = data;
  res.json({ member: safe });
});

export const myPayments = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('member_id', req.auth.id)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  res.json({ payments: data });
});

export const myAttendance = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('member_id', req.auth.id)
    .order('check_in_date', { ascending: false })
    .order('check_in_time', { ascending: false });
  if (error) throw error;
  res.json({ attendance: data });
});

export const myAnnouncements = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('gym_id', req.auth.gymId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ announcements: data });
});

// The member's current membership cycle: amount due, amount paid, balance,
// and the automatically computed status (Pending / Unpaid / Partially
// Paid / Paid) — same computation the Gym Admin sees on the Payments page.
export const mySubscription = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, membership_plans(name)')
    .eq('member_id', req.auth.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.json({ subscription: null });

  const [withStatus] = await attachPaymentStatus([data]);
  res.json({ subscription: withStatus });
});

export const myQr = asyncHandler(async (req, res) => {
  const { data } = await supabase.from('members').select('member_code').eq('id', req.auth.id).maybeSingle();
  if (!data) return res.status(404).json({ error: 'Member not found' });
  const qrDataUrl = await generateMemberQrDataUrl(data.member_code);
  res.json({ qrDataUrl, memberCode: data.member_code });
});

// Chronological gallery of the member's own progress photos, each with a
// short-lived signed URL for viewing (nothing here is a public URL, and
// nothing is ever handed out for a photo that isn't this member's own).
export const myProgressPhotos = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('member_id', req.auth.id)
    .order('taken_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;

  const urlByPath = await getSignedViewUrls(data.map((p) => p.storage_path));
  const photos = data.map((p) => ({ ...p, url: urlByPath[p.storage_path] || null }));
  res.json({ photos });
});

export const uploadMyProgressPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('A photo file is required');
  if (!isAllowedImageMime(req.file.mimetype)) {
    throw new ValidationError('Only JPG, PNG, or WEBP images are allowed');
  }

  const photoType = req.body.photoType;
  if (!PHOTO_TYPES.includes(photoType)) {
    throw new ValidationError(`photoType must be one of: ${PHOTO_TYPES.join(', ')}`);
  }

  const storagePath = await uploadToStorage({
    memberId: req.auth.id,
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });

  const { data: photo, error } = await supabase
    .from('progress_photos')
    .insert({
      gym_id: req.auth.gymId,
      member_id: req.auth.id,
      storage_path: storagePath,
      photo_type: photoType,
      note: req.body.note || null,
    })
    .select()
    .single();
  if (error) throw error;

  const urlByPath = await getSignedViewUrls([storagePath]);
  res.status(201).json({ photo: { ...photo, url: urlByPath[storagePath] || null } });
});

export const deleteMyProgressPhoto = asyncHandler(async (req, res) => {
  const { data: photo } = await supabase
    .from('progress_photos')
    .select('id, storage_path')
    .eq('id', req.params.id)
    .eq('member_id', req.auth.id)
    .maybeSingle();
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  await deleteProgressPhotoFile(photo.storage_path);
  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
  if (error) throw error;

  res.json({ success: true });
});

export const getMyProgressPhotoDownloadUrl = asyncHandler(async (req, res) => {
  const { data: photo } = await supabase
    .from('progress_photos')
    .select('id, storage_path, photo_type, taken_date')
    .eq('id', req.params.id)
    .eq('member_id', req.auth.id)
    .maybeSingle();
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const ext = photo.storage_path.split('.').pop();
  const filename = `progress-${photo.photo_type}-${photo.taken_date}.${ext}`;
  const url = await getSignedDownloadUrl(photo.storage_path, filename);
  res.json({ url });
});
