import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import MemberLoginDetails from '../../components/MemberLoginDetails.jsx';
import { Button, FormField, Input, Select } from '../../components/FormField.jsx';

const emptyForm = { fullName: '', phone: '', gender: 'male', membershipPlanId: '' };

export default function Members() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);
  const [loginMember, setLoginMember] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      const { data } = await api.get('/members', { params });
      setMembers(data.members);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/plans').then(({ data }) => setPlans(data.plans)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/members', { ...form, membershipPlanId: form.membershipPlanId || null });
      toast.success(`${data.member.full_name} added`);
      setCreatedInfo({ memberCode: data.member.member_code, password: data.loginTempPassword });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setCreatedInfo(null);
    setForm(emptyForm);
  }

  function handleLoginStatusChange(memberId, newStatus) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m)));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Members</h1>
          <p className="text-sm text-slate-500">Search, add, and manage gym members.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Add Member</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, member ID, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[160px]">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <DataTable
        loading={loading}
        rows={members}
        emptyTitle="No members found"
        columns={[
          { key: 'member_code', header: 'Member ID', render: (m) => <Link to={`/admin/members/${m.id}`} className="font-medium text-brand-700 hover:underline">{m.member_code}</Link> },
          { key: 'full_name', header: 'Name' },
          { key: 'phone', header: 'Phone', render: (m) => m.phone || '—' },
          { key: 'expiry_date', header: 'Expiry', render: (m) => (m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '—') },
          { key: 'status', header: 'Status', render: (m) => <Badge>{m.status}</Badge> },
          { key: 'actions', header: '', render: (m) => <Button variant="ghost" onClick={() => setLoginMember(m)}>Login Details</Button> },
        ]}
      />

      <Modal open={modalOpen} onClose={closeModal} title={createdInfo ? 'Member added' : 'Add a new member'}>
        {createdInfo ? (
          <div>
            <p className="mb-3 text-sm text-slate-600">Give these login details to the member so they can access their account.</p>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p><span className="text-slate-500">Member ID (also their login username):</span> {createdInfo.memberCode}</p>
              <p><span className="text-slate-500">Temporary password:</span> <span className="font-mono font-semibold">{createdInfo.password}</span></p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={closeModal}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
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
            <FormField label="Membership plan">
              <Select value={form.membershipPlanId} onChange={(e) => setForm({ ...form, membershipPlanId: e.target.value })}>
                <option value="">No plan yet</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toFixed(2)}</option>
                ))}
              </Select>
            </FormField>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add member'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!loginMember} onClose={() => setLoginMember(null)} title={loginMember ? `Login Details — ${loginMember.full_name}` : ''}>
        {loginMember && (
          <MemberLoginDetails
            memberId={loginMember.id}
            onStatusChange={(newStatus) => handleLoginStatusChange(loginMember.id, newStatus)}
          />
        )}
      </Modal>
    </div>
  );
}
