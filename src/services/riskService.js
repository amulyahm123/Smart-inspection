// Risk scores for the app: runs the pure engine (services/risk/riskEngine.js) on the real records, stores the current score,
// the factors, the calculation time and a history of snapshots, and builds the risk alerts.
//
// WHEN scores change:  dataService calls onDataChange() after every inspection submitted / completed / scheduled, issue reported /
// resolved, site (progress, status, deadline, officer) changed and GPS failure logged → the affected site is recalculated at once.
// Time passing (a visit becoming overdue) is caught by a recalculation the first time the app is used on a new day, and Admin can
// press "Recalculate" at any time. An unchanged input (same fingerprint) is never recalculated, so nothing is done twice.
//
// STORAGE: localStorage key sih_risk_v1 (this is a front-end prototype; a backend would store the same objects in tables).
// This is a transparent rule-based score – NOT a machine-learning model.
import {
  getAllSites, getSiteById, getInspections, getIssues, getGpsFailures, onDataChange,
} from './dataService'
import { calculateSiteRisk, levelFor } from './risk/riskEngine.js'
import { DEFAULT_RISK_CONFIG, mergeRiskConfig, validateRiskConfig } from './risk/riskConfig.js'
import { dayOffset } from '../utils/date'
import { RISK_KEY } from '../utils/storageKeys'

export const MAX_HISTORY = 120
export const REASON_LABEL = {
  initial: 'First calculation', 'daily-update': 'Daily update', manual: 'Manual recalculation', 'settings-changed': 'Risk settings changed',
  'inspection-submitted': 'Inspection submitted', 'inspection-completed': 'Inspection completed', 'inspection-scheduled': 'Inspection scheduled',
  'inspection-cancelled': 'Inspection cancelled', 'issue-reported': 'New issue reported', 'issue-resolved': 'Issue resolved', 'issue-status': 'Issue status changed',
  'site-registered': 'Site registered', 'site-updated': 'Site details / progress updated', 'gps-verification': 'GPS verification recorded',
}

class RiskError extends Error {}
const assertAdmin = (actor) => { if (!actor || actor.role !== 'admin') throw new RiskError('Only an Admin can manage risk scores.') }

// ---------- state ----------
let store = { v: 1, scores: {}, history: {}, acks: {}, config: null, configUpdatedAt: 0, lastSyncDate: null }
const dirty = new Set() // sites recalculated in this tab since the last save
let lastError = null
export const getLastRiskError = () => lastError

const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h.toString(36) }

export const getRiskConfig = () => mergeRiskConfig(store.config)
const configStamp = () => hash(JSON.stringify(getRiskConfig()))

// ---------- persistence (with a merge so two open tabs never overwrite each other's scores) ----------
function readDisk() {
  try {
    const d = JSON.parse(localStorage.getItem(RISK_KEY) || 'null')
    return d && d.v === 1 ? d : null
  } catch { return null }
}
const mergeHistory = (a, b) => {
  const byId = new Map()
  ;[...a, ...b].forEach((s) => byId.set(s.id, s))
  return [...byId.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-MAX_HISTORY)
}
function mergeFromDisk(disk) {
  if (!disk) return
  for (const [id, sc] of Object.entries(disk.scores || {})) {
    const mine = store.scores[id]
    if (!dirty.has(id) && (!mine || sc.calculatedAt > mine.calculatedAt)) store.scores[id] = sc
  }
  for (const [id, h] of Object.entries(disk.history || {})) store.history[id] = mergeHistory(store.history[id] || [], h)
  for (const [k, a] of Object.entries(disk.acks || {})) if (!store.acks[k] || a.at > store.acks[k].at) store.acks[k] = a
  if ((disk.configUpdatedAt || 0) > (store.configUpdatedAt || 0)) { store.config = disk.config; store.configUpdatedAt = disk.configUpdatedAt }
}
function persistRisk() {
  mergeFromDisk(readDisk())
  dirty.clear()
  try {
    localStorage.setItem(RISK_KEY, JSON.stringify(store))
    return true
  } catch (e) { lastError = 'Risk scores could not be saved (browser storage is full or unavailable).'; return false }
}
function loadRisk() {
  const disk = readDisk()
  if (disk) store = { ...store, ...disk }
}

