import { supabase } from '../config/supabase.js';

// Generates a short, per-gym Member ID like "M001". Each gym has its own
// independent sequence, so the same code (e.g. "M001") legitimately exists
// in more than one gym — this is by design, and is why member login
// resolves identity by trying the code against every gym that has it and
// checking the password, rather than a single global username lookup.
export async function generateMemberCode(gymId) {
  const { count, error } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId);

  if (error) throw error;

  const next = (count || 0) + 1;
  return `M${String(next).padStart(3, '0')}`;
}
