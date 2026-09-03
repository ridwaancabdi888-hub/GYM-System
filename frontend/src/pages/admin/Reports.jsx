import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import StatCard from '../../components/StatCard.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { Select } from '../../components/FormField.jsx';

export default function Reports() {
  const { role } = useAuth();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState('daily');
  const [series, setSeries] = useState([]);
  const [staffActivity, setStaffActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const requests = [api.get('/reports/summary'), api.get('/reports/payments', { params: { range } })];
    if (role === 'gym_admin') requests.push(api.get('/reports/staff-activity'));

    Promise.all(requests)
      .then(([summaryRes, paymentsRes, staffRes]) => {
        setSummary(summaryRes.data);
        setSeries(paymentsRes.data.series);
        if (staffRes) setStaffActivity(staffRes.data.staffActivity);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, role]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">A quick snapshot of how your gym is doing.</p>
      </div>

      {summary && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Members" value={summary.totalMembers} />
          <StatCard label="Active Members" value={summary.activeMembers} tone="good" />
          <StatCard label="Expired Memberships" value={summary.expiredMembers} tone={summary.expiredMembers > 0 ? 'warn' : 'default'} />
          <StatCard label="Today's Attendance" value={summary.todayAttendance} />
          <StatCard label="Today's Income" value={`$${summary.todaysIncome.toFixed(2)}`} tone="good" />
          <StatCard label="This Month's Income" value={`$${summary.monthlyIncome.toFixed(2)}`} tone="good" />
        </div>
      )}

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Membership Income</h2>
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="max-w-[140px]">
            <option value="daily">Last 30 days</option>
            <option value="monthly">Last 6 months</option>
          </Select>
        </div>
        {series.length === 0 ? (
          <p className="text-sm text-slate-500">No payments in this period.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4">Total Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {series.map((s) => (
                <tr key={s.period}>
                  <td className="py-2 pr-4">{s.period}</td>
                  <td className="py-2 pr-4">${s.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {role === 'gym_admin' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Staff Activity Summary</h2>
          {staffActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No staff activity recorded yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="py-2 pr-4">Staff Member</th>
                  <th className="py-2 pr-4">Actions Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffActivity.map((s) => (
                  <tr key={s.staffName}>
                    <td className="py-2 pr-4">{s.staffName}</td>
                    <td className="py-2 pr-4">{s.actionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
