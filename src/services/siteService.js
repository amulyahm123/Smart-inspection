// Rules for managing sites (Admin → Sites / Projects): validation, unique IDs, create / edit / status / archive / delete,
// officer assignment and attached files. Storage itself lives in dataService (swap that for a backend later).
// Every function that changes data checks the caller is an Admin and is async, so the pages already handle
// "loading" and "failed" states the way they would with a real server.
import {
  getSiteById, getAllSites, getUserById, getInspectors, getInspections, getIssues, inspectionBucket, pushNotification,
  nextSiteId, registerSite, patchSite, removeSite, getSiteFiles, setSiteFiles, getCameraCountForSite, getAlertCountForSite,
} from './dataService'
import { dayOffset } from '../utils/date'
import { expectedProgressFor } from '../utils/schedule'
import { FREQUENCIES, PROJECT_STATUSES, FILE_LIMITS, DOC_TYPES, projectStatusLabel } from '../data/siteOptions'
import { phases } from '../data/sites'

export class SiteError extends Error {
  constructor(message, errors = {}, extra = {}) {
    super(message)
    this.name = 'SiteError'
    this.errors = errors // { fieldName: 'message' }
    Object.assign(this, extra)
  }
}

function assertAdmin(actor) {
  if (!actor || actor.role !== 'admin') throw new SiteError('Only an Admin can manage sites.')
}

// ---------- form values ----------
export function emptySite(type = 'construction') {
  const construction = type === 'construction'
  return {
    type, name: '', projectName: '', category: '', department: '', contractor: '',
    address: '', state: '', district: '', city: '', pin: '', lat: '', lng: '', radius: '150',
    startDate: '', targetDate: '', budget: '', assignedOfficer: '', inspectionFrequency: construction ? 'weekly' : 'monthly',
    projectStatus: construction ? 'not-started' : 'completed', remarks: '',
    phase: phases[0], actualProgress: '0',
    builtYear: '', currentProgress: '', lastInspectionDate: '', lastInspectionNotes: '', pendingIssues: '', historyNotes: '',
  }
}

// An existing site → form values (for the Edit form)
export function siteToForm(site) {
  const base = emptySite(site.type)
  const legacy = site.legacy || {}
  const text = (v) => (v === undefined || v === null ? '' : String(v))
  return {
    ...base,
    ...Object.fromEntries(['type', 'name', 'projectName', 'category', 'department', 'contractor', 'address', 'state', 'district', 'city', 'pin',
      'lat', 'lng', 'radius', 'startDate', 'targetDate', 'budget', 'assignedOfficer', 'inspectionFrequency', 'projectStatus', 'remarks', 'phase', 'builtYear']
      .map((k) => [k, text(site[k] ?? base[k])])),
    actualProgress: text(site.actualProgress ?? 0),
    currentProgress: text(legacy.currentProgress), lastInspectionDate: text(legacy.lastInspectionDate || (site.custom ? site.lastInspected : '')),
    lastInspectionNotes: text(legacy.lastInspectionNotes), pendingIssues: text(legacy.pendingIssues), historyNotes: text(legacy.historyNotes),
  }
}

const trim = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v)
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

