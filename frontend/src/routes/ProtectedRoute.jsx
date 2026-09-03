import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, permission, children }) {
  const { isAuthenticated, role, permissions } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/login" replace />;

  if (permission && role === 'staff' && !permissions[permission]) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <p className="text-lg font-semibold text-slate-700">Access restricted</p>
        <p className="text-sm text-slate-500">You do not have permission to view this section.</p>
      </div>
    );
  }

  return children;
}
