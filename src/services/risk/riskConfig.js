// Risk-score settings. Pure data + validation (no imports) so the engine can be tested with plain Node.
// Everything the Admin may tune is here; the engine reads ONLY this object, nothing is hard-coded in the formulas.

export const FREQUENCY_DAYS = { daily: 1, weekly: 7, fortnightly: 14, monthly: 30, quarterly: 90 }

export const FACTOR_KEYS = ['issues', 'inspections', 'progress', 'attendance', 'findings']
export const FACTOR_LABELS = {
  issues: 'Unresolved issues', inspections: 'Missed / overdue inspections', progress: 'Project progress & delays',
  attendance: 'Attendance & GPS verification', findings: 'Recent inspection findings',
}

export const DEFAULT_RISK_CONFIG = {
  version: 1,
  // Maximum points each factor can add. Must add up to 100.
  weights: { issues: 30, inspections: 25, progress: 15, attendance: 15, findings: 15 },
  // score <= lowMax → Low, <= mediumMax → Medium, above → High
  levels: { lowMax: 30, mediumMax: 60 },

  issues: {
    severityPoints: { Critical: 12, High: 7, Medium: 3, Low: 1 }, // "risk points" per unresolved issue
    // Issue lifecycle → how much of its points still count. Resolved = fixed but not yet verified/closed.
    statusFactor: { Reported: 1, Verified: 1, Assigned: 1, 'In Progress': 1, Resolved: 0.25, Closed: 0 },
    deadlineDays: { Critical: 3, High: 7, Medium: 14, Low: 30 }, // an unresolved issue older than this is "past deadline"
    overdueMultiplier: 1.25, recurringMultiplier: 1.2,
    saturation: 30, // total risk points that fill the whole factor
  },
  inspections: {
    windowDays: 90,
    missedCurve: [0, 0.35, 0.65, 1], // share of the factor for 0, 1, 2, 3+ missed inspections (repeats weigh more)
    overdueBase: 0.2, overdueExtra: 0.2, // each overdue visit adds base + extra × (days late ÷ the site's inspection interval)
  },
  progress: {
    fullGapPoints: 20, // progress points behind schedule that fill the gap part
    gapShare: 0.7, deadlineShare: 0.3, deadlineFullDays: 90, lateStartFullDays: 30,
  },
  attendance: { windowDays: 60, failedGpsRatio: 0.4, incompleteRatio: 0.3 },
  findings: {
    windowDays: 60, lastN: 3, recencyWeights: [1, 0.7, 0.5],
    resultScore: { good: 0, attention: 0.5, critical: 1 },
    repeatBonus: 0.2, safetyBonus: 0.25,
    safetyItemPrefixes: ['fire-safety-', 'electrical-'], // checklist item ids that count as safety-related
  },
  confidence: { high: 0.85, medium: 0.6 }, // share of the applicable weight that had real data
  alerts: { spikePoints: 15, spikeDays: 7, repeatedMissed: 2 },
  trend: { stableBand: 3 }, // a change smaller than this many points is "stable"
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

// Returns a list of problems (empty = valid)
export function validateRiskConfig(cfg) {
  const e = []
  if (!cfg || typeof cfg !== 'object') return ['Settings are missing.']
  if (!cfg.weights) return ['Weights are missing.']
  let sum = 0
  for (const k of FACTOR_KEYS) {
    const w = cfg.weights[k]
    if (!isNum(w) || w < 0 || w > 100) e.push(`${FACTOR_LABELS[k]}: weight must be between 0 and 100.`)
    else sum += w
  }
  if (e.length === 0 && Math.abs(sum - 100) > 0.001) e.push(`Weights must add up to 100 (they add up to ${Math.round(sum * 100) / 100}).`)
  const l = cfg.levels || {}
  if (!isNum(l.lowMax) || !isNum(l.mediumMax) || l.lowMax < 1 || l.mediumMax > 99 || l.lowMax >= l.mediumMax) e.push('Level limits must satisfy 1 ≤ Low limit < Medium limit ≤ 99.')
  return e
}

// Fills anything missing from the defaults (so an old or partial saved config never breaks the engine)
export function mergeRiskConfig(partial) {
  const d = DEFAULT_RISK_CONFIG
  const p = partial || {}
  const sub = (k) => ({ ...d[k], ...(p[k] || {}) })
  return {
    ...d, ...p,
    weights: { ...d.weights, ...(p.weights || {}) }, levels: { ...d.levels, ...(p.levels || {}) },
    issues: { ...sub('issues'), severityPoints: { ...d.issues.severityPoints, ...((p.issues || {}).severityPoints || {}) }, statusFactor: { ...d.issues.statusFactor, ...((p.issues || {}).statusFactor || {}) }, deadlineDays: { ...d.issues.deadlineDays, ...((p.issues || {}).deadlineDays || {}) } },
    inspections: sub('inspections'), progress: sub('progress'), attendance: sub('attendance'), findings: sub('findings'),
    confidence: sub('confidence'), alerts: sub('alerts'), trend: sub('trend'),
  }
}
