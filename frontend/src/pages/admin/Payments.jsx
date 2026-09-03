import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import { Button, FormField, Input, Select } from '../../components/FormField.jsx';
import { paymentStatusLabel } from '../../utils/paymentStatus.js';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'zaad', label: 'ZAAD' },
  { value: 'edahab', label: 'eDahab' },
  { value: 'other', label: 'Other' },
];

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberOptions, setMemberOptions] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/payments');
      setPayments(data.payments);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadMembershipStatus() {
    setStatusLoading(true);
    try {
      const { data } = await api.get('/payments/membership-status');
      setMembershipStatus(data.subscriptions);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadMembershipStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!memberSearch) {
      setMemberOptions([]);
      return;
    }
    const t = setTimeout(() => {
      api.get('/payments/member-lookup', { params: { search: memberSearch } }).then(({ data }) => setMemberOptions(data.members));
    }, 250);
    return () => clearTimeout(t);
  }, [memberSearch]);

  function closeModal() {
    setModalOpen(false);
    setSelectedMember(null);
    setMemberSearch('');
    setMemberOptions([]);
    setAmount('');
    setMethod('cash');
    setNotes('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedMember) return;
    setSaving(true);
    try {
      const { data } = await api.post('/payments', { memberId: selectedMember.id, amount, method, notes });
      toast.success('Payment recorded');
      closeModal();
      load();
      loadMembershipStatus();
      openReceipt(data.payment.id);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function openReceipt(paymentId) {
    try {
      const { data } = await api.get(`/payments/${paymentId}/receipt`);
      setReceipt(data.receipt);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Record and review member payments.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Record Payment</Button>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-800">Membership Payment Status</h2>
      <p className="mb-3 text-xs text-slate-500">
        Calculated automatically from each member's current membership balance and due date — nothing here is set by hand.
      </p>
      <div className="mb-8">
        <DataTable
          loading={statusLoading}
          rows={membershipStatus}
          emptyTitle="No memberships yet"
          columns={[
            { key: 'member', header: 'Member', render: (s) => `${s.members?.full_name} (${s.members?.member_code})` },
            { key: 'plan', header: 'Plan', render: (s) => s.membership_plans?.name || '—' },
            { key: 'amount_due', header: 'Amount Due', render: (s) => `$${Number(s.amount_due).toFixed(2)}` },
            { key: 'amountPaid', header: 'Paid', render: (s) => `$${Number(s.amountPaid).toFixed(2)}` },
            { key: 'balance', header: 'Balance', render: (s) => `$${Number(s.balance).toFixed(2)}` },
            { key: 'end_date', header: 'Due Date', render: (s) => new Date(s.end_date).toLocaleDateString() },
            { key: 'paymentStatus', header: 'Status', render: (s) => <Badge tone={s.paymentStatus}>{paymentStatusLabel(s.paymentStatus)}</Badge> },
          ]}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-800">Payment History</h2>
      <DataTable
        loading={loading}
        rows={payments}
        emptyTitle="No payments recorded yet"
        columns={[
          { key: 'payment_date', header: 'Date', render: (p) => new Date(p.payment_date).toLocaleDateString() },
          { key: 'member', header: 'Member', render: (p) => `${p.members?.full_name} (${p.members?.member_code})` },
          { key: 'amount', header: 'Amount', render: (p) => `$${Number(p.amount).toFixed(2)}` },
          { key: 'method', header: 'Method', render: (p) => <span className="capitalize">{p.method}</span> },
          { key: 'received_by', header: 'Received By', render: (p) => p.users?.full_name || '—' },
          { key: 'actions', header: '', render: (p) => <Button variant="ghost" onClick={() => openReceipt(p.id)}>Receipt</Button> },
        ]}
      />

      <Modal open={modalOpen} onClose={closeModal} title="Record a payment">
        <form onSubmit={handleSubmit}>
          <FormField label="Member" required>
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <span>{selectedMember.full_name} ({selectedMember.member_code})</span>
                <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setSelectedMember(null)}>Change</button>
              </div>
            ) : (
              <div>
                <Input placeholder="Search by name, member ID, or phone…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
                {memberOptions.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    {memberOptions.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberOptions([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        {m.full_name} <span className="text-slate-400">({m.member_code})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount ($)" required>
              <Input required type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FormField>
            <FormField label="Method" required>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </FormField>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={saving || !selectedMember}>{saving ? 'Saving…' : 'Record payment'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt" size="sm">
        {receipt && (
          <div id="receipt-print">
            <div className="text-center">
              <p className="font-semibold text-slate-900">{receipt.gym?.name}</p>
              <p className="text-xs text-slate-500">{receipt.gym?.address}</p>
              <p className="text-xs text-slate-500">{receipt.gym?.phone}</p>
            </div>
            <div className="my-4 border-t border-dashed border-slate-300" />
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-500">Member:</span> {receipt.member?.full_name} ({receipt.member?.member_code})</p>
              <p><span className="text-slate-500">Date:</span> {new Date(receipt.payment.paymentDate).toLocaleDateString()}</p>
              <p><span className="text-slate-500">Amount:</span> ${Number(receipt.payment.amount).toFixed(2)}</p>
              <p><span className="text-slate-500">Method:</span> <span className="capitalize">{receipt.payment.method}</span></p>
              <p><span className="text-slate-500">Received by:</span> {receipt.receivedBy}</p>
              {receipt.payment.notes && <p><span className="text-slate-500">Notes:</span> {receipt.payment.notes}</p>}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
