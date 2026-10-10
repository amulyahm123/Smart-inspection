import { dayOffset } from './date'
import { frequencyDays } from '../data/siteOptions'

const DAY = 86400000
const toMs = (iso) => new Date(`${iso}T12:00:00Z`).getTime()
const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY)

// Expected % complete today, from the project dates. A paused project does not fall behind, a finished one is 100%.
export function expectedProgressFor(site) {
  if (site.projectStatus === 'completed') return 100
  if (site.projectStatus === 'not-started') return 0
  if (site.projectStatus === 'on-hold') return Math.min(site.actualProgress || 0, 100)
  if (!site.startDate || !site.targetDate) return site.actualProgress || 0
  const total = daysBetween(site.startDate, site.targetDate)
  if (total <= 0) return 100
  const done = daysBetween(site.startDate, dayOffset(0))
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
}

// When is this site next due for an inspection? Based on its frequency and the last completed visit.
// Returns { label, tone, due } – used on the Sites list and Site details.
export function inspectionSchedule(site, lastDone) {
  if (site.archived) return { label: 'Archived', tone: 'gray', due: null }
  if (site.projectStatus === 'on-hold') return { label: 'Paused (on hold)', tone: 'amber', due: null }
  if (site.projectStatus === 'not-started') {
    return { label: site.startDate ? `Starts ${site.startDate}` : 'Not started', tone: 'gray', due: site.startDate || null }
  }
  const step = frequencyDays[site.inspectionFrequency] || 30
  const base = lastDone || site.lastInspected || site.startDate || site.registeredOn
  const due = base ? shift(base, step) : dayOffset(0)
  const late = daysBetween(due, dayOffset(0))
  if (late > 0) return { label: `Overdue by ${late} day${late === 1 ? '' : 's'}`, tone: 'red', due }
  if (late === 0) return { label: 'Due today', tone: 'amber', due }
  return { label: `Due in ${-late} day${late === -1 ? '' : 's'}`, tone: 'green', due }
}

function shift(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
