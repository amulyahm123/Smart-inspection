import { checklistItems, existingChecklist } from '../data/checklists'
import { computeConstructionSummary } from './construction'

// Turns the in-progress inspection (draft) into the numbers shown on the summary screen.
export function computeSummary(draft) {
  const answers = draft.answers
  const total = checklistItems.length
  const answered = checklistItems.filter((i) => answers[i.id]).length
  const count = (v) => checklistItems.filter((i) => answers[i.id] === v).length
  const flagged = checklistItems.filter((i) => ['attention', 'fail'].includes(answers[i.id])).map((i) => ({ ...i, level: answers[i.id] }))
  const unreported = flagged.filter((i) => !draft.issues.some((x) => x.itemId === i.id))
  const critical = draft.issues.filter((i) => i.severity === 'Critical').length

  let overall = { key: 'good', label: 'Good', emoji: '🟢', tone: 'green' }
  if (critical > 0 || count('fail') >= 3) overall = { key: 'critical', label: 'Critical', emoji: '🔴', tone: 'red' }
  else if (flagged.length > 0 || draft.issues.length > 0) overall = { key: 'attention', label: 'Attention Required', emoji: '🟡', tone: 'amber' }

  const byCategory = existingChecklist.map((c) => ({
    name: c.name,
    pass: c.items.filter((i) => answers[i.id] === 'pass').length,
    attention: c.items.filter((i) => answers[i.id] === 'attention').length,
    fail: c.items.filter((i) => answers[i.id] === 'fail').length,
    total: c.items.length,
  }))

  return {
    total, answered, remaining: total - answered, percent: Math.round((answered / total) * 100),
    pass: count('pass'), attention: count('attention'), fail: count('fail'),
    flagged, unreported, critical, issues: draft.issues.length, evidence: draft.evidence.length,
    overall, byCategory,
  }
}

// One entry point for both inspection kinds
export const getSummary = (draft, site) => (draft.kind === 'construction' ? computeConstructionSummary(draft, site) : computeSummary(draft))
