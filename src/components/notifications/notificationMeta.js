import { ShieldAlert, ClipboardCheck, CalendarClock, RefreshCw, AlertOctagon, XCircle, HardHat, Repeat2, CheckCircle2, Users, Video, Bell } from 'lucide-react'

export const NOTE_META = {
  assignment: { icon: ClipboardCheck, tone: 'blue', label: 'Assignment' },
  upcoming: { icon: CalendarClock, tone: 'amber', label: 'Upcoming' },
  'issue-update': { icon: RefreshCw, tone: 'blue', label: 'Issue update' },
  critical: { icon: AlertOctagon, tone: 'red', label: 'Critical issue' },
  missed: { icon: XCircle, tone: 'red', label: 'Missed' },
  delayed: { icon: HardHat, tone: 'amber', label: 'Delayed project' },
  recurring: { icon: Repeat2, tone: 'orange', label: 'Recurring' },
  'issue-resolved': { icon: CheckCircle2, tone: 'green', label: 'Resolved' },
  team: { icon: Users, tone: 'gray', label: 'Team notice' },
  cctv: { icon: Video, tone: 'blue', label: 'CCTV' },
  cancelled: { icon: XCircle, tone: 'gray', label: 'Cancelled' },
  risk: { icon: ShieldAlert, tone: 'red', label: 'Risk' },
  info: { icon: Bell, tone: 'gray', label: 'Info' },
}
