import { AlertOctagon, Repeat2, ClipboardCheck, HardHat, XCircle, CalendarClock, Video, ShieldAlert } from 'lucide-react'

// Icon + colour per alert kind, and a colour per status – used everywhere alerts are shown
export const ALERT_META = {
  critical: { icon: AlertOctagon, tone: 'red' },
  recurring: { icon: Repeat2, tone: 'orange' },
  issue: { icon: ClipboardCheck, tone: 'blue' },
  delayed: { icon: HardHat, tone: 'amber' },
  missed: { icon: XCircle, tone: 'red' },
  pending: { icon: CalendarClock, tone: 'gray' },
  cctv: { icon: Video, tone: 'blue' },
  risk: { icon: ShieldAlert, tone: 'red' },
}

export const STATUS_TONE = {
  Open: 'red', Reported: 'gray', Verified: 'blue', Assigned: 'blue', 'In Progress': 'amber',
  Acknowledged: 'amber', Pending: 'amber', Resolved: 'green', Closed: 'gray',
}

export const STATUS_OPTIONS = ['Open', 'Reported', 'Verified', 'Assigned', 'In Progress', 'Acknowledged', 'Pending', 'Resolved', 'Closed']
