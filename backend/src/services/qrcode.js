import QRCode from 'qrcode';

// Encodes just the member_code so the check-in scanner can resolve it
// through the exact same path as a manual "search by Member ID" check-in.
export async function generateMemberQrDataUrl(memberCode) {
  return QRCode.toDataURL(memberCode, { margin: 1, width: 240 });
}
