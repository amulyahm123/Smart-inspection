// The risk calculation. PURE: same input → same output, no storage, no clock, no app imports – so it can be unit tested.
//
//   score = round( Σ points of the factors that have data  ÷  Σ weights of those factors × 100 )      (always 0–100)
//   points(factor) = weight(factor) × ratio(factor),  ratio ∈ [0, 1]
//
// A factor is one of:  scored · not-applicable (e.g. progress for an old site, a project that is not due to start) · no-data.
// Not-applicable and no-data factors are left out of BOTH sides of the fraction – missing data is never counted as "zero risk".
// The share of weight that had real data decides the data confidence (High / Medium / Low).
//
// No double counting: an issue is scored only in factor A. A missed inspection is scored only in factor B (an overdue
// visit that is already explained by a missed one is not scored again). Factor D (attendance) scores only GPS-verification
// failures and visits left without check-out; no-shows stay in B. Factor E uses the inspection RESULT, never the issue records.
import { DEFAULT_RISK_CONFIG, FREQUENCY_DAYS, FACTOR_KEYS, FACTOR_LABELS } from './riskConfig.js'

const DAY = 86400000
const toMs = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY)
export const addDays = (iso, n) => new Date(toMs(iso) + n * DAY).toISOString().slice(0, 10)
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const r1 = (x) => Math.round(x * 10) / 10
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const LEVEL_LABEL = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }
export const RECOMMENDATION = {
  high: 'Prioritise an immediate review and inspection of this site.',
  medium: 'Schedule an inspection soon.',
  low: 'Continue the normal inspection schedule.',
}
export const RECOMMENDATION_NOTE = 'Advisory only – it does not override statutory inspection schedules or administrative decisions.'

export function levelFor(score, cfg = DEFAULT_RISK_CONFIG) {
  return score <= cfg.levels.lowMax ? 'low' : score <= cfg.levels.mediumMax ? 'medium' : 'high'
}

const issueAge = (is, today) => (is.reportedAt ? Math.max(0, daysBetween(is.reportedAt.slice(0, 10), today)) : Math.max(0, is.daysAgo || 0))

// ---------- A. unresolved issues ----------
function scoreIssues({ site, issues, inspections, today }, cfg) {
  const c = cfg.issues
  const everInspected = inspections.some((i) => i.status === 'completed') || !!site.lastInspected
  if (!issues.length && !everInspected) {
    return { status: 'no-data', note: 'No issues are on record and the site has never been inspected, so its issue history is unknown.' }
  }
  const f = { unresolvedCritical: 0, unresolvedMajor: 0, unresolvedOther: 0, awaitingClosure: 0, overdueCritical: 0, overdueCriticalIssues: [], overdueOther: 0, closed: 0, totalIssues: issues.length }
  let sum = 0
  for (const is of issues) {
    const sf = c.statusFactor[is.status] === undefined ? 1 : c.statusFactor[is.status]
    if (is.status === 'Closed') f.closed += 1
    if (sf <= 0) continue
    const base = c.severityPoints[is.severity] === undefined ? c.severityPoints.Low : c.severityPoints[is.severity]
    const unresolved = sf >= 1
    let pts = base * sf
    if (!unresolved) { f.awaitingClosure += 1; sum += pts; continue }
    const age = issueAge(is, today)
    const deadline = c.deadlineDays[is.severity]
    const overdue = deadline !== undefined && age > deadline
    if (overdue) pts *= c.overdueMultiplier
    if (is.recurring) pts *= c.recurringMultiplier
    sum += pts
    if (is.severity === 'Critical') {
      f.unresolvedCritical += 1
      if (overdue) { f.overdueCritical += 1; f.overdueCriticalIssues.push({ id: is.id, title: is.title, daysOver: age - deadline, deadlineDays: deadline, reportedAt: is.reportedAt || null, daysAgo: age }) }
    } else if (is.severity === 'High') f.unresolvedMajor += 1
    else f.unresolvedOther += 1
    if (overdue && is.severity !== 'Critical') f.overdueOther += 1
  }
  const reasons = []
  if (f.unresolvedCritical) reasons.push(`${plural(f.unresolvedCritical, 'unresolved critical issue')}${f.overdueCritical ? ` (${f.overdueCritical} past the ${c.deadlineDays.Critical}-day deadline)` : ''}`)
  if (f.unresolvedMajor) reasons.push(plural(f.unresolvedMajor, 'unresolved high-severity issue'))
  if (f.unresolvedOther) reasons.push(plural(f.unresolvedOther, 'other unresolved issue'))
  if (f.awaitingClosure) reasons.push(`${plural(f.awaitingClosure, 'issue')} marked resolved but not yet closed (counted at ${Math.round(c.statusFactor.Resolved * 100)}%)`)
  return { status: 'scored', ratio: clamp01(sum / c.saturation), reasons, facts: f }
}

