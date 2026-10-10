// The notification centre. Notifications come from two places:
//  - STORED events (dataService): new assignment, issue status update, issue resolved, CCTV alert
//  - DERIVED from the live data (so they always match it): upcoming inspection, missed inspection, delayed project,
//    critical issue, recurring issue, and "new issue assigned" for the responsible team
// Every notification carries a `link` so a click opens the relevant inspection, issue, project or alert.
import {
  getAllNotifications, getReadIds, markNotificationsRead, getInspections, getIssues, getSites, getSiteById, getUserById, inspectionBucket,
} from './dataService'
import { issueTime } from './alertService'
import { getRiskAlerts } from './riskService'
import { progressStatus, progressText } from '../utils/status'
import { sitePath } from '../utils/paths'
import { dayOffset } from '../utils/date'

const LOADED = Date.now() // stored "x minutes ago" values age from the moment the app loaded
const isOpen = (i) => !['Resolved', 'Closed'].includes(i.status)
const slotStart = (date, slot) => new Date(`${date}T${slot.slice(0, 5)}:00`).getTime()

// Where a click goes, depending on what the notification is about and who is looking
export function linkFor(ref, role) {
  if (!ref) return null
  if (ref.type === 'inspection') {
    if (role === 'admin') return `/admin/inspections?q=${ref.id}`
    const insp = getInspections().find((i) => i.id === ref.id)
    const site = insp && getSiteById(insp.siteId)
    return site ? sitePath(site) : null
  }
  if (ref.type === 'issue') return getIssues().some((i) => i.id === ref.id) ? `/${role}/alerts?alert=ISSUE-${ref.id}` : null
  if (ref.type === 'project') {
    const site = getSiteById(ref.id)
    return !site ? null : role === 'admin' ? `/admin/sites/${site.id}` : sitePath(site)
  }
  if (ref.type === 'camera') return `/${role}/cctv?camera=${ref.id}`
  return null
}

function derivedFor(user) {
  const now = Date.now()
  const today = dayOffset(0)
  const tomorrow = dayOffset(1)
  const out = []

  if (user.role === 'inspector') {
    // Upcoming inspection: yours, due today or tomorrow, not started yet
    getInspections().filter((i) => i.inspectorId === user.id && i.status === 'upcoming' && (i.date === today || i.date === tomorrow)).forEach((i) => {
      const site = getSiteById(i.siteId)
      out.push({ id: `UPC-${i.id}`, kind: 'upcoming', title: 'Upcoming inspection', body: `${site.name} – ${i.date === today ? 'today' : 'tomorrow'}, ${i.slot}`, at: Math.min(now, slotStart(i.date, i.slot) - 12 * 3600000), ref: { type: 'inspection', id: i.id } })
    })
    return out
  }

  // ----- admin -----
  getInspections().filter((i) => i.status === 'missed' && i.date >= dayOffset(-14)).forEach((i) => {
    out.push({ id: `MISSED-${i.id}`, kind: 'missed', title: 'Missed inspection', body: `${getUserById(i.inspectorId).name} missed ${getSiteById(i.siteId).name} (${i.date}, ${i.slot})`, at: slotStart(i.date, i.slot), ref: { type: 'inspection', id: i.id } })
  })
  getSites('construction').forEach((p) => {
    const st = progressStatus(p.expectedProgress, p.actualProgress)
    if (st.label === 'Delayed') out.push({ id: `DELAYED-${p.id}`, kind: 'delayed', title: 'Delayed project', body: `${p.name} is ${progressText(st.diff)}`, at: new Date(`${p.lastInspected || p.startDate || dayOffset(0)}T10:00:00`).getTime(), ref: { type: 'project', id: p.id } })
  })
  // risk alerts the Admin has not acknowledged yet
  getRiskAlerts().filter((a) => a.status === 'Open' && a.subtype !== 'spike').forEach((a) => {
    out.push({ id: `RISKN-${a.id}`, kind: 'risk', title: a.subtype === 'high' ? 'High-risk site' : 'Risk alert', body: a.title, at: a.at, ref: { type: 'project', id: a.siteId } })
  })
  getIssues().forEach((i) => {
    const site = getSiteById(i.siteId)
    if (i.severity === 'Critical' && i.daysAgo <= 30) out.push({ id: `CRIT-${i.id}`, kind: 'critical', title: 'Critical issue', body: `${site.name}: ${i.title}`, at: issueTime(i), ref: { type: 'issue', id: i.id } })
    if (i.recurring && isOpen(i)) out.push({ id: `RECUR-${i.id}`, kind: 'recurring', title: 'Recurring issue', body: `${site.name}: ${i.title} – reported ${i.recurrenceCount} times, escalation recommended`, at: issueTime(i), ref: { type: 'issue', id: i.id } })
    // The responsible team is told about every new issue assigned to it
    if (isOpen(i) && i.daysAgo <= 14) out.push({ id: `TEAM-${i.id}`, kind: 'team', audience: 'team', team: i.team, title: `New issue assigned: ${i.team}`, body: `${i.severity} · ${site.name}: ${i.title}`, at: issueTime(i), ref: { type: 'issue', id: i.id } })
  })
  return out
}

// All notifications for this user, newest first
export function getNotifications(user) {
  const read = getReadIds()
  const stored = getAllNotifications()
    .filter((n) => n.role === user.role && (n.userId === null || n.userId === user.id))
    .map((n) => ({ id: n.id, kind: n.kind || 'info', title: n.title, body: n.body, ref: n.ref, read: n.read, at: n.createdAt ? new Date(n.createdAt).getTime() : LOADED - n.minutesAgo * 60000 }))
  return [...stored, ...derivedFor(user)]
    .map((n) => ({ audience: user.role, ...n, read: n.read || read.has(n.id), link: linkFor(n.ref, user.role) }))
    .sort((a, b) => b.at - a.at)
}

export const unreadCount = (user) => getNotifications(user).filter((n) => !n.read).length
export const markRead = (id) => markNotificationsRead([id])
export const markAllRead = (user) => markNotificationsRead(getNotifications(user).map((n) => n.id))
