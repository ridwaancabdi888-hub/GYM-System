export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
};

export function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status;
}