// ---------- B. missed / overdue inspections ----------
function scoreInspections({ site, inspections, today }, cfg) {
  const c = cfg.inspections
  if (site.projectStatus === 'not-started') return { status: 'not-applicable', note: 'The site has not started, so inspections are not due yet.' }
  if (site.projectStatus === 'on-hold') return { status: 'not-applicable', note: 'The site is on hold; inspections are paused.' }

  const from = addDays(today, -c.windowDays)
  const done = inspections.filter((i) => i.status === 'completed').map((i) => i.date).sort()
  const lastDoneRecord = done[done.length - 1] || null
  const lastSuccessful = [lastDoneRecord, site.lastInspected].filter(Boolean).sort().pop() || null
  const missedAll = inspections.filter((i) => i.status === 'missed')
  const missed = missedAll.filter((i) => i.date >= from && i.date <= today)
  const pastPending = inspections.filter((i) => i.status === 'upcoming' && i.date < today)

  const interval = FREQUENCY_DAYS[site.inspectionFrequency] || 30
  const base = lastSuccessful || site.startDate || site.registeredOn || null
  if (!base) return { status: 'no-data', note: 'There is no inspection, start or registration date to measure inspection timing from.' }

  // A visit missed / overdue AFTER the last good inspection already explains why the site is behind – don't score the gap again
  const explained = [...missedAll, ...pastPending].some((r) => !lastSuccessful || r.date > lastSuccessful)
  const due = addDays(base, interval)
  const gapLate = daysBetween(due, today)
  const gap = !explained && gapLate > 0 ? { daysLate: gapLate, due } : null

  const units = [...pastPending.map((r) => ({ daysLate: daysBetween(r.date, today) })), ...(gap ? [{ daysLate: gap.daysLate }] : [])]
  const missedShare = c.missedCurve[Math.min(missed.length, c.missedCurve.length - 1)]
  const overdueShare = units.reduce((s, u) => s + c.overdueBase + c.overdueExtra * clamp01(u.daysLate / Math.max(7, interval)), 0)
  const facts = {
    missed: missed.length, overdue: units.length, overdueDays: units.reduce((m, u) => Math.max(m, u.daysLate), 0),
    repeatedMissed: missed.length >= 2, lastSuccessfulInspection: lastSuccessful, nextDue: due, inspectionInterval: interval,
    missedDates: missed.map((m) => m.date).sort(),
  }
  const reasons = []
  if (missed.length) reasons.push(`${plural(missed.length, 'missed inspection')} in the last ${c.windowDays} days${missed.length >= 2 ? ' (repeated)' : ''}`)
  if (units.length) reasons.push(`${plural(units.length, 'overdue inspection')}${facts.overdueDays ? ` (up to ${plural(facts.overdueDays, 'day')} late)` : ''}`)
  return { status: 'scored', ratio: clamp01(missedShare + overdueShare), reasons, facts }
}

// ---------- C. project progress & delays ----------
function scoreProgress({ site, today }, cfg) {
  const c = cfg.progress
  if (site.type !== 'construction') return { status: 'not-applicable', note: 'Progress tracking applies to new projects only.' }
  if (site.projectStatus === 'completed') return { status: 'not-applicable', note: 'The project is completed.' }
  if (site.projectStatus === 'on-hold') return { status: 'not-applicable', note: 'The project is on hold, so it is not counted as behind schedule.' }
  if (site.projectStatus === 'not-started') {
    if (!site.startDate) return { status: 'no-data', note: 'The project has no start date.' }
    if (site.startDate >= today) return { status: 'not-applicable', note: 'The project is not due to start yet.' }
    const late = daysBetween(site.startDate, today)
    return {
      status: 'scored', ratio: clamp01(late / c.lateStartFullDays), reasons: [`Project should have started ${plural(late, 'day')} ago but is still marked “not started”`],
      facts: { expected: 0, actual: site.actualProgress || 0, gap: 0, pastDeadline: false, daysPastDeadline: 0, lateStartDays: late },
    }
  }
  if (typeof site.expectedProgress !== 'number' || typeof site.actualProgress !== 'number') return { status: 'no-data', note: 'Expected / actual progress is not available.' }
  const gap = site.expectedProgress - site.actualProgress
  const pastDeadline = !!site.targetDate && site.targetDate < today && site.actualProgress < 100
  const daysPast = pastDeadline ? daysBetween(site.targetDate, today) : 0
  const gapRatio = clamp01(gap / c.fullGapPoints)
  const deadlineRatio = pastDeadline ? 0.5 + 0.5 * clamp01(daysPast / c.deadlineFullDays) : 0
  const reasons = []
  if (gap > 0) reasons.push(`${gap}% behind the expected progress (actual ${site.actualProgress}% vs expected ${site.expectedProgress}%)`)
  if (pastDeadline) reasons.push(`Expected completion date passed ${plural(daysPast, 'day')} ago and the project is ${site.actualProgress}% complete`)
  return {
    status: 'scored', ratio: clamp01(c.gapShare * gapRatio + c.deadlineShare * deadlineRatio), reasons,
    facts: { expected: site.expectedProgress, actual: site.actualProgress, gap, pastDeadline, daysPastDeadline: daysPast, lateStartDays: 0 },
  }
}

