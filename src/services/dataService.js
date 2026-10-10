// The ONLY place that reads mock data. Swap these functions for Firebase calls later.
import { users } from '../data/users'
import { sites as rawSites } from '../data/sites'
import { inspections as rawInspections } from '../data/inspections'
import { issues as rawIssues } from '../data/issues'
import { cameras } from '../data/cameras'
import { alerts } from '../data/alerts'
import { notifications, activity } from '../data/notifications'
import { siteMeta } from '../data/siteMeta'
import { cameraAlertTypes } from '../data/cameraAlertTypes'
import { dayOffset } from '../utils/date'
import { portablePhoto } from './evidenceService'
import { DATA_KEY, DRAFT_KEY, SITES_KEY, SITE_FILES_KEY, RISK_KEY, GPS_LOG_KEY } from '../utils/storageKeys'

const sites = rawSites.map((s) => ({
  ...s,
  ...(siteMeta[s.id] || {}),
  lastInspected: dayOffset(s.lastInspected),
  ...(s.type === 'construction' ? { startDate: dayOffset(s.startDate), targetDate: dayOffset(s.targetDate) } : {}),
  // Site-management fields (Admin can change these). Starting data: operational sites are "completed", projects "in progress".
  projectStatus: s.type === 'construction' ? (s.actualProgress >= 100 ? 'completed' : 'in-progress') : 'completed',
  inspectionFrequency: s.type === 'construction' ? 'weekly' : 'monthly',
  state: 'Maharashtra', district: 'Pune', city: s.area, // all starting sites are in Pune district (PIN codes are not in the starting data)
  archived: false,
}))
const inspections = rawInspections.map((i) => ({
  ...i, date: dayOffset(i.day),
  ...(i.random ? { assignedAt: new Date(`${dayOffset(i.day - 2)}T09:00:00`).toISOString() } : {}),
}))

// Mock GPS attendance: completed (and in-progress) seeded inspections get a check-in / check-out record,
// the same shape the app writes when an inspector really checks in. A backend would store these instead.
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
function seedGps(i) {
  if (i.checkIn !== undefined || !['completed', 'in-progress'].includes(i.status) || !i.slot.includes(' – ')) return
  const site = sites.find((x) => x.id === i.siteId)
  const [start, end] = i.slot.split(' – ')
  const h = hash(i.id)
  const at = (hhmm, deltaMin) => new Date(new Date(`${i.date}T${hhmm}:00`).getTime() + deltaMin * 60000).toISOString()
  const point = (n, time) => {
    const r = 12 + (hash(i.id + n) % Math.max(20, Math.floor(site.radius * 0.6)))
    const a = (hash(i.id + n + 'a') % 360) * (Math.PI / 180)
    return { time, lat: site.lat + (r * Math.cos(a)) / 111320, lng: site.lng + (r * Math.sin(a)) / (111320 * Math.cos(site.lat * Math.PI / 180)), distance: r, accuracy: 6 + (h % 9), source: 'device', verified: true }
  }
  i.checkIn = point('in', at(start, h % 9))
  i.checkOut = i.status === 'completed' ? point('out', at(end, -(h % 14))) : null
}
inspections.forEach(seedGps)
const issues = rawIssues
let alertCounter = Math.max(...alerts.map((a) => Number(a.id.slice(3))))
const nextAlertId = () => `AL-${++alertCounter}`
const OPEN_ISSUE = (i) => !['Resolved', 'Closed'].includes(i.status)

// ---------- change notifications (the risk engine listens to these) ----------
// Every function that changes inspections, issues, sites or GPS records calls emitChange(siteId, reason) AFTER the change is saved.
const listeners = new Set()
export const onDataChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
function emitChange(siteId, reason) {
  listeners.forEach((fn) => { try { fn(siteId, reason) } catch (e) { console.error('data change listener failed', e) } })
}

export const getUsers = () => users
export const getUserById = (id) => users.find((u) => u.id === id)
// getSites = the ACTIVE sites (what inspectors, the assignment engine and alerts work with). Archived sites are hidden here
// but still found by getSiteById, so old inspections / issues that point at them keep working. Admin → Sites uses getAllSites.
export const getSites = (type) => sites.filter((s) => !s.archived && (!type || s.type === type))
export const getAllSites = () => sites
export const getSiteById = (id) => sites.find((s) => s.id === id)
export const getInspections = () => inspections
export const getIssues = () => issues
export const getCameras = () => cameras
export const getAlerts = () => alerts // raw CCTV alerts; use alertService for the full alert feed
export const getActivity = () => activity
export const getAllNotifications = () => notifications
export const getInspectors = () => users.filter((u) => u.role === 'inspector')

