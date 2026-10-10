// Random inspection assignment (mock engine, frontend only).
// The engine lists EVERY valid inspector + site + start-time option, then picks one at random.
// Listing first (instead of "try random things until one works") means it always finishes and never double-books.
import {
  getInspectors, getSites, getInspections, getSiteById, getUserById, addInspection, removeInspection, pushNotification,
} from './dataService'
import { dayOffset } from '../utils/date'

export const DURATIONS = [60, 90, 120] // minutes
const STEP = 30 // start times every 30 minutes inside the chosen range
export const TYPE_LABEL = { existing: 'Existing site inspection', construction: 'Construction progress inspection' }
export const STATUSES = ['Assigned', 'Upcoming', 'Completed', 'Missed']

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const two = (n) => String(n).padStart(2, '0')
const fmt = (min) => `${two(Math.floor(min / 60))}:${two(min % 60)}`
const parseSlot = (slot) => {
  const m = /^(\d\d):(\d\d) – (\d\d):(\d\d)$/.exec(slot)
  return m ? { start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]) } : null
}
// Two time windows overlap when each starts before the other ends (back-to-back is fine)
const overlaps = (a, b) => a.start < b.end && b.start < a.end

// crypto gives unpredictable numbers (Math.random as a fallback)
function rand(n) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0] % n
  }
  return Math.floor(Math.random() * n)
}
const pick = (list) => list[rand(list.length)]

// Assigned  = booked for a later day
// Upcoming  = due today (or in progress)
// Completed / Missed = outcome (a past, unfinished visit counts as Missed)
export function assignmentStatus(i) {
  const today = dayOffset(0)
  if (i.status === 'completed') return 'Completed'
  if (i.status === 'missed' || i.date < today) return 'Missed'
  if (i.status === 'in-progress' || i.date === today) return 'Upcoming'
  return 'Assigned'
}

export const describe = (i) => {
  const site = getSiteById(i.siteId)
  return { ...i, site, inspector: getUserById(i.inspectorId), type: TYPE_LABEL[site.type], assignStatus: assignmentStatus(i) }
}

export const getAssignmentHistory = () =>
  getInspections().filter((i) => i.random).map(describe).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))

export const countBookedOn = (inspectorId, date) => getInspections().filter((i) => i.inspectorId === inspectorId && i.date === date).length

export const cancelAssignment = (id) => {
  const rec = getInspections().find((i) => i.id === id)
  const ok = removeInspection(id)
  if (ok && rec) pushNotification({ role: 'inspector', userId: rec.inspectorId, kind: 'cancelled', title: 'Assignment cancelled', body: `${getSiteById(rec.siteId).name} – ${rec.date}, ${rec.slot} was cancelled.` })
  return ok
}

const fail = (reason) => ({ ok: false, reason })
let counter = 3100

// Inputs: inspectorIds, siteIds, date (YYYY-MM-DD), from / to (HH:MM), duration (minutes), skipRegular (bool)
export function generateAssignment({ inspectorIds, siteIds, date, from, to, duration = 90, skipRegular = true }) {
  const today = dayOffset(0)
  if (!inspectorIds.length) return fail('Select at least one available inspector.')
  if (!siteIds.length) return fail('Select at least one site or project.')
  if (!date) return fail('Choose a date.')
  if (date < today) return fail('The date cannot be in the past.')
  if (!from || !to) return fail('Choose a time range.')
  const rangeStart = toMin(from)
  const rangeEnd = toMin(to)
  if (rangeEnd <= rangeStart) return fail('The end time must be after the start time.')
  if (rangeEnd - rangeStart < duration) return fail(`The time range is shorter than the ${duration}-minute inspection. Widen it or shorten the duration.`)

  const now = new Date()
  const earliest = date === today ? now.getHours() * 60 + now.getMinutes() : 0
  const starts = []
  for (let s = rangeStart; s + duration <= rangeEnd; s += STEP) if (s >= earliest) starts.push(s)
  if (!starts.length) return fail('That time range has already passed today. Pick a later range or another date.')

  // everything already booked that day (only slots with a clock time can clash)
  const booked = getInspections().filter((i) => i.date === date).map((i) => ({ ...i, iv: parseSlot(i.slot) })).filter((i) => i.iv)
  const sites = getSites().filter((s) => siteIds.includes(s.id))

  const perInspector = getInspectors().filter((u) => inspectorIds.includes(u.id)).map((user) => {
    const mine = booked.filter((b) => b.inspectorId === user.id)
    const options = []
    sites.forEach((site) => {
      if (skipRegular && site.assignedOfficer === user.id) return
      const atSite = booked.filter((b) => b.siteId === site.id)
      starts.forEach((s) => {
        const iv = { start: s, end: s + duration }
        if (mine.some((b) => overlaps(iv, b.iv)) || atSite.some((b) => overlaps(iv, b.iv))) return // no overlapping visits
        options.push({ site, iv })
      })
    })
    return { user, options }
  }).filter((p) => p.options.length > 0)

  if (!perInspector.length) {
    return fail(`No selected inspector is free for any selected site in that window. Try a wider time range, more inspectors or sites${skipRegular ? ', or untick “Skip the site’s regular officer”' : ''}.`)
  }

  const chosen = pick(perInspector) // inspector first, so every free inspector has the same chance
  const { site, iv } = pick(chosen.options)
  const total = perInspector.reduce((n, p) => n + p.options.length, 0)
  counter = Math.max(counter, ...getInspections().map((i) => Number(i.id.slice(5))).filter((n) => n < 10000))
  const rec = addInspection({
    id: `INSP-${++counter}`, siteId: site.id, inspectorId: chosen.user.id, date, slot: `${fmt(iv.start)} – ${fmt(iv.end)}`,
    day: Math.round((new Date(date) - new Date(today)) / 86400000), status: 'upcoming', random: true, assignedAt: new Date().toISOString(),
  })
  pushNotification({ role: 'inspector', userId: chosen.user.id, kind: 'assignment', ref: { type: 'inspection', id: rec.id }, title: 'New inspection assignment', body: `${site.name} – ${date}, ${rec.slot}` })
  return { ok: true, assignment: describe(rec), optionsCount: total, freeInspectors: perInspector.length }
}
