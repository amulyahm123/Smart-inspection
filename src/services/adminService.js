// Everything the Admin pages show is computed here from the data layer (dataService).
// A real backend would replace these functions (or the dataService getters under them) – the pages stay the same.
import { getInspectors, getInspections, getIssues, getSites, getAllSites, getSiteById, getUserById, getAlerts, inspectionBucket } from './dataService'
import { issueTime } from './alertService'
import { progressStatus } from '../utils/status'
import { dayOffset } from '../utils/date'

const OPEN = (i) => !['Resolved', 'Closed'].includes(i.status)
const minutes = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000))
export const durationMin = (i) => (i.checkIn && i.checkOut ? minutes(i.checkIn.time, i.checkOut.time) : 0)

// ---------- inspections ----------
const enrich = (i) => ({ ...i, site: getSiteById(i.siteId), inspector: getUserById(i.inspectorId), bucket: inspectionBucket(i), durationMin: durationMin(i) })
export const getInspectionRows = () =>
  getInspections().map(enrich).sort((a, b) => b.date.localeCompare(a.date) || a.slot.localeCompare(b.slot))
export const getInspectionsForOfficer = (id) => getInspectionRows().filter((i) => i.inspectorId === id)
export const getInspectionsForSite = (id) => getInspectionRows().filter((i) => i.siteId === id)

// ---------- attendance (from GPS check-in / check-out records) ----------
// One row per officer per day that had inspections scheduled (future ones don't count):
//   Present    = at least one inspection with a GPS check-in AND check-out
//   Incomplete = checked in but never checked out
//   Absent     = inspections were scheduled but there was no GPS check-in
export function getAttendanceRecords({ days = 30, officerId = 'all' } = {}) {
  const from = dayOffset(-days)
  const today = dayOffset(0)
  const groups = new Map()
  getInspections().forEach((i) => {
    if (i.status === 'upcoming' || i.date < from || i.date > today) return
    if (officerId !== 'all' && i.inspectorId !== officerId) return
    const key = `${i.inspectorId}|${i.date}`
    if (!groups.has(key)) groups.set(key, { id: key, officerId: i.inspectorId, date: i.date, items: [] })
    groups.get(key).items.push(i)
  })
  return [...groups.values()].map((g) => {
    const done = g.items.filter((i) => i.status === 'completed' && i.checkIn && i.checkOut)
    const stamped = g.items.filter((i) => i.checkIn)
    const status = done.length ? 'Present' : stamped.length ? 'Incomplete' : 'Absent'
    const ins = stamped.map((i) => i.checkIn.time).sort()
    const outs = done.map((i) => i.checkOut.time).sort()
    return {
      ...g, officer: getUserById(g.officerId), status,
      sites: [...new Set(g.items.map((i) => getSiteById(i.siteId).name))],
      firstIn: ins[0] || null, lastOut: outs[outs.length - 1] || null,
      minutes: done.reduce((s, i) => s + durationMin(i), 0),
      distance: stamped.length ? Math.max(...stamped.map((i) => i.checkIn.distance || 0)) : null,
      verified: stamped.length > 0 && stamped.every((i) => i.checkIn.verified),
    }
  }).sort((a, b) => b.date.localeCompare(a.date) || a.officer.name.localeCompare(b.officer.name))
}

export function summariseAttendance(records) {
  const count = (s) => records.filter((r) => r.status === s).length
  const present = count('Present')
  return {
    scheduledDays: records.length, present, incomplete: count('Incomplete'), absent: count('Absent'),
    percent: records.length ? Math.round((present / records.length) * 100) : null,
    minutes: records.reduce((s, r) => s + r.minutes, 0),
  }
}

// ---------- officers ----------
export function getOfficerStats(id) {
  const rows = getInspectionsForOfficer(id)
  const count = (b) => rows.filter((r) => r.bucket === b).length
  return {
    completed: count('completed'), pending: count('pending'), missed: count('missed'), upcoming: count('upcoming'),
    attendance: summariseAttendance(getAttendanceRecords({ officerId: id })),
    issues: getIssues().filter((i) => i.reportedBy === id),
  }
}
export const getOfficerRows = () => getInspectors().map((user) => ({ user, ...getOfficerStats(user.id) }))

// ---------- sites ----------
export const getOpenIssueCount = (siteId) => getIssues().filter((i) => i.siteId === siteId && OPEN(i)).length
// includes archived sites (site.archived) – the Sites page decides what to show
export const getSiteRows = () =>
  getAllSites().map((site) => ({ site, officer: getUserById(site.assignedOfficer), openIssues: getOpenIssueCount(site.id), ...getSiteInspectionStats(site.id) }))

