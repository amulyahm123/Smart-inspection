import { useState } from 'react'
import { checklistForPhase } from '../../data/constructionChecklists'
import { answerOptions, materialOptions } from '../../data/checklists'
import Badge from '../ui/Badge'
import CheckRow from './CheckRow'
import IssueForm from './IssueForm'

// Used twice for construction: mode="work" (phase checklist) and mode="materials" (material/quality check)
export default function PhaseItemsStep({ site, insp, mode }) {
  const { draft, answer, next, back } = insp
  const [preset, setPreset] = useState(null)
  const phase = draft.progress.phase
  const isWork = mode === 'work'
  const items = checklistForPhase(phase)[isWork ? 'work' : 'materials']
  const options = isWork ? answerOptions : materialOptions
  const done = items.filter((i) => draft.answers[i.id]).length
  const pct = Math.round((done / items.length) * 100)
  const count = (v) => items.filter((i) => draft.answers[i.id] === v).length

  const report = (item) => setPreset({
    itemId: item.id, item: item.label, category: 'Quality',
    severity: ['fail', 'not-acceptable'].includes(draft.answers[item.id]) ? 'High' : 'Medium',
  })

  return (
    <>
      <section className="card">
        <h2>{isWork ? `${phase} – phase checklist` : `Material / quality check – ${phase}`}</h2>
        <p className="muted small" style={{ margin: '2px 0 10px' }}>
          {isWork ? 'Check the work items that belong to the current phase.' : 'A simple visual check of the materials on site. No lab tests needed.'}
        </p>
        <div className="progress-line" style={{ marginTop: 0 }}><span>Progress</span><span>{done} of {items.length} · {pct}%</span></div>
        <div className="bar"><span className="fill-blue" style={{ width: `${pct}%` }} /></div>
        <div className="pill-row" style={{ marginTop: 10 }}>
          <Badge tone="green">{count(isWork ? 'pass' : 'acceptable')} {isWork ? 'pass' : 'acceptable'}</Badge>
          <Badge tone="amber">{count('attention')} {isWork ? 'attention' : 'needs attention'}</Badge>
          <Badge tone="red">{count(isWork ? 'fail' : 'not-acceptable')} {isWork ? 'fail' : 'not acceptable'}</Badge>
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        {items.map((item) => (
          <CheckRow key={item.id} item={item} options={options} value={draft.answers[item.id]}
            issue={draft.issues.find((x) => x.itemId === item.id)} onChange={(v) => answer(item.id, v)} onReport={() => report(item)} />
        ))}
      </section>

      <div className="action-bar">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn" disabled={done < items.length} onClick={next}>
          {done < items.length ? `${items.length - done} items left` : isWork ? 'Continue to materials' : 'Continue to evidence'}
        </button>
      </div>
      {preset && <IssueForm site={site} preset={preset} insp={insp} onClose={() => setPreset(null)} />}
    </>
  )
}
