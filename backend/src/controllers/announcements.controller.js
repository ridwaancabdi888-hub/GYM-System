import { supabase } from '../config/supabase.js';
import { requireFields } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';

export const listAnnouncements = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('gym_id', req.gymId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ announcements: data });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'message']);
  const { title, message, status } = req.body;

  const { data, error } = await supabase
    .from('announcements')
    .insert({ gym_id: req.gymId, title, message, status: status || 'published', created_by: req.auth.id })
    .select()
    .single();
  if (error) throw error;

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Published announcement "${title}"`, relatedTable: 'announcements', relatedId: data.id });
  res.status(201).json({ announcement: data });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, status } = req.body;
  const update = {};
  if (title !== undefined) update.title = title;
  if (message !== undefined) update.message = message;
  if (status !== undefined) update.status = status;

  const { data, error } = await supabase
    .from('announcements')
    .update(update)
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Announcement not found' });
  res.json({ announcement: data });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { error } = await supabase.from('announcements').delete().eq('id', req.params.id).eq('gym_id', req.gymId);
  if (error) throw error;
  res.json({ success: true });
});
