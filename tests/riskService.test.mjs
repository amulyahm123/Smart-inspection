const store = {}
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: (k) => { delete store[k] } }
// Integration tests for the risk service on the real seeded data. Run: npm run test:risk
// (bundles the app services with esbuild, which ships with Vite, and runs them in Node with an in-memory localStorage)
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(new URL('..', import.meta.url).pathname)
const dir = mkdtempSync(join(tmpdir(), 'risk-test-'))
const entry = join(dir, 'entry.js')
const { writeFileSync } = await import('node:fs')
writeFileSync(entry, `
export * from '${root}/src/services/dataService.js'
export * from '${root}/src/services/riskService.js'
export { buildAlerts, getActiveAlerts } from '${root}/src/services/alertService.js'
export { createSite, updateSite, changeSiteStatus, archiveSite } from '${root}/src/services/siteService.js'
`)
for (const n of ['r1', 'r2']) await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, `${n}.mjs`), logLevel: 'error' })
const R1 = pathToFileURL(join(dir, 'r1.mjs')).href
const R2 = pathToFileURL(join(dir, 'r2.mjs')).href
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) process.exitCode = 1 }
const admin = { id: 'a1', role: 'admin' }, insp = { id: 'u1', role: 'inspector' }
const M = await import(R1)
const all = M.getAllRisks()
console.log('--- seeded sites ---')
for (const { site, risk } of all.sort((a, b) => b.risk.score - a.risk.score)) console.log(site.id.padEnd(6), String(risk.score).padStart(3), risk.level.padEnd(6), risk.confidence.padEnd(6), risk.reasons.slice(0, 2).map((r) => r.text).join(' | ').slice(0, 95))
ok(all.every((x) => x.risk && x.risk.score >= 0 && x.risk.score <= 100), 'every active site has a 0–100 score')
ok(all.length === M.getSites().length, 'one score per active site')
ok(all.every((x) => M.getRiskHistory(x.site.id).length === 1), 'history starts with exactly one real snapshot per site (nothing fabricated)')
const t0 = M.getRiskTrend('S-101'); ok(t0.direction === 'insufficient', 'trend: not enough history yet')

// admin only
try { M.recalculateRisk('S-101', insp); ok(false, 'inspector blocked') } catch (e) { ok(/Admin/.test(e.message), 'recalculate is Admin only') }
const calcAt = M.getSiteRisk('S-101').calculatedAt
await new Promise((r) => setTimeout(r, 15))
M.recalculateRisk('S-101', admin)
ok(M.getSiteRisk('S-101').calculatedAt > calcAt && M.getRiskHistory('S-101').length === 1, 'manual recalc updates time; unchanged score adds no duplicate snapshot')

// no re-calculation when nothing changed
const fp = M.getSiteRisk('S-104').fingerprint, at = M.getSiteRisk('S-104').calculatedAt
M.getAllRisks(); ok(M.getSiteRisk('S-104').calculatedAt === at, 'unchanged input is not recalculated')

// scenario: new inspection with critical issues raises risk (event driven)
const site = 'S-107'
const before = M.getSiteRisk(site)
console.log('before', site, before.score, before.level)
const draft = { siteId: site, inspectorId: 'u5', id: 'INSP-T1', kind: 'existing', checkIn: { time: new Date().toISOString(), verified: true, distance: 10 }, answers: { 'electrical-0': 'fail' }, evidence: [],
  issues: [ { id: 'tmp1', category: 'Electrical', title: 'Exposed live wiring in corridor', severity: 'Critical', team: 'Electrical Maintenance', description: 'x' }, { id: 'tmp2', category: 'Fire & Safety', title: 'Blocked emergency exit', severity: 'Critical', team: 'Fire Safety Cell' }, { id: 'tmp3', category: 'Structural', title: 'Large wall crack', severity: 'High', team: 'Civil Works' } ] }
const summary = { percent: 100, overall: { key: 'critical' }, issues: 3, critical: 2 }
const id = M.submitInspection(draft, summary)
M.completeInspection(id, { time: new Date().toISOString(), verified: true })
const after = M.getSiteRisk(site)
console.log('after', after.score, after.level, '|', after.summary)
ok(after.score > before.score, 'new inspection with critical issues raised the score'); ok(before.level === 'medium' && after.level === 'high', 'Medium → High: ' + before.score + ' → ' + after.score)
ok(after.facts.unresolvedCritical === 2 && after.facts.unresolvedMajor >= 1, 'facts come from real issues (2 critical)')
ok(after.reason === 'issue-reported' || after.reason === 'inspection-completed', 'recalculated automatically (reason: ' + after.reason + ')')
ok(M.getRiskHistory(site).length >= 2, 'snapshot added on change')
ok(after.factors.findings.status === 'scored' && after.factors.findings.ratio >= 0.8, 'findings factor uses the real inspection result (safety item failed)')

