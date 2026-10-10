import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import './services/riskService' // starts the risk engine (it listens for inspection / issue / site changes)
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/auth/Login'
import InspectorHome from './pages/inspector/InspectorHome'
import OldSites from './pages/inspector/OldSites'
import SiteDetails from './pages/inspector/SiteDetails'
import InspectionWizard from './pages/inspector/InspectionWizard'
import ProjectDetails from './pages/inspector/ProjectDetails'
import NewSites from './pages/inspector/NewSites'
import Profile from './pages/inspector/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'
import Officers from './pages/admin/Officers'
import OfficerDetail from './pages/admin/OfficerDetail'
import SiteDetail from './pages/admin/SiteDetail'
import Assignments from './pages/admin/Assignments'
import Attendance from './pages/admin/Attendance'
import Sites from './pages/admin/Sites'
import Inspections from './pages/admin/Inspections'
import Issues from './pages/admin/Issues'
import Reports from './pages/admin/Reports'
import CCTV from './pages/shared/CCTV'
import Alerts from './pages/shared/Alerts'
import Notifications from './pages/shared/Notifications'

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/inspector" element={<ProtectedRoute role="inspector" />}>
        <Route element={<AppShell />}>
          <Route index element={<InspectorHome />} />
          <Route path="old-sites" element={<OldSites />} />
          <Route path="old-sites/:siteId" element={<SiteDetails />} />
          <Route path="old-sites/:siteId/inspect" element={<InspectionWizard />} />
          <Route path="new-sites" element={<NewSites />} />
          <Route path="new-sites/:siteId" element={<ProjectDetails />} />
          <Route path="new-sites/:siteId/inspect" element={<InspectionWizard />} />
          <Route path="cctv" element={<CCTV />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<AppShell />}>
          <Route index element={<AdminDashboard />} />
          <Route path="officers" element={<Officers />} />
          <Route path="officers/:officerId" element={<OfficerDetail />} />
          <Route path="sites" element={<Sites />} />
          <Route path="sites/:siteId" element={<SiteDetail />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="issues" element={<Issues />} />
          <Route path="cctv" element={<CCTV />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? `/${user.role}` : '/login'} replace />} />
    </Routes>
  )
}
