import { useState } from 'react'
import { existingChecklist, answerOptions } from '../../data/checklists'
import Badge from '../ui/Badge'
import CheckRow from './CheckRow'
import IssueForm from './IssueForm'

// Existing-site checklist: 7 categories, one tab each
export default function ChecklistStep({ site, insp, summary }) {
  const { draft, answer, next } = insp
  const [catIdx, setCatIdx] = useState(0)
  const [formPreset, setFormPreset] = useState(null)
  const cat = existingChecklist[catIdx]
  const isLast = catIdx === existingChecklist.length - 1

  const openIssue = (item) => setFormPreset({
    itemId: item.id, item: item.label, category: item.category,
    severity: draft.answers[item.id] === 'fail' ? 'High' : 'Medium',
  })

  return (
    <>
      <section className="card">
        <div className="progress-line" style={{ marginTop: 0 }}>
          <b>Checklist progress</b><span>{summary.answered} of {summary.total} items · {summary.percent}%</span>
        </div>
        <div className="bar"><span className="fill-blue" style={{ width: `${summary.percent}%` }} /></div>
        <div className="pill-row" style={{ marginTop: 10 }}>
          <Badge tone="green">{summary.pass} pass</Badge>
          <Badge tone="amber">{summary.attention} attention</Badge>
          <Badge tone="red">{summary.fail} fail</Badge>
        </div>
      </section>

      <div className="cat-tabs" role="tablist">
        {existingChecklist.map((c, i) => {
          const done = c.items.filter((it) => draft.answers[it.id]).length
          return (
            <button key={c.id} role="tab" aria-selected={i === catIdx} className={`cat-tab ${i === catIdx ? 'on' : ''}`} onClick={() => setCatIdx(i)}>
              {c.name} {done === c.items.length ? '✓' : `${done}/${c.items.length}`}
            </button>
          )
        })}
      </div>

      <section className="card">
        <h2>{cat.name}</h2>
        {cat.items.map((item) => (
          <CheckRow key={item.id} item={item} options={answerOptions} value={draft.answers[item.id]}
            issue={draft.issues.find((x) => x.itemId === item.id)} onChange={(v) => answer(item.id, v)} onReport={() => openIssue(item)} />
        ))}
      </section>

      <div className="action-bar">
        <button className="btn btn-ghost" disabled={catIdx === 0} onClick={() => setCatIdx(catIdx - 1)}>Previous category</button>
        {!isLast ? (
          <button className="btn" onClick={() => setCatIdx(catIdx + 1)}>Next: {existingChecklist[catIdx + 1].name}</button>
        ) : (
          <button className="btn" disabled={summary.remaining > 0} onClick={next}>
            {summary.remaining > 0 ? `${summary.remaining} items left` : 'Continue to evidence'}
          </button>
        )}
      </div>
      {isLast && summary.remaining > 0 && <p className="muted small" style={{ marginTop: 8, textAlign: 'right' }}>Answer every item to continue. Check the other category tabs for items not yet marked.</p>}

      {formPreset && <IssueForm site={site} preset={formPreset} insp={insp} onClose={() => setFormPreset(null)} />}
    </>
  )
}
