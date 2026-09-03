import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ICONS = {
  dashboard: '🏠',
  gyms: '🏢',
  members: '🧍',
  plans: '📋',
  payments: '💳',
  attendance: '🗓️',
  staff: '👥',
  activity: '📜',
  announcements: '📣',
  reports: '📊',
};

function buildNav(role, permissions) {
  if (role === 'super_admin') {
    return [{ to: '/superadmin/gyms', label: 'Gyms', icon: ICONS.gyms }];
  }

  if (role === 'gym_admin') {
    return [
      { to: '/admin/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
      { to: '/admin/members', label: 'Members', icon: ICONS.members },
      { to: '/admin/plans', label: 'Membership Plans', icon: ICONS.plans },
      { to: '/admin/payments', label: 'Payments', icon: ICONS.payments },
      { to: '/admin/attendance', label: 'Attendance', icon: ICONS.attendance },
      { to: '/admin/staff', label: 'Staff', icon: ICONS.staff },
      { to: '/admin/activity-logs', label: 'Activity Logs', icon: ICONS.activity },
      { to: '/admin/announcements', label: 'Announcements', icon: ICONS.announcements },
      { to: '/admin/reports', label: 'Reports', icon: ICONS.reports },
    ];
  }

  if (role === 'staff') {
    const items = [{ to: '/admin/dashboard', label: 'Dashboard', icon: ICONS.dashboard }];
    if (permissions.members) items.push({ to: '/admin/members', label: 'Members', icon: ICONS.members });
    if (permissions.plans) items.push({ to: '/admin/plans', label: 'Membership Plans', icon: ICONS.plans });
    if (permissions.payments) items.push({ to: '/admin/payments', label: 'Payments', icon: ICONS.payments });
    if (permissions.attendance) items.push({ to: '/admin/attendance', label: 'Attendance', icon: ICONS.attendance });
    if (permissions.announcements) items.push({ to: '/admin/announcements', label: 'Announcements', icon: ICONS.announcements });
    if (permissions.reports) items.push({ to: '/admin/reports', label: 'Reports', icon: ICONS.reports });
    return items;
  }

  if (role === 'member') {
    return [
      { to: '/member/dashboard', label: 'My Dashboard', icon: ICONS.dashboard },
      { to: '/member/payments', label: 'My Payments', icon: ICONS.payments },
      { to: '/member/attendance', label: 'My Attendance', icon: ICONS.attendance },
      { to: '/member/announcements', label: 'Announcements', icon: ICONS.announcements },
    ];
  }

  return [];
}

export default function Sidebar({ open, onClose }) {
  const { role, permissions, profile } = useAuth();
  const items = buildNav(role, permissions);
  const brandName = role === 'super_admin' ? 'Gym SaaS' : profile?.gymName || 'Gym SaaS';

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5 text-lg font-semibold text-white" title={brandName}>
          <span className="flex-shrink-0 text-brand-400">●</span>
          <span className="truncate">{brandName}</span>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
