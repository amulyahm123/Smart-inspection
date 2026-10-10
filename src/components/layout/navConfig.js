import {
  Home, Building2, HardHat, Video, BellRing, Bell, UserCircle,
  LayoutDashboard, Users, FolderKanban, ClipboardCheck, AlertTriangle, BarChart3, CalendarCheck, Shuffle,
} from 'lucide-react'

// Add a page = add one line here + one <Route> in App.jsx
export const navByRole = {
  inspector: [
    { to: '/inspector', label: 'Home', icon: Home, end: true },
    { to: '/inspector/old-sites', label: 'Old Sites', icon: Building2 },
    { to: '/inspector/new-sites', label: 'New Sites', icon: HardHat },
    { to: '/inspector/cctv', label: 'CCTV', icon: Video },
    { to: '/inspector/alerts', label: 'Alerts', icon: BellRing },
    { to: '/inspector/notifications', label: 'Notifications', icon: Bell },
    { to: '/inspector/profile', label: 'Profile', icon: UserCircle },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/officers', label: 'Officers', icon: Users },
    { to: '/admin/sites', label: 'Sites / Projects', icon: FolderKanban },
    { to: '/admin/inspections', label: 'Inspections', icon: ClipboardCheck },
    { to: '/admin/assignments', label: 'Assignments', icon: Shuffle },
    { to: '/admin/issues', label: 'Issues', icon: AlertTriangle },
    { to: '/admin/cctv', label: 'CCTV', icon: Video },
    { to: '/admin/alerts', label: 'Alerts', icon: BellRing },
    { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  ],
}

// Items shown directly in the mobile bottom bar; the rest go under "More"
export const bottomCount = 4
