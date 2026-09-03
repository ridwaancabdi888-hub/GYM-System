import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api.js';
import { useToast } from './Toast.jsx';
import Badge from './Badge.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { Button, Input } from './FormField.jsx';

// Login-account management for a single member: view Member ID + status,
// change/reset the password (shown once, right after — passwords are
// hashed at rest so there is no "current password" to retrieve), and
// enable/disable the account. Used both from the Members list (in a
// Modal) and inline on the Member detail page.
export default function MemberLoginDetails({ memberId, onStatusChange }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState(null);
  const [revealedPassword, setRevealedPassword] = useState(null);
  const [changing, setChanging] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/members/${memberId}/credentials`);
      setCredentials(data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setRevealedPassword(null);
    setChanging(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function handleReset() {
    if (!confirm('Generate a new random password for this member?')) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/members/${memberId}/reset-password`);
      setRevealedPassword(data.password);
      toast.success('Password reset');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post(`/members/${memberId}/set-password`, { newPassword });
      setRevealedPassword(data.password);
      setChanging(false);
      setNewPassword('');
      toast.success('Password changed');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus = credentials.status === 'inactive' ? 'active' : 'inactive';
    setTogglingStatus(true);
    try {
      const { data } = await api.patch(`/members/${memberId}/status`, { status: nextStatus });
      setCredentials((c) => ({ ...c, status: data.member.status }));
      onStatusChange?.(data.member.status);
      toast.success(`Account ${data.member.status === 'inactive' ? 'disabled' : 'enabled'}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setTogglingStatus(false);
    }
  }

  if (loading || !credentials) return <LoadingSpinner label="Loading login details…" />;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">Username</p>
          <p className="font-mono font-semibold text-slate-900">{credentials.username}</p>
        </div>
        <div>
          <p className="text-slate-500">Account Status</p>
          <Badge>{credentials.status}</Badge>
        </div>
        <div className="col-span-2">
          <p className="text-slate-500">Password</p>
          {revealedPassword ? (
            <p className="font-mono font-semibold text-slate-900">{revealedPassword}</p>
          ) : (
            <p className="text-slate-400 italic">Hidden — use Change Password or Reset Password to set a new one</p>
          )}
        </div>
      </div>

      {changing ? (
        <form onSubmit={handleChangeSubmit} className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">New password</label>
            <Input
              type="text"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="e.g. Member123"
            />
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button type="button" variant="secondary" onClick={() => setChanging(false)}>Cancel</Button>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setChanging(true)}>Change Password</Button>
          <Button variant="secondary" disabled={saving} onClick={handleReset}>Reset Password</Button>
          <Button
            variant={credentials.status === 'inactive' ? 'primary' : 'danger'}
            disabled={togglingStatus}
            onClick={handleToggleStatus}
          >
            {credentials.status === 'inactive' ? 'Enable Account' : 'Disable Account'}
          </Button>
        </div>
      )}
    </div>
  );
}