// ---------- validation (used by the form AND again by the service, so a bad request is refused either way) ----------
export function validateSite(v, { mode = 'create', id = null, pinOptional = false } = {}) {
  const e = {}
  const construction = v.type === 'construction'
  const req = (k, label) => { if (!trim(v[k])) e[k] = `${label} is required.` }

  if (!['existing', 'construction'].includes(v.type)) e.type = 'Choose the site type.'
  req('name', 'Site name')
  if (trim(v.name) && trim(v.name).length < 3) e.name = 'Site name must be at least 3 characters.'
  if (trim(v.name).length > 120) e.name = 'Site name is too long (120 characters max).'
  if (construction) { req('projectName', 'Project name'); req('contractor', 'Contractor / agency name') }
  req('category', 'Category'); req('department', 'Department')
  req('address', 'Site address'); req('state', 'State'); req('district', 'District'); req('city', 'City')
  if (!e.pin) {
    if (!trim(v.pin)) { if (!pinOptional) e.pin = 'PIN code is required.' }
    else if (!/^[1-9][0-9]{5}$/.test(String(v.pin).trim())) e.pin = 'PIN code must be 6 digits and cannot start with 0.'
  }

  const lat = num(v.lat); const lng = num(v.lng)
  if (v.lat === '' || lat === null) e.lat = 'Latitude is required.'
  else if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.lat = 'Latitude must be a number between -90 and 90.'
  if (v.lng === '' || lng === null) e.lng = 'Longitude is required.'
  else if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.lng = 'Longitude must be a number between -180 and 180.'

  const radius = num(v.radius)
  if (radius === null || !Number.isFinite(radius) || radius < 30 || radius > 1000) e.radius = 'Check-in radius must be between 30 and 1000 metres.'

  // dates: required for new projects, optional for old sites (their start date is often unknown)
  const today = dayOffset(0)
  const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T00:00:00`).getTime())
  if (construction) { req('startDate', 'Project start date'); req('targetDate', 'Expected completion date') }
  if (v.startDate && !isDate(v.startDate)) e.startDate = 'Enter a valid date.'
  if (v.targetDate && !isDate(v.targetDate)) e.targetDate = 'Enter a valid date.'
  if (!e.startDate && !e.targetDate && v.startDate && v.targetDate && v.targetDate < v.startDate) e.targetDate = 'Expected completion cannot be before the start date.'

  if (construction) {
    const b = num(v.budget)
    if (b === null) e.budget = 'Project budget is required.'
    else if (!Number.isFinite(b) || b < 0) e.budget = 'Budget must be a positive number.'
    else if (b > 1e13) e.budget = 'Budget is too large.'
    const p = num(v.actualProgress)
    if (p === null || !Number.isFinite(p) || p < 0 || p > 100) e.actualProgress = 'Progress must be between 0 and 100.'
    if (!phases.includes(v.phase)) e.phase = 'Choose the current phase.'
  } else if (trim(v.budget) !== '') {
    const b = num(v.budget)
    if (!Number.isFinite(b) || b < 0) e.budget = 'Budget must be a positive number.'
  }

  if (!v.assignedOfficer) e.assignedOfficer = 'Assign an officer.'
  else if (!getInspectors().some((u) => u.id === v.assignedOfficer)) e.assignedOfficer = 'That officer does not exist.'
  if (!FREQUENCIES.some((f) => f.value === v.inspectionFrequency)) e.inspectionFrequency = 'Choose an inspection frequency.'
  if (!PROJECT_STATUSES.some((s) => s.value === v.projectStatus)) e.projectStatus = 'Choose the site status.'

  if (!construction) {
    if (trim(v.builtYear) !== '') {
      const y = Number(v.builtYear)
      if (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear()) e.builtYear = `Enter a year between 1800 and ${new Date().getFullYear()}.`
    }
    if (v.lastInspectionDate) {
      if (!isDate(v.lastInspectionDate)) e.lastInspectionDate = 'Enter a valid date.'
      else if (v.lastInspectionDate > today) e.lastInspectionDate = 'The last inspection cannot be in the future.'
    }
    const cp = trim(v.currentProgress)
    if (cp && cp.length > 300) e.currentProgress = 'Keep this under 300 characters.'
  }
  for (const k of ['remarks', 'lastInspectionNotes', 'pendingIssues', 'historyNotes']) {
    if (trim(v[k]) && String(v[k]).length > 2000) e[k] = 'Keep this under 2000 characters.'
  }

  // duplicate guard: same name (+ type) in the same district
  if (!e.name && !e.district) {
    const dup = getAllSites().find((s) => s.id !== id && s.type === v.type && (s.district || '').toLowerCase() === trim(v.district).toLowerCase() && s.name.trim().toLowerCase() === trim(v.name).toLowerCase())
    if (dup) e.name = `A site with this name already exists in ${trim(v.district)} (${dup.id}).`
  }
  return e
}

// form values → the site fields (numbers as numbers, text trimmed, empty optional values removed)
function toFields(v) {
  const construction = v.type === 'construction'
  const f = {
    name: trim(v.name), projectName: trim(v.projectName) || '', category: v.category, department: trim(v.department), contractor: trim(v.contractor) || '',
    address: trim(v.address), state: v.state, district: trim(v.district), city: trim(v.city), pin: String(v.pin).trim(), area: trim(v.city) || trim(v.district),
    lat: Number(v.lat), lng: Number(v.lng), radius: Number(v.radius),
    startDate: v.startDate || null, targetDate: v.targetDate || null, budget: num(v.budget),
    assignedOfficer: v.assignedOfficer, inspectionFrequency: v.inspectionFrequency, projectStatus: v.projectStatus, remarks: String(v.remarks || '').trim(),
  }
  if (construction) {
    f.phase = v.phase
    f.actualProgress = Number(v.actualProgress)
  } else {
    f.builtYear = trim(v.builtYear) === '' ? null : Number(v.builtYear)
    f.legacy = {
      currentProgress: trim(v.currentProgress) || '', lastInspectionDate: v.lastInspectionDate || '',
      lastInspectionNotes: String(v.lastInspectionNotes || '').trim(), pendingIssues: String(v.pendingIssues || '').trim(), historyNotes: String(v.historyNotes || '').trim(),
    }
  }
  return f
}

// what changes automatically when the status / dates / progress of a project change
function applySchedule(site) {
  if (site.type !== 'construction') return
  if (site.projectStatus === 'completed') { site.actualProgress = 100; site.phase = phases[phases.length - 1] }
  if (site.custom || site.projectStatus === 'completed') site.expectedProgress = expectedProgressFor(site)
}

// ---------- create ----------
export async function createSite(values, actor) {
  assertAdmin(actor)
  const errors = validateSite(values)
  if (Object.keys(errors).length) throw new SiteError('Please correct the highlighted fields.', errors)

  const id = nextSiteId(values.type)
  if (getSiteById(id)) throw new SiteError(`Site ID ${id} already exists. Please try again.`, { id: 'Duplicate site ID.' })

  const f = toFields(values)
  const site = {
    id, type: values.type, ...f, custom: true, archived: false, status: f.legacy && f.legacy.pendingIssues ? 'attention' : 'good',
    lastInspected: f.legacy && f.legacy.lastInspectionDate ? f.legacy.lastInspectionDate : null,
    registeredOn: dayOffset(0), registeredBy: actor.id,
  }
  if (site.type === 'construction') { site.previousProgress = site.actualProgress; site.expectedProgress = 0 }
  applySchedule(site)
  if (!registerSite(site)) throw new SiteError('Could not save the site – the browser storage is full or unavailable.')

  notifyOfficer(site, null)
  return site
}

// ---------- edit ----------
export async function updateSite(id, values, actor) {
  assertAdmin(actor)
  const site = getSiteById(id)
  if (!site) throw new SiteError('This site no longer exists.')
  const merged = { ...values, type: site.type } // the type of a site never changes
  const errors = validateSite(merged, { mode: 'edit', id, pinOptional: !site.pin })
  if (Object.keys(errors).length) throw new SiteError('Please correct the highlighted fields.', errors)

  const f = toFields(merged)
  const previousOfficer = site.assignedOfficer
  const next = { ...site, ...f }
  // progress is reported by inspectors – keep their number unless the admin typed a different one on a project
  if (site.type === 'construction') next.actualProgress = f.actualProgress
  applySchedule(next)
  const patch = { ...f }
  if (site.type === 'construction') Object.assign(patch, { actualProgress: next.actualProgress, phase: next.phase, expectedProgress: next.expectedProgress })
  if (site.custom && site.type === 'existing' && f.legacy.lastInspectionDate && !site.lastInspected) patch.lastInspected = f.legacy.lastInspectionDate
  if (!patchSite(id, patch)) throw new SiteError('Could not save the changes – the browser storage is full or unavailable.')

  if (previousOfficer !== f.assignedOfficer) notifyOfficer(getSiteById(id), previousOfficer)
  return getSiteById(id)
}

// ---------- officer ----------
export async function assignOfficer(id, officerId, actor) {
  assertAdmin(actor)
  const site = getSiteById(id)
  if (!site) throw new SiteError('This site no longer exists.')
  if (!getInspectors().some((u) => u.id === officerId)) throw new SiteError('Choose an officer from the list.', { assignedOfficer: 'Choose an officer.' })
  if (site.assignedOfficer === officerId) return site
  const previous = site.assignedOfficer
  if (!patchSite(id, { assignedOfficer: officerId })) throw new SiteError('Could not save – the browser storage is full or unavailable.')
  notifyOfficer(getSiteById(id), previous)
  return getSiteById(id)
}

function notifyOfficer(site, previousId) {
  const freq = (FREQUENCIES.find((f) => f.value === site.inspectionFrequency) || {}).label || site.inspectionFrequency
  pushNotification({
    role: 'inspector', userId: site.assignedOfficer, kind: 'assignment', title: 'Site assigned to you',
    body: `${site.name} (${site.id}) is now your responsibility. Inspection frequency: ${freq}.`, ref: { type: 'project', id: site.id },
  })
  if (previousId && getUserById(previousId)) {
    pushNotification({
      role: 'inspector', userId: previousId, kind: 'info', title: 'Site reassigned',
      body: `${site.name} (${site.id}) has been reassigned to ${getUserById(site.assignedOfficer).name}.`, ref: { type: 'project', id: site.id },
    })
  }
}

// ---------- status ----------
export async function changeSiteStatus(id, projectStatus, actor) {
  assertAdmin(actor)
  const site = getSiteById(id)
  if (!site) throw new SiteError('This site no longer exists.')
  if (!PROJECT_STATUSES.some((s) => s.value === projectStatus)) throw new SiteError('Choose a valid status.')
  if (site.archived) throw new SiteError('Restore this archived site before changing its status.')
  if (site.projectStatus === projectStatus) return site
  const next = { ...site, projectStatus }
  applySchedule(next)
  const patch = { projectStatus }
  if (site.type === 'construction') Object.assign(patch, { actualProgress: next.actualProgress, phase: next.phase, expectedProgress: next.expectedProgress })
  if (!patchSite(id, patch)) throw new SiteError('Could not save – the browser storage is full or unavailable.')
  return getSiteById(id)
}

// ---------- related records ----------
export function getRelatedCounts(id) {
  const inspections = getInspections().filter((i) => i.siteId === id)
  return {
    inspections: inspections.length,
    openInspections: inspections.filter((i) => ['pending', 'upcoming'].includes(inspectionBucket(i))).length,
    issues: getIssues().filter((i) => i.siteId === id).length,
    cameras: getCameraCountForSite(id),
    alerts: getAlertCountForSite(id),
    files: getSiteFiles(id).length,
  }
}
export const hasRecords = (c) => c.inspections + c.issues + c.cameras + c.alerts > 0

// ---------- archive / restore / delete ----------
export const canArchive = (site) => !site.archived && ['completed', 'on-hold', 'not-started'].includes(site.projectStatus)

export async function archiveSite(id, actor) {
  assertAdmin(actor)
  const site = getSiteById(id)
  if (!site) throw new SiteError('This site no longer exists.')
  if (site.archived) return site
  if (!canArchive(site)) throw new SiteError('Only completed or inactive (on hold / not started) sites can be archived. Change the status first.')
  const c = getRelatedCounts(id)
  if (c.openInspections > 0) throw new SiteError(`This site still has ${c.openInspections} pending or upcoming inspection${c.openInspections === 1 ? '' : 's'}. Finish or cancel them before archiving.`)
  if (!patchSite(id, { archived: true, archivedAt: new Date().toISOString() })) throw new SiteError('Could not save – the browser storage is full or unavailable.')
  return getSiteById(id)
}

export async function restoreSite(id, actor) {
  assertAdmin(actor)
  const site = getSiteById(id)
  if (!site) throw new SiteError('This site no longer exists.')
  if (!patchSite(id, { archived: false, archivedAt: null })) throw new SiteError('Could not save – the browser storage is full or unavailable.')
  return getSiteById(id)
}

// A site with inspections, issues, cameras or alerts can never be deleted – it must be archived, so history is never lost.
export async function deleteSite(id, actor) {
  assertAdmin(actor)
  const site = getSiteById(id)
  if (!site) throw new SiteError('This site no longer exists.')
  const related = getRelatedCounts(id)
  if (hasRecords(related)) {
    throw new SiteError('This site has inspection history or related records, so it cannot be deleted. Archive it instead.', {}, { code: 'HAS_RECORDS', related })
  }
  if (!removeSite(id)) throw new SiteError('Could not delete – the browser storage is full or unavailable.')
}

// ---------- photos & documents ----------
export const listSiteFiles = (id) => getSiteFiles(id)

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(new Error('Could not read the file.'))
  r.readAsDataURL(file)
})

function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, FILE_LIMITS.imageMaxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', FILE_LIMITS.imageQuality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} is not a readable image.`)) }
    img.src = url
  })
}

