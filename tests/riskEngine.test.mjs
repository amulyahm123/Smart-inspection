// Unit tests for the pure risk engine. Run: node tests/riskEngine.test.mjs
import { calculateSiteRisk, addDays } from '../src/services/risk/riskEngine.js'
import { DEFAULT_RISK_CONFIG, mergeRiskConfig, validateRiskConfig } from '../src/services/risk/riskConfig.js'

let failed = 0
const ok = (cond, msg) => { console.log(cond ? 'PASS' : 'FAIL', msg); if (!cond) { failed += 1; process.exitCode = 1 } }
const today = '2026-10-10'
const d = (n) => addDays(today, n)

const project = (o = {}) => ({ id: 'P-1', type: 'construction', projectStatus: 'in-progress', inspectionFrequency: 'weekly', startDate: d(-100), targetDate: d(100), expectedProgress: 50, actualProgress: 50, lastInspected: null, registeredOn: d(-100), ...o })
const old = (o = {}) => ({ id: 'S-1', type: 'existing', projectStatus: 'completed', inspectionFrequency: 'monthly', lastInspected: d(-5), registeredOn: d(-200), ...o })
const insp = (n, status, extra = {}) => ({ id: `I${n}${status}`, siteId: 'x', inspectorId: 'u1', date: d(n), status, slot: '10:00 – 11:00', ...extra })
const gps = (n, verified = true) => ({ time: `${d(n)}T10:05:00.000Z`, verified, distance: 20 })
const done = (n, overall = 'good', extra = {}) => insp(n, 'completed', { checkIn: gps(n), checkOut: gps(n), summary: { overall, issues: 0, critical: 0 }, answers: {}, ...extra })
const issue = (id, severity, status, daysAgo, extra = {}) => ({ id, siteId: 'x', severity, status, daysAgo, title: `${severity} ${id}`, ...extra })
const calc = (input, cfg) => calculateSiteRisk({ today, gpsFailures: [], ...input }, cfg)

// 1. New site, no history
let r = calc({ site: project({ projectStatus: 'not-started', startDate: d(10), expectedProgress: 0, actualProgress: 0, registeredOn: today }), inspections: [], issues: [] })
ok(r.score === 0 && r.level === 'low', '1. new not-started site: score 0, Low')
ok(r.confidence === 'low' && r.limitations.length >= 2, '1. new site: Low confidence + limitations listed: ' + r.limitations.length)
ok(r.factors.progress.status === 'not-applicable' && r.factors.issues.status === 'no-data', '1. not started → progress N/A (not penalised), issues = no-data (not zero)')
r = calc({ site: project({ registeredOn: today, expectedProgress: 0, actualProgress: 0, startDate: d(-1) }), inspections: [], issues: [] })
ok(r.score === 0 && r.confidence === 'low', '1b. just-registered active site: 0, Low confidence')

// 2. Multiple unresolved critical issues
r = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'Assigned', 5), issue('b', 'Critical', 'Reported', 6)] })
ok(r.facts.unresolvedCritical === 2 && r.facts.overdueCritical === 2, '2. two critical, both past 3-day deadline')
ok(r.score >= 30 && r.factors.issues.ratio === 1, '2. issues factor saturated, score=' + r.score)
const r2b = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'Assigned', 1)] })
const r2c = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Low', 'Assigned', 1)] })
ok(r2b.factors.issues.points > r2c.factors.issues.points * 5, '2. critical weighs far more than a low issue')
ok(/unresolved critical/.test(r.summary), '2. summary: ' + r.summary)

// 3. Repeated missed inspections
r = calc({ site: old({ lastInspected: d(-40) }), inspections: [insp(-10, 'missed'), insp(-20, 'missed'), insp(-30, 'missed'), done(-40)], issues: [] })
ok(r.facts.missed === 3 && r.facts.repeatedMissed && r.factors.inspections.ratio === 1, '3. three missed → inspections factor full')
const one = calc({ site: old({ lastInspected: d(-15) }), inspections: [insp(-10, 'missed'), done(-15)], issues: [] })
ok(r.factors.inspections.points > one.factors.inspections.points, '3. repeats weigh more than one miss')
ok(r.facts.overdue === 0, '3. missed visits are not ALSO counted as overdue (no double count): overdue=' + r.facts.overdue)

// 4. Delayed project deadline
r = calc({ site: project({ expectedProgress: 80, actualProgress: 50, targetDate: d(-30) }), inspections: [done(-3)], issues: [] })
ok(r.factors.progress.status === 'scored' && r.factors.progress.ratio >= 0.85, '4. far behind + past deadline → progress ratio ' + r.factors.progress.ratio.toFixed(2))
ok(r.facts.progress.pastDeadline && r.facts.progress.gap === 30, '4. facts show 30% gap and passed deadline')
const onTrack = calc({ site: project({ expectedProgress: 50, actualProgress: 55 }), inspections: [done(-3)], issues: [] })
ok(onTrack.factors.progress.ratio === 0, '4. ahead of schedule → no penalty')

