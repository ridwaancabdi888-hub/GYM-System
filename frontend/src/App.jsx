import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

import Login from './pages/Login.jsx';

import GymsList from './pages/superadmin/GymsList.jsx';
import GymDetail from './pages/superadmin/GymDetail.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import Members from './pages/admin/Members.jsx';
import MemberDetail from './pages/admin/MemberDetail.jsx';
import MembershipPlans from './pages/admin/MembershipPlans.jsx';
import Payments from './pages/admin/Payments.jsx';
import Attendance from './pages/admin/Attendance.jsx';
import Staff from './pages/admin/Staff.jsx';
import ActivityLogs from './pages/admin/ActivityLogs.jsx';
import Announcements from './pages/admin/Announcements.jsx';
import Reports from './pages/admin/Reports.jsx';

import MemberDashboard from './pages/member/MemberDashboard.jsx';
import MemberPayments from './pages/member/MemberPayments.jsx';
import MemberAttendance from './pages/member/MemberAttendance.jsx';
import MemberAnnouncements from './pages/member/MemberAnnouncements.jsx';

const HOME_BY_ROLE = {
  super_admin: '/superadmin/gyms',
  gym_admin: '/admin/dashboard',
  staff: '/admin/dashboard',
  member: '/member/dashboard',
};

function RoleHome() {
  const { role } = useAuth();
  return <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <RoleHome /> : <Login />} />
      <Route path="/" element={<RoleHome />} />

      {/* Super Admin */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="gyms" element={<GymsList />} />
        <Route path="gyms/:id" element={<GymDetail />} />
      </Route>

      {/* Gym Admin + Staff share the same workspace, gated per-page by permission */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['gym_admin', 'staff']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="members"
          element={
            <ProtectedRoute permission="members">
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="members/:id"
          element={
            <ProtectedRoute permission="members">
              <MemberDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="plans"
          element={
            <ProtectedRoute permission="plans">
              <MembershipPlans />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute permission="payments">
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <ProtectedRoute permission="attendance">
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff"
          element={
            <ProtectedRoute roles={['gym_admin']}>
              <Staff />
            </ProtectedRoute>
          }
        />
        <Route
          path="activity-logs"
          element={
            <ProtectedRoute roles={['gym_admin']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="announcements"
          element={
            <ProtectedRoute permission="announcements">
              <Announcements />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute permission="reports">
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Member */}
      <Route
        path="/member"
        element={
          <ProtectedRoute roles={['member']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<MemberDashboard />} />
        <Route path="payments" element={<MemberPayments />} />
        <Route path="attendance" element={<MemberAttendance />} />
        <Route path="announcements" element={<MemberAnnouncements />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
