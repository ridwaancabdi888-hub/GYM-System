import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api.js';
import { useToast } from './Toast.jsx';
import Badge from './Badge.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { Button, Input } from './FormField.jsx';

const MIN_PASSWORD_LENGTH = 6;

// Login-account management for a single member: view Member ID + status,
// manually set a new password (shown once, right after — passwords are
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
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

  function openChangeForm() {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setFormError('');
    setChanging(true);
  }

  async function handleChangeSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post(`/members/${memberId}/set-password`, { newPassword });
      setRevealedPassword(data.password);
      setChanging(false);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed');
    } catch (err) {
      setFormError(apiErrorMessage(err));
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
          <p className="text-slate-500">Username (Member ID)</p>
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
            <p className="text-slate-400 italic">Hidden — use Change Password to set a new one</p>
          )}
        </div>
      </div>

      {changing ? (
        <form onSubmit={handleChangeSubmit} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="e.g. Member123"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Confirm Password</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type the password"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show password
          </label>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save New Password'}</Button>
            <Button type="button" variant="secondary" onClick={() => setChanging(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openChangeForm}>Change Password</Button>
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
