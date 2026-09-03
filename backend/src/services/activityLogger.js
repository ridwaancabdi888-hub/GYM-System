import { supabase } from '../config/supabase.js';

// Fire-and-forget style logger; callers await it but a logging failure
// should never break the primary action, so errors are swallowed (logged).
export async function logActivity({ gymId, userId, action, relatedTable, relatedId }) {
  const { error } = await supabase.from('activity_logs').insert({
    gym_id: gymId,
    user_id: userId,
    action,
    related_table: relatedTable || null,
    related_id: relatedId || null,
  });
  if (error) {
    console.error('Failed to write activity log:', error.message);
  }
}