export function getSiteInspectionStats(siteId) {
  const rows = getInspections().filter((i) => i.siteId === siteId)
  const count = (b) => rows.filter((r) => inspectionBucket(r) === b).length
  const done = rows.filter((r) => r.status === 'completed').map((r) => r.date).sort()
  return { completed: count('completed'), pending: count('pending'), upcoming: count('upcoming'), missed: count('missed'), lastDone: done[done.length - 1] || null }
}

// ---------- reports ----------
const countBy = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m }, {})

export function getReportData() {
  const insp = getInspections()
  const bucket = countBy(insp, inspectionBucket)
  const b = (k) => bucket[k] || 0
  const due = b('completed') + b('missed') + b('pending')
  const issues = getIssues()
  const sev = countBy(issues, (i) => i.severity)
  const cat = Object.entries(countBy(issues, (i) => i.category)).sort((x, y) => y[1] - x[1])

  const weekly = [3, 2, 1, 0].map((w) => {
    const from = dayOffset(-(w * 7 + 6))
    const to = dayOffset(-(w * 7))
    const inRange = insp.filter((i) => i.date >= from && i.date <= to)
    return { label: w === 0 ? 'Last 7 days' : w === 1 ? '8–14 days ago' : w === 2 ? '15–21 days ago' : '22–28 days ago',
      completed: inRange.filter((i) => i.status === 'completed').length, missed: inRange.filter((i) => i.status === 'missed').length }
  })

  const projects = getSites('construction').map((p) => {
    const st = progressStatus(p.expectedProgress, p.actualProgress)
    return { id: p.id, name: p.name, phase: p.phase, expected: p.expectedProgress, actual: p.actualProgress, diff: st.diff, status: st.label, tone: st.tone }
  })

  const officers = getOfficerRows().map((o) => ({
    id: o.user.id, name: o.user.name, completed: o.completed, missed: o.missed, pending: o.pending, issues: o.issues.length, attendance: o.attendance.percent,
  }))
  const attendance = summariseAttendance(getAttendanceRecords())

  return {
    inspections: { completed: b('completed'), pending: b('pending'), upcoming: b('upcoming'), missed: b('missed'), rate: due ? Math.round((b('completed') / due) * 100) : 0 },
    weekly,
    issuesBySeverity: ['Critical', 'High', 'Medium', 'Low'].map((s) => [s, sev[s] || 0]),
    issuesByCategory: cat,
    issueTotals: { total: issues.length, open: issues.filter(OPEN).length, resolved: issues.length - issues.filter(OPEN).length, recurring: issues.filter((i) => i.recurring && OPEN(i)).length },
    projects, officers, attendance,
  }
}

// ---------- recent activity (dashboard) – built from real records, so it updates as the app is used ----------
export function getRecentActivity(limit = 8) {
  const now = Date.now()
  const ev = []
  getInspections().forEach((i) => {
    const site = getSiteById(i.siteId)
    const who = getUserById(i.inspectorId)
    if (i.checkIn) ev.push({ id: `in-${i.id}`, kind: 'checkin', at: Date.parse(i.checkIn.time), text: `${who.name} checked in at ${site.name} (GPS verified)`, link: `/admin/sites/${site.id}` })
    if (i.checkOut) ev.push({ id: `out-${i.id}`, kind: 'done', at: Date.parse(i.checkOut.time), text: `${who.name} completed the inspection at ${site.name}`, link: `/admin/inspections?q=${i.id}` })
    if (i.random && i.assignedAt) ev.push({ id: `as-${i.id}`, kind: 'assign', at: Date.parse(i.assignedAt), text: `Random assignment: ${who.name} to ${site.name} on ${i.date}`, link: '/admin/assignments' })
  })
  getIssues().forEach((i) => {
    const site = getSiteById(i.siteId)
    ev.push({ id: `iss-${i.id}`, kind: 'issue', at: issueTime(i), text: `${getUserById(i.reportedBy).name} reported a ${i.severity} issue at ${site.name}: ${i.title}`, link: `/admin/alerts?alert=ISSUE-${i.id}` })
    if (i.updatedAt) ev.push({ id: `upd-${i.id}`, kind: 'status', at: Date.parse(i.updatedAt), text: `${i.id} moved to ${i.status}`, link: `/admin/alerts?alert=ISSUE-${i.id}` })
  })
  getAlerts().filter((a) => a.cameraId).forEach((a) => {
    ev.push({ id: `cc-${a.id}`, kind: 'cctv', at: a.createdAt ? Date.parse(a.createdAt) : now - a.minutesAgo * 60000, text: `CCTV alert at ${getSiteById(a.siteId).name}: ${a.detection || a.type.replace('CCTV alert – ', '')}`, link: `/admin/cctv?camera=${a.cameraId}` })
  })
  return ev.filter((e) => e.at <= now).sort((a, b) => b.at - a.at).slice(0, limit)
}
