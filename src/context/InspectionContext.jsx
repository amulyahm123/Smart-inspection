import { createContext, useContext, useEffect, useState } from 'react'
import { DRAFT_KEY } from '../utils/storageKeys'
import { portablePhoto } from '../services/evidenceService'

const Ctx = createContext(null)

// Steps differ per site type. "Completed" is the screen after the last step.
export const STEPS_BY_KIND = {
  existing: ['Check-in', 'Checklist', 'Evidence', 'Issues', 'Summary', 'Check-out'],
  construction: ['Check-in', 'Progress', 'Checklist', 'Materials', 'Evidence', 'Issues', 'Summary', 'Check-out'],
}

const OK_VALUES = ['pass', 'acceptable']

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const d = raw ? JSON.parse(raw) : null
    return d && d.kind && d.siteId ? d : null
  } catch {
    return null
  }
}

// Holds the one inspection currently being filled in. It is saved in the browser, so a refresh keeps your progress.
export function InspectionProvider({ children, initialDraft = null }) {
  const [draft, setDraft] = useState(() => initialDraft || loadDraft())
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, evidence: draft.evidence.map(portablePhoto) }))
      else localStorage.removeItem(DRAFT_KEY)
    } catch { /* ignore */ }
  }, [draft])
  const patch = (fn) => setDraft((d) => (d ? { ...d, ...fn(d) } : d))
  const lastStep = (d) => STEPS_BY_KIND[d.kind].length - 1

  const api = {
    draft,
    start: (site, user) => {
      const construction = site.type === 'construction'
      setDraft({
        id: `INSP-${Date.now().toString().slice(-6)}`, recordId: null, kind: construction ? 'construction' : 'existing',
        siteId: site.id, inspectorId: user.id, step: 0, startedAt: new Date().toISOString(), checkIn: null, checkOut: null,
        answers: {}, evidence: [], issues: [], submitted: false,
        progress: construction ? { phase: site.phase, actual: site.actualProgress, notes: '' } : null,
      })
    },
    clear: () => setDraft(null),
    goto: (step) => patch(() => ({ step })),
    next: () => patch((d) => ({ step: d.step + 1 })),
    back: () => patch((d) => ({ step: Math.max(1, d.step - 1) })),
    setCheckIn: (checkIn) => patch(() => ({ checkIn, step: 1 })),

    // Changing the phase starts that phase's checklist fresh (item issues + photos are dropped)
    setProgress: (p) => patch((d) => {
      const progress = { ...d.progress, ...p }
      if (!p.phase || p.phase === d.progress.phase) return { progress }
      const itemIssues = d.issues.filter((i) => i.itemId && i.itemId !== 'progress').map((i) => i.id)
      return {
        progress, answers: {},
        issues: d.issues.filter((i) => !itemIssues.includes(i.id)),
        evidence: d.evidence.filter((e) => e.link.type !== 'item' && !(e.link.type === 'issue' && itemIssues.includes(e.link.ref))),
      }
    }),

    // Marking an item OK again removes any issue + evidence attached to it
    answer: (itemId, value) => patch((d) => {
      const answers = { ...d.answers, [itemId]: value }
      if (!OK_VALUES.includes(value)) return { answers }
      const dropped = d.issues.filter((i) => i.itemId === itemId).map((i) => i.id)
      return {
        answers,
        issues: d.issues.filter((i) => i.itemId !== itemId),
        evidence: d.evidence.filter((e) => !(e.link.type === 'item' && e.link.ref === itemId) && !(e.link.type === 'issue' && dropped.includes(e.link.ref))),
      }
    }),
    addEvidence: (ev) => patch((d) => ({ evidence: [...d.evidence, ev] })),
    removeEvidence: (id) => patch((d) => ({ evidence: d.evidence.filter((e) => e.id !== id) })),
    removeIssueEvidence: (issueId) => patch((d) => ({ evidence: d.evidence.filter((e) => !(e.link.type === 'issue' && e.link.ref === issueId)) })),
    addIssue: (issue) => patch((d) => ({ issues: [...d.issues, issue] })),
    removeIssue: (id) => patch((d) => ({
      issues: d.issues.filter((i) => i.id !== id),
      evidence: d.evidence.filter((e) => !(e.link.type === 'issue' && e.link.ref === id)),
    })),
    markSubmitted: (recordId) => patch((d) => ({ submitted: true, recordId, step: lastStep(d) })),
    markCompleted: (checkOut) => patch((d) => ({ checkOut, step: lastStep(d) + 1 })),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useInspection = () => useContext(Ctx)