export function getNotifications(user) {
  return notifications.filter((n) => n.role === user.role && (n.userId === null || n.userId === user.id))
}


export function getInspectorSummary(userId) {
  const today = dayOffset(0)
  const mine = inspections.filter((i) => i.inspectorId === userId)
  const mySiteIds = sites.filter((s) => s.assignedOfficer === userId).map((s) => s.id)
  return {
    assigned: mine.length,
    today: mine.filter((i) => i.date === today),
    pending: mine.filter((i) => ['upcoming', 'in-progress'].includes(i.status)),
    completed: mine.filter((i) => i.status === 'completed'),
    criticalIssues: issues.filter((i) => mySiteIds.includes(i.siteId) && i.severity === 'Critical' && OPEN_ISSUE(i)),
  }
}

// completed | missed | upcoming (future date) | pending (due today / overdue / in progress)
export function inspectionBucket(i) {
  if (i.status === 'completed') return 'completed'
  if (i.status === 'missed') return 'missed'
  if (i.status === 'in-progress') return 'pending'
  return i.date > dayOffset(0) ? 'upcoming' : 'pending'
}

export function addInspection(rec) {
  inspections.push(rec)
  persist()
  emitChange(rec.siteId, 'inspection-scheduled')
  return rec
}

// Only engine-made assignments that haven't started can be cancelled
export function removeInspection(id) {
  const idx = inspections.findIndex((i) => i.id === id)
  const rec = inspections[idx]
  if (!rec || !rec.random || rec.status !== 'upcoming' || rec.checkIn) return false
  inspections.splice(idx, 1)
  persist()
  emitChange(rec.siteId, 'inspection-cancelled')
  return true
}

export function pushNotification(n) {
  notifications.unshift({ id: `N-${notifications.length + 1}-x`, minutesAgo: 0, read: false, userId: null, createdAt: new Date().toISOString(), ...n })
  persist()
}

export function getAdminSummary() {
  return {
    totalProjects: sites.filter((s) => !s.archived).length,
    activeOfficers: getInspectors().length,
    completed: inspections.filter((i) => i.status === 'completed').length,
    pending: inspections.filter((i) => inspectionBucket(i) === 'pending').length,
    upcoming: inspections.filter((i) => inspectionBucket(i) === 'upcoming').length,
    missed: inspections.filter((i) => i.status === 'missed').length,
    openIssues: issues.filter(OPEN_ISSUE).length,
    criticalIssues: issues.filter((i) => i.severity === 'Critical' && OPEN_ISSUE(i)).length,
    resolvedIssues: issues.filter((i) => ['Resolved', 'Closed'].includes(i.status)).length,
  }
}

// ---------- Site helpers ----------
export const getInspectionsForSite = (siteId) =>
  inspections.filter((i) => i.siteId === siteId).sort((a, b) => b.date.localeCompare(a.date))
export const getIssuesForSite = (siteId) => issues.filter((i) => i.siteId === siteId)
export const siteAge = (site) => (site.builtYear ? new Date().getFullYear() - site.builtYear : null)
export const siteAgeText = (site) => (site.builtYear ? `${siteAge(site)} years (built ${site.builtYear})` : 'Not recorded')

// Recurring issue detection: same site + category, still unresolved, and sharing a keyword.
const STOP = ['near', 'area', 'with', 'from', 'main', 'that', 'this', 'side', 'block', 'level']
const words = (t) => t.toLowerCase().split(/[^a-z]+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length >= 4 && !STOP.includes(w))
const sameProblem = (a, b) => a.siteId === b.siteId && a.category === b.category &&
  words(`${a.title} ${a.item || ''}`).some((w) => words(`${b.title} ${b.item || ''}`).includes(w))

export const getRelatedIssues = (issue) => issues.filter((j) => j.id !== issue.id && sameProblem(issue, j))

// An issue is "recurring" when the same problem was reported 2+ times at the same site (any status).
function refreshRecurrence() {
  issues.forEach((i) => {
    i.recurrenceCount = issues.filter((j) => sameProblem(i, j)).length
    i.recurring = i.recurrenceCount >= 2
  })
}

