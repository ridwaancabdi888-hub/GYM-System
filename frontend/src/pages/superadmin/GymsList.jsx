import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import { Button, FormField, Input } from '../../components/FormField.jsx';

const emptyForm = { gymName: '', address: '', phone: '', email: '', adminFullName: '', adminEmail: '' };

export default function GymsList() {
  const toast = useToast();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/superadmin/gyms');
      setGyms(data.gyms);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/superadmin/gyms', form);
      toast.success(`${data.gym.name} created`);
      setCreatedInfo({ admin: data.admin, tempPassword: data.adminTempPassword });
      setForm(emptyForm);
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gyms</h1>
          <p className="text-sm text-slate-500">Manage every gym on the platform.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ New Gym</Button>
      </div>

      <DataTable
        loading={loading}
        rows={gyms}
        emptyTitle="No gyms yet — create the first one"
        columns={[
          { key: 'name', header: 'Gym', render: (g) => <Link to={`/superadmin/gyms/${g.id}`} className="font-medium text-brand-700 hover:underline">{g.name}</Link> },
          { key: 'admin', header: 'Gym Admin', render: (g) => g.admin?.full_name || '—' },
          { key: 'memberCount', header: 'Members' },
          { key: 'status', header: 'Status', render: (g) => <Badge>{g.status}</Badge> },
          { key: 'subscription_status', header: 'Subscription', render: (g) => <Badge tone={g.subscription_status}>{g.subscription_status}</Badge> },
          { key: 'created_at', header: 'Created', render: (g) => new Date(g.created_at).toLocaleDateString() },
        ]}
      />

      <Modal open={modalOpen} onClose={closeModal} title={createdInfo ? 'Gym created' : 'Create a new gym'} size="lg">
        {createdInfo ? (
          <div>
            <p className="mb-3 text-sm text-slate-600">
              Share these login details with the Gym Admin. This password is shown only once.
            </p>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p><span className="text-slate-500">Name:</span> {createdInfo.admin.full_name}</p>
              <p><span className="text-slate-500">Email:</span> {createdInfo.admin.email}</p>
              <p><span className="text-slate-500">Temporary password:</span> <span className="font-mono font-semibold">{createdInfo.tempPassword}</span></p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={closeModal}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Gym details</p>
            <FormField label="Gym name" required>
              <Input required value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </FormField>

            <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">First Gym Admin</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Full name" required>
                <Input required value={form.adminFullName} onChange={(e) => setForm({ ...form, adminFullName: e.target.value })} />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" required value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              </FormField>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create gym'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
