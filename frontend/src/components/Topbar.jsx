import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  gym_admin: 'Gym Admin',
  staff: 'Staff',
  member: 'Member',
};

export default function Topbar({ onMenuClick }) {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        ☰
      </button>
      <div className="hidden text-sm text-slate-500 lg:block">{ROLE_LABELS[role]}</div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800">{profile?.fullName}</p>
          <p className="text-xs text-slate-400">{profile?.title || ROLE_LABELS[role]}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {profile?.fullName?.[0]?.toUpperCase() || '?'}
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