export function findRecurring(siteId, category, text) {
  const target = words(text)
  if (!target.length) return null
  return issues.find((i) =>
    i.siteId === siteId && OPEN_ISSUE(i) && i.category === category &&
    words(`${i.title} ${i.item || ''}`).some((w) => target.includes(w))
  ) || null
}

// ---------- Saving an inspection (in-memory for the prototype; replace with Firestore later) ----------
let issueCounter = 600
const nextIssueId = () => `ISS-${++issueCounter}`

// Called on "Submit": stores issues + the inspection (still "in-progress" until GPS check-out).
export function submitInspection(draft, summary) {
  const today = dayOffset(0)
  const idMap = {}
  draft.issues.forEach((is) => {
    const id = nextIssueId()
    idMap[is.id] = id
    issues.push({
      id, siteId: draft.siteId, category: is.category, title: is.title, severity: is.severity, status: 'Reported',
      reportedBy: draft.inspectorId, daysAgo: 0, team: is.team, recurring: is.recurring, description: is.description,
      location: is.location, item: is.item, escalated: is.escalate, inspectionId: draft.id, reportedAt: new Date().toISOString(),
    })
  })
  refreshRecurrence()
  const evidence = draft.evidence.map((e) =>
    e.link.type === 'issue' ? { ...e, link: { ...e.link, ref: idMap[e.link.ref] || e.link.ref } } : e)

  const details = {
    status: 'in-progress', kind: draft.kind, checkIn: draft.checkIn, checkOut: null, answers: draft.answers, evidence,
    issueIds: Object.values(idMap), summary: { percent: summary.percent, overall: summary.overall.key, issues: summary.issues, critical: summary.critical },
    ...(draft.kind === 'construction' ? {
      progress: { phase: draft.progress.phase, actual: draft.progress.actual, notes: draft.progress.notes, expected: summary.progress.expected, diff: summary.progress.diff, status: summary.progress.status },
      quality: summary.quality.label,
    } : {}),
  }
  const scheduled = inspections.find((i) => i.siteId === draft.siteId && i.inspectorId === draft.inspectorId && i.date === today && i.status === 'upcoming')
  if (scheduled) {
    Object.assign(scheduled, details)
    persist()
    emitChange(draft.siteId, draft.issues.length ? 'issue-reported' : 'inspection-submitted')
    return scheduled.id
  }
  const rec = { id: draft.id, siteId: draft.siteId, inspectorId: draft.inspectorId, day: 0, date: today, slot: 'Walk-in', ...details }
  inspections.push(rec)
  persist()
  emitChange(draft.siteId, draft.issues.length ? 'issue-reported' : 'inspection-submitted')
  return rec.id
}

// Called on "Check out": inspection becomes completed and the site's status/last-inspected update.
export function completeInspection(recordId, checkOut) {
  const rec = inspections.find((i) => i.id === recordId)
  if (!rec) return
  rec.status = 'completed'
  rec.checkOut = checkOut
  const site = sites.find((s) => s.id === rec.siteId)
  if (site) {
    site.lastInspected = dayOffset(0)
    site.status = rec.summary.overall
    if (rec.progress) {
      site.previousProgress = site.actualProgress
      site.actualProgress = rec.progress.actual
      site.phase = rec.progress.phase
    }
  }
  persist()
  emitChange(rec.siteId, 'inspection-completed')
}

// ---------- CCTV (simulated) ----------
export const getCameraById = (id) => cameras.find((c) => c.id === id)

// A camera is "in alert" while it has an open or acknowledged (pending) alert
export const getCameraAlert = (cameraId) => alerts.find((a) => a.cameraId === cameraId && a.status !== 'resolved') || null

export function getCameraStats() {
  const offline = cameras.filter((c) => c.status === 'offline').length
  return {
    total: cameras.length, offline, live: cameras.length - offline,
    alerts: cameras.filter((c) => c.status !== 'offline' && getCameraAlert(c.id)).length,
  }
}

// Minutes since an alert was raised (new alerts carry a timestamp, seeded ones a fixed age)
export const alertAge = (a) => (a.createdAt ? Math.max(0, Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60000)) : a.minutesAgo)

