// ONE central alert feed. Alerts are derived live from the real data, so they can never get out of sync:
//   issues (critical / recurring / other) · delayed projects · missed + pending inspections · CCTV events.
import {
  getIssues, getSites, getInspections, getAlerts, getUserById, getSiteById, getCameraById, getRelatedIssues,
} from './dataService'
import { getRiskAlerts } from './riskService'
import { progressStatus, progressText } from '../utils/status'
import { dayOffset } from '../utils/date'

export const ALERT_TYPES = [
  { key: 'critical', label: 'Critical issue' },
  { key: 'recurring', label: 'Recurring issue' },
  { key: 'issue', label: 'Inspection issue' },
  { key: 'delayed', label: 'Delayed project' },
  { key: 'missed', label: 'Missed inspection' },
  { key: 'pending', label: 'Pending inspection' },
  { key: 'cctv', label: 'CCTV alert' },
  { key: 'risk', label: 'Risk alert' }, // admin only – built by riskService
]
const LABEL = Object.fromEntries(ALERT_TYPES.map((t) => [t.key, t.label]))

export const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }
export const isActive = (a) => !['Resolved', 'Closed'].includes(a.status)

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// Seeded issues only know "days ago": give them a stable, believable time of day
export function issueTime(issue) {
  if (issue.reportedAt) return new Date(issue.reportedAt).getTime()
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - issue.daysAgo)
  d.setMinutes(8 * 60 + (hash(issue.id) % 600))
  return d.getTime()
}

const slotStart = (date, slot) => new Date(`${date}T${slot.slice(0, 5)}:00`).getTime()
const inspectorOf = (id) => (getUserById(id) || { name: 'Unassigned' }).name

function fromIssue(i) {
  const site = getSiteById(i.siteId)
  const active = isActive(i)
  const critical = i.severity === 'Critical'
  const kind = critical ? 'critical' : i.recurring ? 'recurring' : 'issue'
  const escalated = active && i.recurring
  return {
    id: `ISSUE-${i.id}`, kind, typeLabel: LABEL[kind], types: ['issue', ...(critical ? ['critical'] : []), ...(i.recurring ? ['recurring'] : [])],
    title: i.title, siteId: i.siteId, siteName: site.name, inspectorId: i.reportedBy, inspectorName: inspectorOf(i.reportedBy),
    severity: i.severity, status: i.status, at: issueTime(i), issue: i, issueId: i.id,
    recurring: i.recurring, recurrenceCount: i.recurrenceCount || 1, escalated,
    escalationLevel: escalated ? (i.recurrenceCount >= 3 ? 'Escalate to Department Head' : 'Escalate to Supervisor') : null,
    related: getRelatedIssues(i),
  }
}

function fromProject(p) {
  const st = progressStatus(p.expectedProgress, p.actualProgress)
  return {
    id: `DELAY-${p.id}`, kind: 'delayed', typeLabel: LABEL.delayed, types: ['delayed'],
    title: `${p.name} is ${progressText(st.diff)}`, siteId: p.id, siteName: p.name,
    inspectorId: p.assignedOfficer, inspectorName: inspectorOf(p.assignedOfficer),
    severity: st.diff <= -10 ? 'High' : 'Medium', status: 'Open', at: new Date(`${p.lastInspected || p.startDate || dayOffset(0)}T10:00:00`).getTime(), dateOnly: true,
    progress: { expected: p.expectedProgress, actual: p.actualProgress, diff: st.diff, phase: p.phase },
  }
}

function fromMissed(i) {
  const site = getSiteById(i.siteId)
  return {
    id: `MISS-${i.id}`, kind: 'missed', typeLabel: LABEL.missed, types: ['missed'],
    title: `Missed inspection – ${site.name}`, siteId: i.siteId, siteName: site.name,
    inspectorId: i.inspectorId, inspectorName: inspectorOf(i.inspectorId),
    severity: 'High', status: 'Open', at: slotStart(i.date, i.slot), inspection: i,
  }
}

function fromPending(i, now) {
  const site = getSiteById(i.siteId)
  const at = slotStart(i.date, i.slot)
  return {
    id: `PEND-${i.id}`, kind: 'pending', typeLabel: LABEL.pending, types: ['pending'],
    title: `Inspection due ${i.slot} – ${site.name}`, siteId: i.siteId, siteName: site.name,
    inspectorId: i.inspectorId, inspectorName: inspectorOf(i.inspectorId),
    severity: at < now ? 'Medium' : 'Low', status: 'Pending', at, inspection: i,
  }
}

function fromCctv(a) {
  const site = getSiteById(a.siteId)
  const cam = getCameraById(a.cameraId)
  const what = a.detection || a.type.replace('CCTV alert – ', '')
  const statusLabel = { open: 'Open', pending: 'Acknowledged', resolved: 'Resolved' }[a.status]
  return {
    id: `CCTV-${a.id}`, kind: 'cctv', typeLabel: LABEL.cctv, types: ['cctv'],
    title: `${what.charAt(0).toUpperCase()}${what.slice(1)} – ${cam ? cam.name : a.cameraId}`, siteId: a.siteId, siteName: site.name,
    inspectorId: a.officerId, inspectorName: inspectorOf(a.officerId), severity: a.severity, status: statusLabel,
    at: a.createdAt ? new Date(a.createdAt).getTime() : Date.now() - a.minutesAgo * 60000, cctv: a, cameraId: a.cameraId, confidence: a.confidence,
  }
}

// Every alert, including resolved / closed ones (the page filters on status)
export function buildAlerts() {
  const now = Date.now()
  const today = dayOffset(0)
  const insp = getInspections()
  return [
    ...getIssues().map(fromIssue),
    ...getSites('construction').filter((p) => progressStatus(p.expectedProgress, p.actualProgress).label === 'Delayed').map(fromProject),
    ...insp.filter((i) => i.status === 'missed' && i.date >= dayOffset(-14)).map(fromMissed), // older misses stay in the inspection history
    ...insp.filter((i) => i.status === 'upcoming' && i.date <= today).map((i) => fromPending(i, now)),
    ...getAlerts().filter((a) => a.cameraId).map(fromCctv),
    ...getRiskAlerts(),
  ]
}

// Risk alerts are for Admin only, so an inspector's counts leave them out
export const visibleTo = (user) => (a) => !a.adminOnly || (user && user.role === 'admin')
export const getActiveAlerts = (user) => buildAlerts().filter(isActive).filter(visibleTo(user))