// ---------- D. attendance & GPS verification ----------
function scoreAttendance({ site, inspections, gpsFailures, today }, cfg) {
  const c = cfg.attendance
  const from = addDays(today, -c.windowDays)
  const past = inspections.filter((i) => i.status !== 'upcoming' && i.date >= from && i.date <= today)
  const attended = past.filter((i) => i.status === 'completed' || i.status === 'in-progress')
  const withGps = attended.filter((i) => i.checkIn)
  const noShows = past.filter((i) => i.status === 'missed' && !i.checkIn).length
  const gpsUnavailable = attended.length - withGps.length
  const failedRecords = withGps.filter((i) => i.checkIn.verified === false || (i.checkOut && i.checkOut.verified === false)).length
  const incomplete = past.filter((i) => i.status === 'in-progress' && i.date < today && i.checkIn && !i.checkOut).length

  // A failed attempt only counts if the inspector did not manage a verified check-in the same day
  const incidents = new Set()
  for (const g of gpsFailures.filter((x) => x.siteId === site.id && x.at.slice(0, 10) >= from)) {
    const day = g.at.slice(0, 10)
    const recovered = inspections.some((i) => i.inspectorId === g.inspectorId && i.checkIn && i.checkIn.verified !== false && String(i.checkIn.time).slice(0, 10) === day)
    if (!recovered) incidents.add(`${g.inspectorId}|${day}`)
  }
  const failed = failedRecords + incidents.size
  const facts = { noShows, gpsUnavailable, failedGps: failed, incomplete, verifiedVisits: Math.max(0, withGps.length - failedRecords) }

  if (!past.length && !incidents.size) return { status: 'no-data', note: 'No attendance or GPS records exist for this site yet.' }
  if (!withGps.length && !failed && !incomplete) {
    return {
      status: 'no-data', facts,
      note: attended.length
        ? `GPS check-in records are unavailable for ${plural(attended.length, 'inspection')}; this is not treated as a violation.`
        : 'Only missed visits are on record; those absences are counted under missed inspections.',
    }
  }
  const reasons = []
  if (failed) reasons.push(`${plural(failed, 'unresolved GPS verification failure')}`)
  if (incomplete) reasons.push(`${plural(incomplete, 'inspection')} checked in but never checked out`)
  return { status: 'scored', ratio: clamp01(failed * c.failedGpsRatio + incomplete * c.incompleteRatio), reasons, facts, note: gpsUnavailable ? `${plural(gpsUnavailable, 'inspection')} had no GPS record (not scored).` : undefined }
}

// ---------- E. recent inspection findings ----------
function scoreFindings({ inspections, today }, cfg) {
  const c = cfg.findings
  const from = addDays(today, -c.windowDays)
  const withSummary = inspections.filter((i) => i.status === 'completed' && i.summary && i.date >= from && i.date <= today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, c.lastN)
  if (!withSummary.length) {
    const noRecord = inspections.filter((i) => i.status === 'completed' && !i.summary).length
    return { status: 'no-data', note: noRecord ? `${plural(noRecord, 'completed inspection')} on record without recorded findings.` : `No completed inspection with recorded findings in the last ${c.windowDays} days.` }
  }
  let num = 0, den = 0, belowGood = 0, safety = 0
  withSummary.forEach((ins, idx) => {
    const w = c.recencyWeights[Math.min(idx, c.recencyWeights.length - 1)]
    const s = c.resultScore[ins.summary.overall] || 0
    num += s * w; den += w
    if (s > 0) belowGood += 1
    const bad = Object.entries(ins.answers || {}).some(([id, v]) => (v === 'fail' || v === 'not-acceptable') && c.safetyItemPrefixes.some((p) => id.startsWith(p)))
    if (bad) safety += 1
  })
  const ratio = clamp01(num / den + (belowGood >= 2 ? c.repeatBonus : 0) + (safety ? c.safetyBonus : 0))
  const latest = withSummary[0].summary.overall
  const reasons = []
  if (latest !== 'good') reasons.push(`Latest inspection result: ${latest === 'critical' ? 'Critical' : 'Attention required'}`)
  if (belowGood >= 2) reasons.push(`${belowGood} of the last ${plural(withSummary.length, 'inspection')} rated below Good (repeated)`)
  if (safety) reasons.push(`Safety-related checklist failures in ${plural(safety, 'recent inspection')}`)
  return { status: 'scored', ratio, reasons, facts: { inspectionsConsidered: withSummary.length, belowGood, safetyFailures: safety, latestResult: latest } }
}

