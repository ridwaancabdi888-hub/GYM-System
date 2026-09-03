import { supabase } from '../config/supabase.js';

// There is no cron job in this serverless deployment, so membership expiry
// is enforced lazily: any time a gym's member list or reports are read, we
// first flip any 'active' member whose expiry_date has passed to 'expired'.
// Deactivated ('inactive') members are left untouched — that status only
// changes via an explicit staff action.
export async function syncExpiredMembers(gymId) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('members')
    .update({ status: 'expired' })
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .lt('expiry_date', today);

  if (error) {
    console.error('Failed to sync expired members:', error.message);
  }
}
