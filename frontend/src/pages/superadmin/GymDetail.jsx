import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import Badge from '../../components/Badge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { Button, FormField, Input } from '../../components/FormField.jsx';

export default function GymDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [gym, setGym] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/superadmin/gyms/${id}`);
      setGym(data.gym);
      setAdmin(data.admin);
      setForm({ gymName: data.gym.name, address: data.gym.address || '', phone: data.gym.phone || '', email: data.gym.email || '' });
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
      const { data } = await api.patch(`/superadmin/gyms/${id}`, form);
      setGym(data.gym);
      toast.success('Gym information updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    const nextStatus = gym.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`${nextStatus === 'suspended' ? 'Suspend' : 'Activate'} ${gym.name}?`)) return;
    try {
      const { data } = await api.patch(`/superadmin/gyms/${id}/status`, { status: nextStatus });
      setGym(data.gym);
      toast.success(`Gym is now ${nextStatus}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function resetAdminPassword() {
    if (!confirm(`Reset password for ${admin.full_name}?`)) return;
    try {
      const { data } = await api.post(`/superadmin/gyms/${id}/reset-admin-password`);
      setTempPassword(data.adminTempPassword);
      toast.success('Password reset');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (loading || !gym) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/superadmin/gyms" className="text-sm text-brand-700 hover:underline">← Back to Gyms</Link>

      <div className="mt-3 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{gym.name}</h1>
          <div className="mt-1 flex gap-2">
            <Badge>{gym.status}</Badge>
            <Badge tone={gym.subscription_status}>{gym.subscription_status}</Badge>
          </div>
        </div>
        <Button variant={gym.status === 'active' ? 'danger' : 'primary'} onClick={toggleStatus}>
          {gym.status === 'active' ? 'Suspend Gym' : 'Activate Gym'}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Gym Information</h2>
          <form onSubmit={saveInfo}>
            <FormField label="Gym name" required>
              <Input required value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
            </FormField>
            <FormField label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Gym Admin</h2>
          {admin ? (
            <div className="text-sm">
              <p className="text-slate-500">Name</p>
              <p className="mb-3 font-medium text-slate-900">{admin.full_name}</p>
              <p className="text-slate-500">Email</p>
              <p className="mb-3 font-medium text-slate-900">{admin.email}</p>
              <p className="text-slate-500">Status</p>
              <p className="mb-4"><Badge>{admin.status}</Badge></p>
              <Button variant="secondary" onClick={resetAdminPassword}>Reset Password</Button>
              {tempPassword && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  New temporary password: <span className="font-mono font-semibold">{tempPassword}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No Gym Admin found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
