import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api.js';
import { useToast } from './Toast.jsx';
import Badge from './Badge.jsx';
import Modal from './Modal.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';
import { Button, FormField, Select, Textarea } from './FormField.jsx';
import { compressImageFile } from '../utils/imageCompress.js';

const PHOTO_TYPES = [
  { value: 'before', label: 'Before' },
  { value: 'progress', label: 'Progress' },
  { value: 'after', label: 'After' },
];

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

function formatDate(d) {
  return new Date(d).toLocaleDateString();
}

// Shared gallery + upload + compare view for progress photos. Used in two
// modes: the member's own dashboard (full control) and a Gym Admin's
// read-only view of one member's photos from that member's profile.
export default function ProgressPhotos({ listUrl, uploadUrl, deleteUrl, downloadUrlFor, canUpload, canDelete, canDownload }) {
  const toast = useToast();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoType, setPhotoType] = useState('progress');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [viewing, setViewing] = useState(null);

  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [comparing, setComparing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(listUrl);
      setPhotos(data.photos);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl]);

  async function handleFileChange(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const compressed = await compressImageFile(picked);
    setFile(compressed);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', photoType);
      if (note) formData.append('note', note);
      await api.post(uploadUrl, formData);
      toast.success('Photo uploaded');
      setUploadOpen(false);
      setFile(null);
      setNote('');
      setPhotoType('progress');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo) {
    if (!confirm('Delete this progress photo? This cannot be undone.')) return;
    try {
      await api.delete(deleteUrl(photo.id));
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setViewing(null);
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDownload(photo) {
    try {
      const { data } = await api.get(downloadUrlFor(photo.id));
      window.open(data.url, '_blank');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function toggleCompareMode() {
    setCompareMode((m) => !m);
    setSelected([]);
  }

  function toggleSelect(photo) {
    setSelected((prev) => {
      if (prev.includes(photo.id)) return prev.filter((id) => id !== photo.id);
      if (prev.length >= 2) return [prev[1], photo.id];
      return [...prev, photo.id];
    });
  }

  const selectedPhotos = selected.map((id) => photos.find((p) => p.id === id)).filter(Boolean);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Progress Photos</h2>
        <div className="flex flex-wrap gap-2">
          {photos.length >= 2 && (
            <Button variant="secondary" onClick={toggleCompareMode}>
              {compareMode ? 'Cancel Compare' : 'Compare Before / After'}
            </Button>
          )}
          {canUpload && <Button onClick={() => setUploadOpen(true)}>+ Upload Photo</Button>}
        </div>
      </div>

      {compareMode && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          <span>Select 2 photos to compare ({selected.length}/2 selected)</span>
          <Button disabled={selected.length !== 2} onClick={() => setComparing(true)}>
            View Comparison
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading photos…" />
      ) : photos.length === 0 ? (
        <EmptyState title="No progress photos yet" description={canUpload ? 'Upload your first photo to start tracking your progress.' : undefined} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                className="relative block aspect-square w-full"
                onClick={() => (compareMode ? toggleSelect(photo) : setViewing(photo))}
              >
                {photo.url ? (
                  <img src={photo.url} alt={`${photo.photo_type} progress photo`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">No preview</div>
                )}
                {compareMode && (
                  <span
                    className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      selected.includes(photo.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-white bg-black/30 text-white'
                    }`}
                  >
                    {selected.includes(photo.id) ? selected.indexOf(photo.id) + 1 : ''}
                  </span>
                )}
              </button>
              <div className="p-2">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <Badge tone={photo.photo_type}>{photo.photo_type}</Badge>
                  <span className="text-xs text-slate-400">{formatDate(photo.taken_date)}</span>
                </div>
                {!compareMode && (
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setViewing(photo)}>View</button>
                    {canDownload && (
                      <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => handleDownload(photo)}>Download</button>
                    )}
                    {canDelete && (
                      <button type="button" className="text-xs font-medium text-red-600 hover:underline" onClick={() => handleDelete(photo)}>Delete</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Progress Photo">
        <form onSubmit={handleUpload}>
          <FormField label="Photo" required>
            <input
              type="file"
              accept={ACCEPTED_TYPES}
              required
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            <p className="mt-1 text-xs text-slate-400">JPG, PNG, or WEBP. Photos are automatically resized for upload.</p>
          </FormField>
          <FormField label="Type" required>
            <Select value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
              {PHOTO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Note">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </FormField>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading || !file}>{uploading ? 'Uploading…' : 'Upload'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.photo_type[0].toUpperCase()}${viewing.photo_type.slice(1)} — ${formatDate(viewing.taken_date)}` : ''} size="lg">
        {viewing && (
          <div>
            {viewing.url && <img src={viewing.url} alt="Progress" className="mx-auto max-h-[60vh] w-auto rounded-lg" />}
            {viewing.note && <p className="mt-3 text-sm text-slate-600">{viewing.note}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {canDownload && <Button variant="secondary" onClick={() => handleDownload(viewing)}>Download</Button>}
              {canDelete && <Button variant="danger" onClick={() => handleDelete(viewing)}>Delete</Button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={comparing} onClose={() => setComparing(false)} title="Before / After Comparison" size="lg">
        <div className="flex flex-col gap-4 sm:flex-row">
          {selectedPhotos.map((photo) => (
            <div key={photo.id} className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone={photo.photo_type}>{photo.photo_type}</Badge>
                <span className="text-xs text-slate-400">{formatDate(photo.taken_date)}</span>
              </div>
              {photo.url && <img src={photo.url} alt={photo.photo_type} className="w-full rounded-lg object-cover" />}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