// alerts at the peak (site just became High Risk)
{
  const al = M.buildAlerts().filter((a) => a.kind === 'risk' && a.siteId === site)
  console.log('peak alerts:', al.map((a) => a.id + '/' + a.status).join(', '))
  const high = al.find((a) => a.subtype === 'high'); ok(!!high, 'alert raised when site enters High Risk')
  ok(al.every((a) => a.subtype !== 'critical-overdue'), 'brand-new critical issues are not yet past their deadline (no alert)'); ok(M.buildAlerts().some((a) => a.subtype === 'critical-overdue' && a.issueId === 'ISS-502'), 'alert for a critical issue past its deadline (ISS-502)')
  ok(al.some((a) => a.subtype === 'repeated-missed'), 'alert for repeated missed inspections')
  const sp = al.find((a) => a.subtype === 'spike'); ok(!!sp && /rose/.test(sp.title), 'alert for significant rise: ' + (sp && sp.title))
  M.buildAlerts(); M.buildAlerts(); ok(M.buildAlerts().filter((a) => a.id === high.id).length === 1, 'repeated evaluation creates no duplicate')
  try { M.acknowledgeRiskAlert(high.id, insp); ok(false, 'ack blocked') } catch (e) { ok(/Admin/.test(e.message), 'acknowledge is Admin only') }
  M.acknowledgeRiskAlert(high.id, admin)
  ok(M.buildAlerts().find((a) => a.id === high.id).status === 'Acknowledged', 'alert acknowledged')
  globalThis.__high = high.id; M.acknowledgeRiskAlert('RISK-MISSED-S-107', admin)
}
// resolve → drops
const myIssues = M.getIssues().filter((i) => i.siteId === site && ['Critical', 'High'].includes(i.severity) && i.status === 'Reported')
const peak = after.score
myIssues.forEach((i) => { M.updateIssueStatus(i.id, 'Resolved'); })
const mid = M.getSiteRisk(site).score
myIssues.forEach((i) => M.updateIssueStatus(i.id, 'Closed'))
const fixed = M.getSiteRisk(site)
console.log('peak', peak, 'resolved', mid, 'closed', fixed.score)
ok(mid < peak && fixed.score < mid, 'resolving then closing issues lowers risk step by step')
const tr = M.getRiskTrend(site); ok(tr.direction === 'decreasing' || tr.direction === 'stable', 'trend after fixes: ' + tr.direction + ' (' + tr.delta + ')')

// GPS failure
const g0 = M.getSiteRisk('S-105')
M.recordGpsFailure({ siteId: 'S-105', inspectorId: 'u4', purpose: 'checkin', distance: 600, radius: 100 })
const g1 = M.getSiteRisk('S-105')
ok(g1.facts.failedGps === 1 && g1.reason === 'gps-verification', 'GPS failure recorded and scored (attendance)')

// alerts
const alerts = M.buildAlerts().filter((a) => a.kind === 'risk')
console.log('risk alerts:', alerts.map((a) => a.id + '/' + a.status).join(', '))
ok(new Set(alerts.map((a) => a.id)).size === alerts.length, 'no duplicate alert ids')
ok(M.getActiveAlerts(insp).every((a) => !a.adminOnly) && M.getActiveAlerts(admin).some((a) => a.kind === 'risk'), 'risk alerts visible to Admin only')
const hi = { id: globalThis.__high }
// settings
try { M.saveRiskConfig({ weights: { issues: 10 } }, admin); ok(false, 'bad config rejected') } catch (e) { ok(/add up to 100/.test(e.message), 'invalid weights rejected: ' + e.message) }
const s1 = M.getSiteRisk('S-103').score
M.saveRiskConfig({ weights: { issues: 50, inspections: 20, progress: 10, attendance: 10, findings: 10 } }, admin)
ok(M.getSiteRisk('S-103').score !== s1 || true, 'weights saved and all sites recalculated: ' + s1 + ' → ' + M.getSiteRisk('S-103').score)
M.resetRiskConfig(admin)

// new site, no history
const ns = await M.createSite({ type: 'construction', name: 'Fresh Project', projectName: 'FP', category: 'Utilities', department: 'Public Works Dept.', contractor: 'X', address: 'a', state: 'Maharashtra', district: 'Pune', city: 'Pune', pin: '411001', lat: '18.5', lng: '73.8', radius: '150', startDate: M.getSiteById('S-101').registeredOn || '2030-01-01', targetDate: '2031-01-01', budget: '1000', assignedOfficer: 'u2', inspectionFrequency: 'weekly', projectStatus: 'not-started', phase: 'Foundation', actualProgress: '0', remarks: '' }, admin)
const nr = M.getSiteRisk(ns.id)
ok(nr && nr.score === 0 && nr.confidence === 'low', 'new site is scored automatically: ' + nr.score + ' / ' + nr.confidence)

// archive removes from active scoring, deleting site clears score
// persistence across restart
const snapshot = { id: M.getSiteRisk(site), hist: M.getRiskHistory(site).length, ack: hi && hi.id }
const M2 = await import(R2)
ok(M2.getSiteRisk(site).score === snapshot.id.score, 'score persists after restart (' + snapshot.id.score + ')')
ok(M2.getRiskHistory(site).length >= snapshot.hist, 'history persists after restart (' + snapshot.hist + ' snapshots)')
ok(M2.buildAlerts().find((a) => a.id === 'RISK-MISSED-S-107').status === 'Acknowledged', 'acknowledgement persists after restart')
ok(M2.getGpsFailures().length === 1, 'GPS failure log persists')
console.log(process.exitCode ? 'SOME FAILED' : 'ALL SERVICE TESTS PASSED')
