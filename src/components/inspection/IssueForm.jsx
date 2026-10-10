import { useMemo, useState } from 'react'
import { X, Repeat2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { teams } from '../../data/teams'
import { categoriesFor, teamFor } from '../../data/issueConfig'
import { findRecurring } from '../../services/dataService'
import EvidenceCapture from './EvidenceCapture'
import Badge from '../ui/Badge'

const severities = ['Low', 'Medium', 'High', 'Critical']

// preset: { itemId?, item?, category?, severity? } – prefilled when opened from a flagged checklist item
export default function IssueForm({ site, preset = {}, insp, onClose }) {
  const { user } = useAuth()
  const { draft, addIssue, addEvidence, removeEvidence, removeIssueEvidence } = insp
  const [tmpId] = useState(() => `D-${Date.now().toString().slice(-6)}`)
  const cats = categoriesFor(site.type)
  const firstCat = preset.category || cats[0]
  const [f, setF] = useState({
    category: firstCat,
    title: preset.title || (preset.item ? `${preset.item} – ` : ''),
    severity: preset.severity || 'Medium',
    description: '', team: teamFor(site.type, firstCat), location: '', escalate: false,
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const recurring = useMemo(
    () => findRecurring(site.id, f.category, `${preset.item || ''} ${f.title}`),
    [site.id, f.category, f.title, preset.item]
  )
  const photos = draft.evidence.filter((e) => e.link.type === 'issue' && e.link.ref === tmpId)

  const cancel = () => { removeIssueEvidence(tmpId); onClose() }

  const save = () => {
    const err = {}
    if (f.title.replace(preset.item && !preset.title ? `${preset.item} –` : '', '').trim().length < 3) err.title = 'Describe the issue in a few words.'
    if (f.description.trim().length < 5) err.description = 'Add a short description.'
    if (['High', 'Critical'].includes(f.severity) && photos.length === 0) err.photo = 'High and Critical issues need at least one photo.'
    setErrors(err)
    if (Object.keys(err).length) return
    addIssue({
      id: tmpId, itemId: preset.itemId || null, item: preset.item || null, category: f.category,
      title: f.title.trim().replace(/\s*–$/, ''), severity: f.severity, description: f.description.trim(),
      team: f.team, location: f.location.trim() || 'Not specified',
      recurring: !!recurring, recurringOf: recurring ? recurring.id : null, escalate: !!recurring || f.escalate,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={cancel}>
      <div className="modal" role="dialog" aria-label="Report issue" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2>Report an issue</h2>
          <button className="btn btn-ghost" style={{ padding: 6 }} onClick={cancel} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="form-grid">
          {recurring && (
            <div className="warn">
              <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Repeat2 size={16} /> Recurring Issue</b>
              <div className="small" style={{ marginTop: 3 }}>
                Similar issue {recurring.id} (“{recurring.title}”) was reported {recurring.daysAgo} days ago and is still {recurring.status}.
                Escalation to the supervisor is recommended – it will be flagged on submit.
              </div>
            </div>
          )}

          <div className="form-2">
            <label>Category
              <select value={f.category} onChange={(e) => { set('category', e.target.value); set('team', teamFor(site.type, e.target.value)) }}>
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Severity
              <select value={f.severity} onChange={(e) => set('severity', e.target.value)}>
                {severities.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <label>Issue
            <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Diagonal crack on north wall" />
            {errors.title && <span className="err">{errors.title}</span>}
          </label>

          <label>Description
            <textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What did you see? How big / how bad is it?" />
            {errors.description && <span className="err">{errors.description}</span>}
          </label>

          <div className="form-2">
            <label>Responsible team
              <select value={f.team} onChange={(e) => set('team', e.target.value)}>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Location in site
              <input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Block A, 2nd floor" />
            </label>
          </div>

          <div>
            <b className="small" style={{ color: 'var(--ink-soft)' }}>Photo evidence {['High', 'Critical'].includes(f.severity) ? '(required)' : '(optional)'}</b>
            <div style={{ marginTop: 6 }}>
              <EvidenceCapture link={{ type: 'issue', ref: tmpId }} label={f.title || f.category} items={photos}
                onAdd={addEvidence} onRemove={removeEvidence} user={user} checkIn={draft.checkIn} />
            </div>
            {errors.photo && <span className="err">{errors.photo}</span>}
          </div>

          <div className="action-bar" style={{ marginTop: 4 }}>
            <Badge tone="gray">{f.team}</Badge>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
              <button className="btn" onClick={save}>Save issue</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
