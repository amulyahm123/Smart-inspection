import { checklistForPhase } from '../data/constructionChecklists'
import { levelOf } from '../data/checklists'
import { progressStatus, progressText, toneEmoji } from './status'

const FLAG = ['attention', 'fail', 'not-acceptable']

// Numbers + the three indicators (Progress / Quality / Issues) for a construction inspection.
export function computeConstructionSummary(draft, site) {
  const { work, materials } = checklistForPhase(draft.progress.phase)
  const all = [...work, ...materials]
  const a = draft.answers
  const total = all.length
  const answered = all.filter((i) => a[i.id]).length
  const flagged = all.filter((i) => FLAG.includes(a[i.id])).map((i) => ({ ...i, level: levelOf(a[i.id]) }))
  const unreported = flagged.filter((i) => !draft.issues.some((x) => x.itemId === i.id))
  const critical = draft.issues.filter((i) => i.severity === 'Critical').length
  const badItems = all.filter((i) => a[i.id] === 'fail' || a[i.id] === 'not-acceptable').length

  const expected = site.expectedProgress
  const actual = draft.progress.actual
  const st = progressStatus(expected, actual)
  const progress = {
    phase: draft.progress.phase, expected, actual, previous: site.previousProgress, last: site.actualProgress,
    diff: st.diff, status: st.label, tone: st.tone, emoji: toneEmoji[st.tone], text: progressText(st.diff),
  }

  let quality = { label: 'Acceptable', tone: 'green' }
  if (badItems > 0) quality = { label: 'Not Acceptable', tone: 'red' }
  else if (flagged.length > 0) quality = { label: 'Needs Attention', tone: 'amber' }
  quality.emoji = toneEmoji[quality.tone]

  const n = draft.issues.length
  const issuesInd = { count: n, critical, tone: critical ? 'red' : n ? 'amber' : 'green', label: n ? `${n} open issue${n === 1 ? '' : 's'}` : 'No issues' }
  issuesInd.emoji = toneEmoji[issuesInd.tone]

  let overall = { key: 'good', label: 'Good', emoji: '🟢', tone: 'green' }
  if (critical > 0 || quality.tone === 'red') overall = { key: 'critical', label: 'Critical', emoji: '🔴', tone: 'red' }
  else if (progress.tone !== 'green' || quality.tone !== 'green' || n > 0) overall = { key: 'attention', label: 'Attention Required', emoji: '🟡', tone: 'amber' }

  const count = (list) => list.filter((i) => a[i.id]).length
  return {
    total, answered, remaining: total - answered, percent: Math.round((answered / total) * 100),
    workTotal: work.length, workDone: count(work), materialTotal: materials.length, materialDone: count(materials),
    workPass: work.filter((i) => a[i.id] === 'pass').length, workAttention: work.filter((i) => a[i.id] === 'attention').length, workFail: work.filter((i) => a[i.id] === 'fail').length,
    matOk: materials.filter((i) => a[i.id] === 'acceptable').length, matAttention: materials.filter((i) => a[i.id] === 'attention').length, matBad: materials.filter((i) => a[i.id] === 'not-acceptable').length,
    flagged, unreported, critical, issues: n, evidence: draft.evidence.length,
    progress, quality, issuesInd, overall,
  }
}