// ---------- input from the real records ----------
const compactInspection = (i) => ({
  id: i.id, date: i.date, status: i.status, inspectorId: i.inspectorId,
  checkIn: i.checkIn ? { time: i.checkIn.time, verified: i.checkIn.verified } : null,
  checkOut: i.checkOut ? { time: i.checkOut.time, verified: i.checkOut.verified } : null,
  summary: i.summary ? { overall: i.summary.overall, issues: i.summary.issues, critical: i.summary.critical } : null, answers: i.answers || null,
})
const compactIssue = (i) => ({ id: i.id, severity: i.severity, status: i.status, daysAgo: i.daysAgo, reportedAt: i.reportedAt || null, recurring: !!i.recurring, title: i.title })
export function buildRiskInput(site, today = dayOffset(0)) {
  return {
    today,
    site: {
      id: site.id, type: site.type, projectStatus: site.projectStatus, inspectionFrequency: site.inspectionFrequency, startDate: site.startDate || null,
      targetDate: site.targetDate || null, expectedProgress: site.expectedProgress, actualProgress: site.actualProgress, lastInspected: site.lastInspected || null,
      registeredOn: site.registeredOn || null,
    },
    inspections: getInspections().filter((i) => i.siteId === site.id).map(compactInspection),
    issues: getIssues().filter((i) => i.siteId === site.id).map(compactIssue),
    gpsFailures: getGpsFailures().filter((g) => g.siteId === site.id),
  }
}

// ---------- calculation ----------
function levelSinceOf(siteId, level, fallback) {
  const h = store.history[siteId] || []
  let since = fallback
  for (let i = h.length - 1; i >= 0 && h[i].level === level; i -= 1) since = h[i].at
  return since
}

function compute(site, reason, force = false) {
  if (!site || site.archived) return null
  const today = dayOffset(0)
  const input = buildRiskInput(site, today)
  const cfg = getRiskConfig()
  const fp = hash(JSON.stringify(input) + configStamp())
  const prev = store.scores[site.id]
  if (!force && prev && prev.fingerprint === fp) return prev // nothing changed → nothing to do

  let result
  try { result = calculateSiteRisk(input, cfg) } catch (e) { lastError = `Risk calculation failed for ${site.id}: ${e.message}`; console.error(e); return prev || null }
  const now = new Date().toISOString()
  const hist = store.history[site.id] || (store.history[site.id] = [])
  const last = hist[hist.length - 1]
  // snapshot when the score or level changed, or once per day (so a stable site still shows a flat line)
  if (!last || last.score !== result.score || last.level !== result.level || last.date !== today) {
    hist.push({
      id: `${site.id}@${now}`, at: now, date: today, score: result.score, level: result.level, confidence: result.confidence,
      reason: REASON_LABEL[reason] ? reason : 'daily-update',
      factors: Object.fromEntries(Object.values(result.factors).map((f) => [f.key, f.contribution])),
    })
    if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY)
  }
  const stored = { ...result, fingerprint: fp, calculatedAt: now, reason, configStamp: configStamp(), levelSince: levelSinceOf(site.id, result.level, now) }
  store.scores[site.id] = stored
  dirty.add(site.id)
  return stored
}

let syncing = false
// Makes sure every active site has an up-to-date score. Cheap when nothing changed (fingerprint check per site).
export function syncRisk({ force = false, reason } = {}) {
  if (syncing) return
  syncing = true
  try {
    const today = dayOffset(0)
    const newDay = store.lastSyncDate !== today
    let changed = false
    const sites = getAllSites()
    const live = new Set(sites.filter((s) => !s.archived).map((s) => s.id))
    for (const s of sites) {
      if (s.archived) continue
      const had = !!store.scores[s.id]
      const before = store.scores[s.id]
      const after = compute(s, reason || (force ? 'manual' : had ? 'daily-update' : 'initial'), force)
      if (after !== before) changed = true
    }
    for (const id of Object.keys(store.scores)) if (!live.has(id)) { delete store.scores[id]; changed = true }
    if (newDay) { store.lastSyncDate = today; changed = true }
    if (changed || force) persistRisk()
  } finally { syncing = false }
}

