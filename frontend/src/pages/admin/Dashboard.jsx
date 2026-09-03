import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import StatCard from '../../components/StatCard.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function Dashboard() {
  const { profile, permissions, role } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const canSeeReports = role === 'gym_admin' || permissions.reports;

  useEffect(() => {
    if (!canSeeReports) {
      setLoading(false);
      return;
    }
    api
      .get('/reports/summary')
      .then(({ data }) => setStats(data))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Welcome back, {profile?.fullName?.split(' ')[0]}</h1>
      <p className="mb-6 text-sm text-slate-500">Here's what's happening at your gym today.</p>

      {loading ? (
        <LoadingSpinner />
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Members" value={stats.totalMembers} />
          <StatCard label="Active Members" value={stats.activeMembers} tone="good" />
          <StatCard label="Expired Memberships" value={stats.expiredMembers} tone={stats.expiredMembers > 0 ? 'warn' : 'default'} />
          <StatCard label="Today's Check-ins" value={stats.todayAttendance} />
          <StatCard label="Today's Income" value={`$${stats.todaysIncome.toFixed(2)}`} tone="good" />
          <StatCard label="This Month's Income" value={`$${stats.monthlyIncome.toFixed(2)}`} tone="good" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">No summary available for your account.</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {(role === 'gym_admin' || permissions.members) && (
          <Link to="/admin/members" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Manage Members
          </Link>
        )}
        {(role === 'gym_admin' || permissions.attendance) && (
          <Link to="/admin/attendance" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Check In a Member
          </Link>
        )}
        {(role === 'gym_admin' || permissions.payments) && (
          <Link to="/admin/payments" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Record a Payment
          </Link>
        )}
      </div>
    </div>
  );
}