// Turns a picked file into a stored record (photos are shrunk; PDFs must be small). Throws SiteError with a readable message.
export async function prepareFile(file, actor) {
  assertAdmin(actor)
  const isImage = file.type.startsWith('image/')
  if (!isImage && !DOC_TYPES.includes(file.type)) throw new SiteError(`${file.name}: only photos (JPG, PNG, WebP) and PDF documents are supported.`)
  if (!isImage && file.size > FILE_LIMITS.maxDocBytes) throw new SiteError(`${file.name}: PDFs must be under ${Math.round(FILE_LIMITS.maxDocBytes / 1024)} KB.`)
  if (isImage && file.size > 15 * 1024 * 1024) throw new SiteError(`${file.name}: the photo is too large.`)
  const data = isImage ? await shrinkImage(file) : await readAsDataUrl(file)
  return {
    id: `F-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: file.name.slice(0, 80), kind: isImage ? 'image' : 'doc',
    mime: isImage ? 'image/jpeg' : file.type, size: Math.round((data.length * 3) / 4), data, addedAt: new Date().toISOString(), addedBy: actor.id,
  }
}

export async function addSiteFiles(id, prepared, actor) {
  assertAdmin(actor)
  if (!getSiteById(id)) throw new SiteError('This site no longer exists.')
  const current = getSiteFiles(id)
  if (current.length + prepared.length > FILE_LIMITS.maxFiles) throw new SiteError(`A site can hold up to ${FILE_LIMITS.maxFiles} photos / documents.`)
  if (!setSiteFiles(id, [...current, ...prepared])) throw new SiteError('The browser storage is full. Remove some files or use smaller photos.')
}

export async function removeSiteFile(id, fileId, actor) {
  assertAdmin(actor)
  if (!setSiteFiles(id, getSiteFiles(id).filter((f) => f.id !== fileId))) throw new SiteError('Could not update the files.')
}

export { projectStatusLabel }
