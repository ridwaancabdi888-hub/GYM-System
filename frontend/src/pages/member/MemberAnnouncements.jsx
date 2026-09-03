import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function MemberAnnouncements() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/member/announcements')
      .then(({ data }) => setAnnouncements(data.announcements))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Announcements</h1>
      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">{a.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{a.message}</p>
              <p className="mt-3 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