function onChange(siteId, reason) {
  const site = getSiteById(siteId)
  if (!site || site.archived) {
    if (store.scores[siteId]) { delete store.scores[siteId]; persistRisk() }
    return
  }
  const before = store.scores[siteId]
  const after = compute(site, reason)
  if (after !== before) persistRisk()
}
onDataChange(onChange)
loadRisk()
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === RISK_KEY) mergeFromDisk(readDisk()) })
}

// ---------- reading ----------
export function getSiteRisk(siteId) {
  syncRisk()
  return store.scores[siteId] || null
}
export function getAllRisks() {
  syncRisk()
  return getAllSites().filter((s) => !s.archived).map((site) => ({ site, risk: store.scores[site.id] || null }))
}
export const getRiskHistory = (siteId) => (store.history[siteId] || []).slice()

// Compares the current score with the previously recorded one
export function getRiskTrend(siteId) {
  const h = store.history[siteId] || []
  const cfg = getRiskConfig()
  if (h.length < 2) return { direction: 'insufficient', delta: 0, current: h[h.length - 1] || null, previous: null, since: h[0] ? h[0].date : null, count: h.length }
  const current = h[h.length - 1]
  const previous = h[h.length - 2]
  const delta = current.score - previous.score
  const direction = Math.abs(delta) < cfg.trend.stableBand ? 'stable' : delta > 0 ? 'increasing' : 'decreasing'
  return { direction, delta, current, previous, since: h[0].date, count: h.length }
}

export function getRiskSummary() {
  const rows = getAllRisks()
  const scored = rows.filter((r) => r.risk)
  const count = (lvl) => scored.filter((r) => r.risk.level === lvl).length
  return {
    total: rows.length, high: count('high'), medium: count('medium'), low: count('low'),
    immediate: scored.filter((r) => r.risk.needsImmediate).length,
    overdueInspections: scored.filter((r) => r.risk.facts.overdue > 0 || r.risk.facts.missed > 0).length,
    criticalUnresolved: scored.filter((r) => r.risk.facts.unresolvedCritical > 0).length,
    limitedData: scored.filter((r) => r.risk.confidence === 'low').length,
    lastUpdated: scored.reduce((m, r) => (r.risk.calculatedAt > m ? r.risk.calculatedAt : m), ''),
  }
}

// ---------- Admin actions ----------
export function recalculateRisk(siteId, actor) {
  assertAdmin(actor)
  if (siteId) {
    const site = getSiteById(siteId)
    if (!site) throw new RiskError('This site no longer exists.')
    compute(site, 'manual', true)
    if (!persistRisk()) throw new RiskError(lastError)
    return store.scores[siteId] || null
  }
  syncRisk({ force: true, reason: 'manual' })
  return true
}

export function saveRiskConfig(partial, actor) {
  assertAdmin(actor)
  const merged = mergeRiskConfig(partial)
  const problems = validateRiskConfig(merged)
  if (problems.length) { const e = new RiskError(problems[0]); e.problems = problems; throw e }
  store.config = { weights: merged.weights, levels: merged.levels }
  store.configUpdatedAt = Date.now()
  syncRisk({ force: true, reason: 'settings-changed' })
  return getRiskConfig()
}
export function resetRiskConfig(actor) {
  assertAdmin(actor)
  store.config = null
  store.configUpdatedAt = Date.now()
  syncRisk({ force: true, reason: 'settings-changed' })
  return getRiskConfig()
}
export { DEFAULT_RISK_CONFIG, RiskError, levelFor }

// ---------- risk alerts (used by alertService) ----------
// Every alert has a fixed id built from the condition, so the same unresolved condition can never create a second alert.
const idPart = (s) => String(s).replace(/[^a-zA-Z0-9]+/g, '-')

