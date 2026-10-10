import { Check } from 'lucide-react'
import { phases } from '../../data/sites'
import { progressStatus, progressText } from '../../utils/status'
import { formatDate } from '../../utils/date'
import Badge from '../ui/Badge'

// Confirm the current phase and enter the progress you observe on site.
export default function ProgressStep({ site, insp }) {
  const { draft, setProgress, next } = insp
  const p = draft.progress
  const expected = site.expectedProgress
  const st = progressStatus(expected, p.actual)
  const phaseIdx = phases.indexOf(p.phase)

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2>Current construction phase</h2>
        <p className="muted small" style={{ margin: '2px 0 12px' }}>Recorded phase: {site.phase}. Change it only if the site has moved on. The checklist will switch to match.</p>
        <div className="phase-track">
          {phases.map((ph, i) => (
            <button key={ph} className={`phase ${i < phaseIdx ? 'past' : ''} ${i === phaseIdx ? 'now' : ''}`} aria-pressed={i === phaseIdx} onClick={() => setProgress({ phase: ph })}>
              <span className="n">{i < phaseIdx ? <Check size={13} /> : i + 1}</span>{ph}
            </button>
          ))}
        </div>
        <label style={{ marginTop: 16 }}>Progress remarks (optional)
          <textarea value={p.notes} onChange={(e) => setProgress({ notes: e.target.value })} placeholder="e.g. Contractor short of labour this week" />
        </label>
      </section>

      <section className="card form-grid">
        <h2>Progress check</h2>
        <div className="stat-trio">
          <div><span className="muted small">Expected</span><b>{expected}%</b></div>
          <div><span className="muted small">Last inspection</span><b>{site.actualProgress}%</b></div>
          <div><span className="muted small">Your observation</span><b>{p.actual}%</b></div>
        </div>

        <label>Actual observed progress: {p.actual}%
          <input type="range" min="0" max="100" value={p.actual} onChange={(e) => setProgress({ actual: Number(e.target.value) })} aria-label="Actual observed progress" />
        </label>

        <div className="meter" aria-hidden="true">
          <span className={`fill-${st.tone === 'red' ? 'red' : st.tone === 'amber' ? 'amber' : 'green'}`} style={{ width: `${p.actual}%` }} />
          <i style={{ left: `${expected}%` }} title="Expected" />
        </div>
        <div className="progress-line" style={{ margin: 0 }}><span>0%</span><span>▲ expected {expected}%</span><span>100%</span></div>

        <div className={`result-box tone-${st.tone}`}>
          <b>Difference: {st.diff > 0 ? '+' : ''}{st.diff}% · {st.label}</b>
          <div className="small">{progressText(st.diff)} (actual {p.actual}% − expected {expected}%)</div>
        </div>
        {p.actual < site.actualProgress && <div className="warn">This is lower than the last inspection ({site.actualProgress}%). Double-check the number, or report an issue.</div>}
        <div className="muted small">Timeline: {formatDate(site.startDate)} → {formatDate(site.targetDate)} <Badge tone={st.tone}>{st.label}</Badge></div>

        <button className="btn" onClick={next}>Continue to phase checklist</button>
      </section>
    </div>
  )
}