// Simulates the camera's AI raising a detection. It shows up in Ongoing / Pending Alerts and in notifications.
export function triggerCameraAlert(cameraId, typeKey) {
  const cam = getCameraById(cameraId)
  const type = cameraAlertTypes.find((t) => t.key === typeKey) || cameraAlertTypes[0]
  if (!cam || cam.status === 'offline' || getCameraAlert(cameraId)) return null
  const site = getSiteById(cam.siteId)
  const alert = {
    id: nextAlertId(), type: `CCTV alert – ${type.label}`, severity: type.severity, siteId: cam.siteId, officerId: site.assignedOfficer,
    category: 'CCTV', status: 'open', minutesAgo: 0, createdAt: new Date().toISOString(),
    cameraId, detection: type.label, confidence: 88 + Math.floor(Math.random() * 11),
  }
  alerts.unshift(alert)
  const body = `${type.label} – ${cam.name}, ${site.name}`
  notifications.unshift({ id: `N-${notifications.length + 1}-a`, role: 'admin', userId: null, title: 'CCTV alert', body, minutesAgo: 0, read: false, kind: 'cctv', ref: { type: 'camera', id: cameraId }, createdAt: new Date().toISOString() })
  notifications.unshift({ id: `N-${notifications.length + 1}-i`, role: 'inspector', userId: site.assignedOfficer, title: 'CCTV alert at your site', body, minutesAgo: 0, read: false, kind: 'cctv', ref: { type: 'camera', id: cameraId }, createdAt: new Date().toISOString() })
  persist()
  return alert
}

// status: 'open' | 'pending' (acknowledged) | 'resolved'
export function updateAlertStatus(alertId, status) {
  const a = alerts.find((x) => x.id === alertId)
  if (a) a.status = status
  persist()
  return a
}

// ---------- Issue lifecycle (admin) ----------
export const ISSUE_FLOW = ['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Closed']
export const getIssueById = (id) => issues.find((i) => i.id === id)

export function updateIssueStatus(issueId, status) {
  const issue = getIssueById(issueId)
  if (!issue || !ISSUE_FLOW.includes(status) || issue.status === status) return issue
  issue.status = status
  issue.updatedAt = new Date().toISOString()
  const site = sites.find((x) => x.id === issue.siteId)
  notifications.unshift({ id: `N-${notifications.length + 1}-u`, role: 'inspector', userId: issue.reportedBy, title: 'Issue update', body: `${issue.id} “${issue.title}” moved to ${status}.`, minutesAgo: 0, read: false, kind: 'issue-update', ref: { type: 'issue', id: issue.id }, createdAt: new Date().toISOString() })
  if (status === 'Resolved') {
    notifications.unshift({ id: `N-${notifications.length + 1}-r`, role: 'admin', userId: null, title: 'Issue resolved', body: `${issue.id} resolved at ${site ? site.name : issue.siteId}.`, minutesAgo: 0, read: false, kind: 'issue-resolved', ref: { type: 'issue', id: issue.id }, createdAt: new Date().toISOString() })
  }
  persist()
  emitChange(issue.siteId, status === 'Resolved' || status === 'Closed' ? 'issue-resolved' : 'issue-status')
  return issue
}

// ---------- Saving in the browser (localStorage) ----------
// The prototype has no server, so changes (submitted inspections, issues, alert + status updates, notifications)
// are kept in the browser and survive a refresh. A real backend would replace persist() and restore().
// ids of notifications the user has opened / marked read (stored and derived ones alike)
const readIds = new Set()
export const getReadIds = () => readIds
export function markNotificationsRead(ids) {
  ids.forEach((id) => readIds.add(id))
  persist()
}

const shiftDate = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function persist() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify({
      v: 2, savedOn: dayOffset(0), readIds: [...readIds],
      inspections: inspections.map((i) => (i.evidence ? { ...i, evidence: i.evidence.map(portablePhoto) } : i)),
      issues, alerts, notifications,
      sites: sites.map((x) => ({ id: x.id, status: x.status, lastInspected: x.lastInspected, phase: x.phase, actualProgress: x.actualProgress, previousProgress: x.previousProgress })),
    }))
  } catch { /* storage full or unavailable: the app keeps working in memory */ }
}

