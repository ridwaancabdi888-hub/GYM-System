import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';

export default function MemberAttendance() {
  const toast = useToast();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/member/attendance')
      .then(({ data }) => setAttendance(data.attendance))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">My Attendance History</h1>
      <DataTable
        loading={loading}
        rows={attendance}
        emptyTitle="No check-ins yet"
        columns={[
          { key: 'check_in_date', header: 'Date', render: (a) => new Date(a.check_in_date).toLocaleDateString() },
          { key: 'check_in_time', header: 'Time', render: (a) => a.check_in_time?.slice(0, 5) },
        ]}
      />
    </div>
  );
}
