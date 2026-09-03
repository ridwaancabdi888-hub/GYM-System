// Membership status is derived from expiry_date, except 'inactive' which is
// an explicit staff action (deactivation) that always wins until reactivated.
export function computeMemberStatus(expiryDate, currentStatus) {
  if (currentStatus === 'inactive') return 'inactive';
  if (!expiryDate) return 'active';
  const today = new Date().toISOString().slice(0, 10);
  return expiryDate < today ? 'expired' : 'active';
}