// ---------- Site registry (Admin → Sites / Projects) ----------
// Sites the Admin registers are stored in full under SITES_KEY. Admin edits to the starting sites are stored as small patches.
// (inspection results – health status, last inspected, progress – still live in DATA_KEY as before.)
// A backend would replace registerSite / patchSite / removeSite / the file helpers; siteService.js (rules + validation) stays.
export const ADMIN_SITE_FIELDS = [
  'name', 'projectName', 'area', 'category', 'department', 'contractor', 'address', 'state', 'district', 'city', 'pin',
  'lat', 'lng', 'radius', 'startDate', 'targetDate', 'budget', 'assignedOfficer', 'inspectionFrequency', 'projectStatus',
  'remarks', 'builtYear', 'archived', 'archivedAt', 'legacy', 'phase', 'actualProgress', 'expectedProgress',
]
const customIds = new Set() // sites registered by the Admin
const editedIds = new Set() // starting sites the Admin has edited
const deletedIds = new Set() // starting sites the Admin deleted
const counters = { S: 0, P: 0 }

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

function persistSites() {
  try {
    localStorage.setItem(SITES_KEY, JSON.stringify({
      v: 1, counters,
      custom: sites.filter((x) => customIds.has(x.id)),
      patches: Object.fromEntries(sites.filter((x) => editedIds.has(x.id) && !customIds.has(x.id)).map((x) => [x.id, pick(x, ADMIN_SITE_FIELDS)])),
      deleted: [...deletedIds],
    }))
    return true
  } catch { return false }
}

