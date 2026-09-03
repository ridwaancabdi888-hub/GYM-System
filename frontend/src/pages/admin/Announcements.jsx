import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import Badge from '../../components/Badge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import { Button, FormField, Input, Textarea, Select } from '../../components/FormField.jsx';

const emptyForm = { title: '', message: '', status: 'published' };

export default function Announcements() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data.announcements);
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

  function openEdit(a) {
    setEditing(a);
    setForm({ title: a.title, message: a.message, status: a.status });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/announcements/${editing.id}`, form);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', form);
        toast.success('Announcement published');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(a) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.delete(`/announcements/${a.id}`);
      toast.success('Announcement deleted');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500">Share updates with your members.</p>
        </div>
        <Button onClick={openCreate}>+ New Announcement</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : announcements.length === 0 ? (
        <EmptyState title="No announcements yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{a.title}</h3>
                <Badge tone={a.status}>{a.status}</Badge>
              </div>
              <p className="text-sm text-slate-600">{a.message}</p>
              <p className="mt-3 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" onClick={() => openEdit(a)}>Edit</Button>
                <Button variant="ghost" onClick={() => remove(a)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit announcement' : 'New announcement'}>
        <form onSubmit={handleSubmit}>
          <FormField label="Title" required>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Gym closed Friday" />
          </FormField>
          <FormField label="Message" required>
            <Textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
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
