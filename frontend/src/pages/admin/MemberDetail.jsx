import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import Badge from '../../components/Badge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import Modal from '../../components/Modal.jsx';
import MemberLoginDetails from '../../components/MemberLoginDetails.jsx';
import { Button, FormField, Input, Select } from '../../components/FormField.jsx';
import { paymentStatusLabel } from '../../utils/paymentStatus.js';

export default function MemberDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [member, setMember] = useState(null);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewing, setRenewing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [memberRes, plansRes, paymentsRes, subsRes] = await Promise.all([
        api.get(`/members/${id}`),
        api.get('/plans'),
        api.get('/payments', { params: { memberId: id } }),
        api.get('/subscriptions', { params: { memberId: id } }),
      ]);
      setMember(memberRes.data.member);
      setForm({ fullName: memberRes.data.member.full_name, phone: memberRes.data.member.phone || '', gender: memberRes.data.member.gender || 'male' });
      setPlans(plansRes.data.plans);
      setPayments(paymentsRes.data.payments);
      setCurrentSubscription(subsRes.data.subscriptions[0] || null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveInfo(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch(`/members/${id}`, form);
      setMember(data.member);
      toast.success('Member details updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function showQr() {
    try {
      const { data } = await api.get(`/members/${id}/qr`);
      setQr(data.qrDataUrl);
      setQrOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function renew(e) {
    e.preventDefault();
    if (!renewPlanId) return;
    setRenewing(true);
    try {
      await api.post('/subscriptions', { memberId: id, planId: renewPlanId });
      toast.success('Membership renewed');
      setRenewOpen(false);
      setRenewPlanId('');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setRenewing(false);
    }
  }

  if (loading || !member) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/members" className="text-sm text-brand-700 hover:underline">← Back to Members</Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{member.full_name}</h1>
          <p className="text-sm text-slate-500">{member.member_code}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{member.status}</Badge>
          <Button variant="secondary" onClick={showQr}>QR Code</Button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Login Details</h2>
        <MemberLoginDetails memberId={id} onStatusChange={(newStatus) => setMember((m) => ({ ...m, status: newStatus }))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Member Details</h2>
          <form onSubmit={saveInfo}>
            <FormField label="Full name" required>
              <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField label="Gender">
                <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </FormField>
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Membership</h2>
            <Button variant="secondary" onClick={() => setRenewOpen(true)}>Renew / Assign Plan</Button>
          </div>
          <p className="text-slate-500">Plan</p>
          <p className="mb-3 font-medium text-slate-900">{member.membership_plans?.name || '—'}</p>
          <p className="text-slate-500">Start date</p>
          <p className="mb-3 font-medium text-slate-900">{member.start_date ? new Date(member.start_date).toLocaleDateString() : '—'}</p>
          <p className="text-slate-500">Expiry / Due date</p>
          <p className="mb-3 font-medium text-slate-900">{member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : '—'}</p>
          {currentSubscription && (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-slate-500">Due</p>
                  <p className="font-medium text-slate-900">${Number(currentSubscription.amount_due).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Paid</p>
                  <p className="font-medium text-slate-900">${Number(currentSubscription.amountPaid).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Balance</p>
                  <p className="font-medium text-slate-900">${Number(currentSubscription.balance).toFixed(2)}</p>
                </div>
              </div>
              <p className="text-slate-500">Payment Status</p>
              <Badge tone={currentSubscription.paymentStatus}>{paymentStatusLabel(currentSubscription.paymentStatus)}</Badge>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-4">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">${Number(p.amount).toFixed(2)}</td>
                    <td className="py-2 pr-4 capitalize">{p.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Member QR Code" size="sm">
        {qr && (
          <div className="flex flex-col items-center gap-3">
            <img src={qr} alt="Member QR code" className="h-48 w-48" />
            <p className="text-sm text-slate-500">{member.member_code}</p>
          </div>
        )}
      </Modal>

      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew / Assign Membership Plan" size="sm">
        <form onSubmit={renew}>
          <FormField label="Plan" required>
            <Select required value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value)}>
              <option value="">Select a plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toFixed(2)} ({p.duration_days} days)</option>
              ))}
            </Select>
          </FormField>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={renewing}>{renewing ? 'Saving…' : 'Confirm'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