function restoreSites() {
  try {
    const raw = localStorage.getItem(SITES_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (d.v !== 1) return
    Object.assign(counters, d.counters || {})
    ;(d.deleted || []).forEach((id) => {
      const i = sites.findIndex((x) => x.id === id)
      if (i >= 0) sites.splice(i, 1)
      deletedIds.add(id)
    })
    Object.entries(d.patches || {}).forEach(([id, patch]) => {
      const site = sites.find((x) => x.id === id)
      if (site) { Object.assign(site, patch); editedIds.add(id) }
    })
    ;(d.custom || []).forEach((site) => {
      if (!sites.some((x) => x.id === site.id)) sites.push(site)
      customIds.add(site.id)
    })
  } catch { /* unreadable save: keep the starting sites */ }
}

export const isCustomSite = (id) => customIds.has(id)

// "S-109" / "P-206": next free number for the prefix. Counters never go back, so a deleted ID is never handed out again.
export function nextSiteId(type) {
  const prefix = type === 'construction' ? 'P' : 'S'
  const used = sites.filter((x) => x.id.startsWith(`${prefix}-`)).map((x) => Number(x.id.slice(2))).filter(Number.isFinite)
  return `${prefix}-${Math.max(counters[prefix], ...used, deletedMax(prefix)) + 1}`
}
const deletedMax = (prefix) => Math.max(0, ...[...deletedIds].filter((id) => id.startsWith(`${prefix}-`)).map((id) => Number(id.slice(2))).filter(Number.isFinite))

// Each of these returns false when the browser refused to store the data (nothing is kept in that case)
export function registerSite(site) {
  if (sites.some((x) => x.id === site.id)) return false
  sites.push(site)
  customIds.add(site.id)
  const prefix = site.id[0]
  const before = counters[prefix]
  counters[prefix] = Math.max(counters[prefix], Number(site.id.slice(2)) || 0)
  if (persistSites()) { emitChange(site.id, 'site-registered'); return true }
  sites.pop(); customIds.delete(site.id); counters[prefix] = before
  return false
}

export function patchSite(id, fields) {
  const site = sites.find((x) => x.id === id)
  if (!site) return false
  const before = { ...site }
  const wasEdited = editedIds.has(id)
  Object.assign(site, fields)
  editedIds.add(id)
  if (persistSites()) { persist(); emitChange(id, 'site-updated'); return true }
  Object.keys(site).forEach((k) => { if (!(k in before)) delete site[k] })
  Object.assign(site, before)
  if (!wasEdited) editedIds.delete(id)
  return false
}

export function removeSite(id) {
  const i = sites.findIndex((x) => x.id === id)
  if (i < 0) return false
  const [gone] = sites.splice(i, 1)
  const wasCustom = customIds.delete(id)
  if (!wasCustom) deletedIds.add(id)
  editedIds.delete(id)
  if (persistSites()) { deleteAllSiteFiles(id); persist(); emitChange(id, 'site-removed'); return true }
  sites.splice(i, 0, gone)
  if (wasCustom) customIds.add(id)
  else deletedIds.delete(id)
  return false
}

// Photos / documents attached to a site: { [siteId]: [{ id, name, kind: 'image'|'doc', mime, size, data, addedAt, addedBy }] }
function readFiles() {
  try { return JSON.parse(localStorage.getItem(SITE_FILES_KEY) || '{}') || {} } catch { return {} }
}
export const getSiteFiles = (siteId) => readFiles()[siteId] || []
export function setSiteFiles(siteId, files) {
  const all = readFiles()
  if (files.length) all[siteId] = files
  else delete all[siteId]
  try { localStorage.setItem(SITE_FILES_KEY, JSON.stringify(all)); return true } catch { return false }
}
function deleteAllSiteFiles(siteId) { setSiteFiles(siteId, []) }
export const getCameraCountForSite = (siteId) => cameras.filter((c) => c.siteId === siteId).length
export const getAlertCountForSite = (siteId) => alerts.filter((a) => a.siteId === siteId).length

// ---------- GPS verification failures ----------
// The inspection screens block a check-in that is outside the site radius, so nothing was stored. We now keep a small
// log of those attempts (who, where, how far) – the risk engine only counts one that was not followed by a verified check-in.
const gpsFailures = []
export const getGpsFailures = () => gpsFailures
export function recordGpsFailure({ siteId, inspectorId, purpose, distance, radius }) {
  const entry = { id: `GF-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, siteId, inspectorId, purpose: purpose || 'checkin', distance: Math.round(distance), radius, at: new Date().toISOString() }
  gpsFailures.push(entry)
  if (gpsFailures.length > 300) gpsFailures.splice(0, gpsFailures.length - 300)
  try { localStorage.setItem(GPS_LOG_KEY, JSON.stringify(gpsFailures)) } catch { /* keep in memory */ }
  emitChange(siteId, 'gps-verification')
  return entry
}
function restoreGpsFailures() {
  try {
    const list = JSON.parse(localStorage.getItem(GPS_LOG_KEY) || '[]')
    if (Array.isArray(list)) gpsFailures.splice(0, gpsFailures.length, ...list.filter((g) => g && g.siteId && g.at))
  } catch { /* ignore */ }
}

// On the next visit the saved data replaces the starting data. If days have passed, relative dates are shifted
// forward so "today's inspections" and "3 days ago" still make sense.
function restore() {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    const delta = Math.round((new Date(`${dayOffset(0)}T12:00:00Z`) - new Date(`${d.savedOn}T12:00:00Z`)) / 86400000)
    if (d.v !== 2 || !(delta >= 0)) return
    const minutes = delta * 1440
    inspections.splice(0, inspections.length, ...d.inspections.map((i) => ({ ...i, date: shiftDate(i.date, delta) })))
    issues.splice(0, issues.length, ...d.issues.map((i) => (i.reportedAt
      ? { ...i, daysAgo: Math.floor((Date.now() - new Date(i.reportedAt).getTime()) / 86400000) }
      : { ...i, daysAgo: i.daysAgo + delta })))
    alerts.splice(0, alerts.length, ...d.alerts.map((a) => (a.createdAt ? a : { ...a, minutesAgo: a.minutesAgo + minutes })))
    notifications.splice(0, notifications.length, ...d.notifications.map((n) => ({ ...n, minutesAgo: n.minutesAgo + minutes })))
    d.sites.forEach((x) => {
      const site = sites.find((y) => y.id === x.id)
      if (site) Object.assign(site, x, { lastInspected: x.lastInspected && !customIds.has(x.id) ? shiftDate(x.lastInspected, delta) : x.lastInspected || null })
    })
    readIds.clear()
    ;(d.readIds || []).forEach((id) => readIds.add(id))
    issueCounter = Math.max(issueCounter, ...issues.map((i) => Number(i.id.slice(4))).filter((n) => n > 600 && n < 10000))
    alertCounter = Math.max(alertCounter, ...alerts.map((a) => Number(a.id.slice(3))).filter(Number.isFinite))
  } catch { /* unreadable save: keep the starting data */ }
}

// Back to the starting data (also clears an unfinished inspection) and reload the page
export function resetDemoData() {
  try {
    localStorage.removeItem(DATA_KEY)
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(SITES_KEY)
    localStorage.removeItem(SITE_FILES_KEY)
    localStorage.removeItem(RISK_KEY)
    localStorage.removeItem(GPS_LOG_KEY)
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.location.reload()
}

restoreGpsFailures()
restoreSites() // admin-registered sites first, so saved inspections / progress can be applied to them
restore()
refreshRecurrence()
