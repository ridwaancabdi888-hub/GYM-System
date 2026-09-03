import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from '../../components/Badge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import Modal from '../../components/Modal.jsx';
import { Button } from '../../components/FormField.jsx';

export default function MemberDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    api
      .get('/member/me')
      .then(({ data }) => setMember(data.member))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function showQr() {
    try {
      const { data } = await api.get('/member/qr');
      setQr(data.qrDataUrl);
      setQrOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (loading || !member) return <LoadingSpinner />;

  const daysLeft = member.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Welcome, {profile?.fullName?.split(' ')[0]}</h1>
      <p className="mb-6 text-sm text-slate-500">Member ID: {member.member_code}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Membership Status</p>
          <div className="mt-2"><Badge>{member.status}</Badge></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expiry Date</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : '—'}</p>
          {daysLeft !== null && <p className="text-xs text-slate-400">{daysLeft >= 0 ? `${daysLeft} days left` : 'Expired'}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Plan</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{member.membership_plans?.name || '—'}</p>
        </div>
      </div>

      <div className="mt-6">
        <Button variant="secondary" onClick={showQr}>Show My Check-in QR Code</Button>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="My QR Code" size="sm">
        {qr && (
          <div className="flex flex-col items-center gap-3">
            <img src={qr} alt="My QR code" className="h-48 w-48" />
            <p className="text-sm text-slate-500">{member.member_code}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