export function getRiskAlerts() {
  syncRisk()
  const cfg = getRiskConfig()
  const out = []
  for (const site of getAllSites()) {
    if (site.archived) continue
    const r = store.scores[site.id]
    if (!r) continue
    const base = { kind: 'risk', typeLabel: 'Risk alert', types: ['risk'], siteId: site.id, siteName: site.name, inspectorId: null, inspectorName: 'Risk monitoring', adminOnly: true, riskScore: r.score, riskLevel: r.level }

    if (r.level === 'high') {
      out.push({ ...base, id: `RISK-HIGH-${site.id}`, subtype: 'high', token: r.levelSince, severity: 'High', title: `${site.name} is High Risk (score ${r.score}/100)`, at: new Date(r.levelSince).getTime(), detail: r.summary, risk: r })
    }
    for (const c of r.facts.overdueCriticalIssues || []) {
      const issue = getIssues().find((i) => i.id === c.id)
      const at = issue && issue.reportedAt ? new Date(issue.reportedAt).getTime() + c.deadlineDays * 86400000 : Date.now() - c.daysOver * 86400000
      out.push({ ...base, id: `RISK-CRIT-${idPart(c.id)}`, subtype: 'critical-overdue', token: c.id, severity: 'Critical', title: `Critical issue unresolved ${c.daysOver} day${c.daysOver === 1 ? '' : 's'} past its ${c.deadlineDays}-day deadline – ${site.name}`, at, detail: `${c.id}: ${c.title}`, issueId: c.id, risk: r })
    }
    if (r.facts.missed >= cfg.alerts.repeatedMissed) {
      const latest = r.facts.missedDates[r.facts.missedDates.length - 1]
      out.push({ ...base, id: `RISK-MISSED-${site.id}`, subtype: 'repeated-missed', token: `${r.facts.missed}|${latest}`, severity: 'High', title: `${r.facts.missed} inspections missed recently – ${site.name}`, at: new Date(`${latest}T10:00:00`).getTime(), detail: `Missed inspection dates: ${r.facts.missedDates.join(', ')}.`, risk: r })
    }
    const spike = detectSpike(site.id, cfg)
    if (spike) {
      out.push({ ...base, id: `RISK-SPIKE-${site.id}-${idPart(spike.base.id)}`, subtype: 'spike', token: spike.base.id, severity: r.level === 'high' ? 'High' : 'Medium', title: `Risk score rose ${spike.rise} points in ${spike.days} day${spike.days === 1 ? '' : 's'} – ${site.name}`, at: new Date(spike.latest.at).getTime(), detail: `From ${spike.base.score} (${spike.base.date}) to ${spike.latest.score} (${spike.latest.date}).`, risk: r })
    }
  }
  return out.map((a) => {
    const ack = store.acks[a.id]
    const acknowledged = !!ack && ack.token === a.token
    return { ...a, status: acknowledged ? 'Acknowledged' : 'Open', acknowledgedAt: acknowledged ? ack.at : null, acknowledgedBy: acknowledged ? ack.by : null }
  })
}

// A rise of N points or more within the last M days (the lowest recent score is the starting point)
function detectSpike(siteId, cfg) {
  const h = store.history[siteId] || []
  if (h.length < 2) return null
  const latest = h[h.length - 1]
  const from = new Date(Date.now() - cfg.alerts.spikeDays * 86400000).toISOString()
  const recent = h.filter((s) => s.at >= from)
  if (recent.length < 2) return null
  const base = recent.reduce((m, s) => (s.score < m.score ? s : m), recent[0])
  const rise = latest.score - base.score
  if (rise < cfg.alerts.spikePoints || base.at >= latest.at) return null
  return { base, latest, rise, days: Math.max(1, Math.round((new Date(latest.at) - new Date(base.at)) / 86400000)) }
}

export function acknowledgeRiskAlert(alertId, actor) {
  assertAdmin(actor)
  const alert = getRiskAlerts().find((a) => a.id === alertId)
  if (!alert) throw new RiskError('This alert is no longer active.')
  store.acks[alertId] = { by: actor.id, at: new Date().toISOString(), token: alert.token }
  if (!persistRisk()) throw new RiskError(lastError)
  return { ...alert, status: 'Acknowledged' }
}