const SCORERS = { issues: scoreIssues, inspections: scoreInspections, progress: scoreProgress, attendance: scoreAttendance, findings: scoreFindings }

// input: { site, inspections, issues, gpsFailures, today: 'YYYY-MM-DD' }  (inspections / issues already filtered to this site)
export function calculateSiteRisk(input, cfg = DEFAULT_RISK_CONFIG) {
  const ctx = { ...input, inspections: input.inspections || [], issues: input.issues || [], gpsFailures: input.gpsFailures || [] }
  const factors = {}
  let scoredW = 0, noDataW = 0, points = 0
  for (const k of FACTOR_KEYS) {
    const r = SCORERS[k](ctx, cfg)
    const weight = cfg.weights[k]
    factors[k] = { key: k, label: FACTOR_LABELS[k], weight, status: r.status, ratio: r.status === 'scored' ? r.ratio : null, points: r.status === 'scored' ? r.ratio * weight : 0, reasons: r.reasons || [], facts: r.facts || {}, note: r.note || null }
    if (r.status === 'scored') { scoredW += weight; points += factors[k].points } else if (r.status === 'no-data') noDataW += weight
  }
  const score = scoredW > 0 ? Math.max(0, Math.min(100, Math.round((points / scoredW) * 100))) : 0
  for (const k of FACTOR_KEYS) factors[k].contribution = scoredW > 0 && factors[k].status === 'scored' ? r1((factors[k].points / scoredW) * 100) : 0
  const coverage = scoredW + noDataW > 0 ? scoredW / (scoredW + noDataW) : 0
  const confidence = scoredW === 0 ? 'low' : coverage >= cfg.confidence.high - 1e-9 ? 'high' : coverage >= cfg.confidence.medium - 1e-9 ? 'medium' : 'low'
  const level = levelFor(score, cfg)

  const reasons = []
  for (const k of FACTOR_KEYS) for (const text of factors[k].reasons) reasons.push({ factor: k, text, contribution: factors[k].contribution })
  reasons.sort((a, b) => b.contribution - a.contribution)
  const limitations = FACTOR_KEYS.filter((k) => factors[k].status === 'no-data').map((k) => `${FACTOR_LABELS[k]}: ${factors[k].note}`)
  if (scoredW === 0) limitations.push('There is not enough data to calculate a meaningful score yet.')

  const F = (k) => factors[k].facts
  const facts = {
    unresolvedCritical: F('issues').unresolvedCritical || 0, unresolvedMajor: F('issues').unresolvedMajor || 0, unresolvedOther: F('issues').unresolvedOther || 0,
    awaitingClosure: F('issues').awaitingClosure || 0, overdueCritical: F('issues').overdueCritical || 0, overdueCriticalIssues: F('issues').overdueCriticalIssues || [],
    missed: F('inspections').missed || 0, overdue: F('inspections').overdue || 0, overdueDays: F('inspections').overdueDays || 0, repeatedMissed: !!F('inspections').repeatedMissed, missedDates: F('inspections').missedDates || [],
    lastSuccessfulInspection: F('inspections').lastSuccessfulInspection || ([input.site.lastInspected].filter(Boolean)[0] || null), nextDue: F('inspections').nextDue || null,
    progress: factors.progress.status === 'scored' ? F('progress') : null,
    noShows: F('attendance').noShows || 0, gpsUnavailable: F('attendance').gpsUnavailable || 0, failedGps: F('attendance').failedGps || 0, incompleteCheckouts: F('attendance').incomplete || 0,
  }

  const top = reasons.slice(0, 3).map((r) => r.text)
  const summary = `${LEVEL_LABEL[level]} — Score ${score}/100. ` + (top.length
    ? `${cap(top.join('; '))}.`
    : scoredW === 0 ? 'There is not enough recorded data to assess this site yet.' : 'No risk factors were found in the available records.')
  return {
    siteId: input.site.id, score, level, levelLabel: LEVEL_LABEL[level], confidence, coverage: r1(coverage * 100), factors, facts, reasons, limitations, summary,
    recommendation: level !== 'high' && facts.overdueCritical > 0 ? 'A critical issue is past its resolution deadline: review and inspect this site promptly.' : RECOMMENDATION[level],
    recommendationNote: RECOMMENDATION_NOTE,
    needsImmediate: level === 'high' || facts.overdueCritical > 0, asOf: input.today,
  }
}
