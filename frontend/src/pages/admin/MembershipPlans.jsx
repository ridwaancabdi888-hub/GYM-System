import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import { Button, FormField, Input, Select } from '../../components/FormField.jsx';

const emptyForm = { name: '', durationDays: 30, price: '', status: 'active' };

export default function MembershipPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/plans');
      setPlans(data.plans);
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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(plan) {
    setEditing(plan);
    setForm({ name: plan.name, durationDays: plan.duration_days, price: plan.price, status: plan.status });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/plans/${editing.id}`, form);
        toast.success('Plan updated');
      } else {
        await api.post('/plans', form);
        toast.success('Plan created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Membership Plans</h1>
          <p className="text-sm text-slate-500">Define the plans members can subscribe to.</p>
        </div>
        <Button onClick={openCreate}>+ New Plan</Button>
      </div>

      <DataTable
        loading={loading}
        rows={plans}
        emptyTitle="No membership plans yet"
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'duration_days', header: 'Duration', render: (p) => `${p.duration_days} days` },
          { key: 'price', header: 'Price', render: (p) => `$${Number(p.price).toFixed(2)}` },
          { key: 'status', header: 'Status', render: (p) => <Badge>{p.status}</Badge> },
          { key: 'actions', header: '', render: (p) => <Button variant="ghost" onClick={() => openEdit(p)}>Edit</Button> },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit plan' : 'New plan'}>
        <form onSubmit={handleSubmit}>
          <FormField label="Plan name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Duration (days)" required>
              <Input required type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </FormField>
            <FormField label="Price ($)" required>
              <Input required type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
