import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Input } from '../../components/FormField.jsx';

export default function ActivityLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (date) params.date = date;
      const { data } = await api.get('/activity-logs', { params });
      setLogs(data.activityLogs);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Staff Activity Logs</h1>
        <p className="text-sm text-slate-500">See what your staff have been doing.</p>
      </div>

      <div className="mb-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[200px]" />
      </div>

      <DataTable
        loading={loading}
        rows={logs}
        emptyTitle="No activity recorded yet"
        columns={[
          { key: 'created_at', header: 'Date & Time', render: (l) => new Date(l.created_at).toLocaleString() },
          { key: 'user', header: 'Staff Member', render: (l) => l.users?.full_name || 'Unknown' },
          { key: 'action', header: 'Action' },
        ]}
      />
    </div>
  );
}
