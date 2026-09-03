import { supabase } from '../config/supabase.js';

function prefixFromName(name) {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || 'GYM');
}

// Generates a short, human-readable, per-gym-unique member code like "IPF-0007".
export async function generateMemberCode(gymId, gymName) {
  const prefix = prefixFromName(gymName);
  const { count, error } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId);

  if (error) throw error;

  const next = (count || 0) + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}
