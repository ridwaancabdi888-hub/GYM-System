// Membership payment status is always derived from balance + due date —
// never stored — so it updates automatically with no manual step:
//   Paid            paid >= due
//   Partially Paid  0 < paid < due (regardless of due date)
//   Unpaid          paid == 0 and the due date has been reached/passed
//   Pending         paid == 0 and the due date is still in the future
export function computePaymentStatus(amountDue, amountPaid, dueDate) {
  const due = Number(amountDue) || 0;
  const paid = Number(amountPaid) || 0;

  if (paid >= due) return 'paid';
  if (paid > 0) return 'partially_paid';

  const today = new Date().toISOString().slice(0, 10);
  return dueDate && dueDate <= today ? 'unpaid' : 'pending';
}