// 5. Missing GPS / attendance data
r = calc({ site: old(), inspections: [insp(-5, 'completed', { summary: { overall: 'good' }, answers: {} })], issues: [] })
ok(r.factors.attendance.status === 'no-data' && /not treated as a violation/.test(r.factors.attendance.note), '5. no GPS record → no-data, not a violation')
ok(r.facts.gpsUnavailable === 1 && r.facts.noShows === 0, '5. GPS-unavailable counted separately from absence')
r = calc({ site: old(), inspections: [insp(-3, 'missed'), done(-5)], issues: [] })
ok(r.facts.noShows === 1 && r.factors.attendance.points === 0, '5b. confirmed no-show is reported separately and scored only under missed inspections')
r = calc({ site: old(), inspections: [done(-5)], issues: [], gpsFailures: [{ siteId: 'S-1', inspectorId: 'u1', at: `${d(-2)}T09:00:00.000Z` }] })
ok(r.facts.failedGps === 1 && r.factors.attendance.points > 0, '5c. unresolved GPS failure scored')
r = calc({ site: old(), inspections: [done(-2)], issues: [], gpsFailures: [{ siteId: 'S-1', inspectorId: 'u1', at: `${d(-2)}T09:00:00.000Z` }] })
ok(r.facts.failedGps === 0, '5d. failure followed by verified check-in the same day is ignored')

// 6. Resolved and verified issues
const open = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'In Progress', 2)] })
const resolved = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'Resolved', 2)] })
const closed = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'Closed', 2)] })
ok(open.factors.issues.points > resolved.factors.issues.points && resolved.factors.issues.points > closed.factors.issues.points, '6. open > resolved > closed: ' + [open, resolved, closed].map((x) => x.factors.issues.points.toFixed(1)).join(' > '))
ok(closed.factors.issues.points === 0 && closed.facts.unresolvedCritical === 0, '6. closed issue contributes nothing')

// 7 / 8. Medium → High, then back down after corrective action
const base = { site: project({ expectedProgress: 60, actualProgress: 45 }), inspections: [done(-3, 'attention')] }
const medium = calc({ ...base, issues: [issue('a', 'High', 'Assigned', 2), issue('d', 'Critical', 'Assigned', 1)] })
const high = calc({ ...base, issues: [issue('a', 'High', 'Assigned', 20), issue('b', 'Critical', 'Reported', 6), issue('c', 'Critical', 'Reported', 7)], inspections: [done(-3, 'critical'), done(-10, 'critical'), insp(-1, 'missed'), insp(-8, 'missed')] })
ok(medium.level === 'medium' && high.level === 'high', `7. Medium (${medium.score}) → High (${high.score})`)
const fixed = calc({ ...base, issues: [issue('a', 'High', 'Closed', 20), issue('b', 'Critical', 'Closed', 6), issue('c', 'Critical', 'Closed', 7)], inspections: [done(-1, 'good'), done(-3, 'critical'), done(-10, 'critical')] })
ok(fixed.score < high.score && fixed.level !== 'high', `8. after corrective action ${high.score} → ${fixed.score} (${fixed.level})`)

// Bounds, determinism, no invention
const worst = calc({ site: project({ expectedProgress: 100, actualProgress: 0, targetDate: d(-200) }), inspections: [insp(-1, 'missed'), insp(-2, 'missed'), insp(-3, 'missed'), insp(-4, 'upcoming'), done(-60, 'critical')], issues: Array.from({ length: 12 }, (_, i) => issue(`w${i}`, 'Critical', 'Reported', 40, { recurring: true })), gpsFailures: [] })
ok(worst.score >= 0 && worst.score <= 100, 'score stays within 0–100 (worst case = ' + worst.score + ')')
ok(JSON.stringify(calc({ site: old(), inspections: [done(-5)], issues: [] })) === JSON.stringify(calc({ site: old(), inspections: [done(-5)], issues: [] })), 'deterministic')
r = calc({ site: old(), inspections: [done(-5)], issues: [] })
ok(!/critical|missed|overdue/i.test(r.summary), 'summary does not mention things that do not exist: ' + r.summary)
ok(Math.abs(Object.values(r.factors).reduce((s, f) => s + f.contribution, 0) - r.score) < 1, 'factor contributions add up to the score')

// config
ok(validateRiskConfig(DEFAULT_RISK_CONFIG).length === 0, 'default config valid')
ok(validateRiskConfig(mergeRiskConfig({ weights: { issues: 50 } })).length === 1, 'weights not summing to 100 rejected')
const heavy = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'Assigned', 1)] }, mergeRiskConfig({ weights: { issues: 60, inspections: 10, progress: 10, attendance: 10, findings: 10 } }))
const light = calc({ site: old(), inspections: [done(-5)], issues: [issue('a', 'Critical', 'Assigned', 1)] })
ok(heavy.score !== light.score, 'changing weights changes the score (' + light.score + ' → ' + heavy.score + ')')
console.log(failed ? `\n${failed} FAILED` : '\nAll engine tests passed')
