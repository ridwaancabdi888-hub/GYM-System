import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import { Button, FormField, Input, Select } from '../../components/FormField.jsx';

const MODULES = [
  { key: 'members', label: 'Members' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payments', label: 'Payments' },
  { key: 'plans', label: 'Membership Plans' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'reports', label: 'Reports' },
];

const TITLE_PRESETS = ['Receptionist', 'Cashier', 'Trainer', 'Manager'];

const emptyForm = { fullName: '', email: '', title: 'Receptionist', permissions: { members: true, attendance: true } };

export default function Staff() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/staff');
      setStaff(data.staff);
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
    setTempPassword(null);
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditing(member);
    setForm({ fullName: member.full_name, email: member.email, title: member.title || '', permissions: member.permissions || {} });
    setTempPassword(null);
    setModalOpen(true);
  }

  function togglePermission(key) {
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/staff/${editing.id}`, { fullName: form.fullName, title: form.title, permissions: form.permissions });
        toast.success('Staff account updated');
        setModalOpen(false);
        load();
      } else {
        const { data } = await api.post('/staff', form);
        toast.success(`${data.staff.full_name} added`);
        setTempPassword(data.tempPassword);
        load();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(member) {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/staff/${member.id}`, { status: nextStatus });
      toast.success(`${member.full_name} is now ${nextStatus}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function resetPassword(member) {
    if (!confirm(`Reset password for ${member.full_name}?`)) return;
    try {
      const { data } = await api.post(`/staff/${member.id}/reset-password`);
      toast.success(`New password: ${data.tempPassword}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500">Create staff accounts and control what they can access.</p>
        </div>
        <Button onClick={openCreate}>+ Add Staff</Button>
      </div>

      <DataTable
        loading={loading}
        rows={staff}
        emptyTitle="No staff accounts yet"
        columns={[
          { key: 'full_name', header: 'Name', render: (s) => <button className="font-medium text-brand-700 hover:underline" onClick={() => openEdit(s)}>{s.full_name}</button> },
          { key: 'title', header: 'Role', render: (s) => s.title || '—' },
          { key: 'email', header: 'Email' },
          { key: 'permissions', header: 'Access', render: (s) => Object.keys(s.permissions || {}).filter((k) => s.permissions[k]).join(', ') || '—' },
          { key: 'status', header: 'Status', render: (s) => <Badge>{s.status}</Badge> },
          {
            key: 'actions',
            header: '',
            render: (s) => (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => resetPassword(s)}>Reset PW</Button>
                <Button variant="ghost" onClick={() => toggleStatus(s)}>{s.status === 'active' ? 'Disable' : 'Enable'}</Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit staff account' : 'Add staff account'}>
        {tempPassword ? (
          <div>
            <p className="mb-3 text-sm text-slate-600">Share these login details with the staff member. This password is shown only once.</p>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p><span className="text-slate-500">Email:</span> {form.email}</p>
              <p><span className="text-slate-500">Temporary password:</span> <span className="font-mono font-semibold">{tempPassword}</span></p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setModalOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormField label="Full name" required>
              <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </FormField>
            {!editing && (
              <FormField label="Email" required>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
            )}
            <FormField label="Title / Role">
              <Select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}>
                {TITLE_PRESETS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Other">Other</option>
              </Select>
            </FormField>
            <FormField label="Access permissions">
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={!!form.permissions[m.key]} onChange={() => togglePermission(m.key)} />
                    {m.label}
                  </label>
                ))}
              </div>
            </FormField>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add staff'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
