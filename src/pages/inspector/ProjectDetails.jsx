import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlayCircle, RotateCcw, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInspection } from '../../context/InspectionContext'
import { getSiteById, getUserById, getIssuesForSite, getInspectionsForSite } from '../../services/dataService'
import { phases } from '../../data/sites'
import { progressStatus, progressText, severityTone, issueTone, inspectionTone } from '../../utils/status'
import { formatDate, dayOffset } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'

export default function ProjectDetails() {
  const { siteId } = useParams()
  const { user } = useAuth()
  const insp = useInspection()
  const navigate = useNavigate()
  const p = getSiteById(siteId)
  if (!p || p.type !== 'construction') return <Navigate to="/inspector/new-sites" replace />

  const st = progressStatus(p.expectedProgress, p.actualProgress)
  const active = insp.draft && !insp.draft.checkOut ? insp.draft : null
  const resuming = active && active.siteId === p.id
  const busyElsewhere = active && active.siteId !== p.id
  const open = getIssuesForSite(p.id).filter((i) => !['Resolved', 'Closed'].includes(i.status))
  const history = getInspectionsForSite(p.id).slice(0, 5)
  const officer = getUserById(p.assignedOfficer)
  const phaseIdx = phases.indexOf(p.phase)
  const daysLeft = Math.round((new Date(p.targetDate) - new Date(dayOffset(0))) / 86400000)

  const start = () => {
    if (!resuming) insp.start(p, user)
    navigate(`/inspector/new-sites/${p.id}/inspect`)
  }

  const info = [
    ['Location', `${p.area} – ${p.address}`], ['Contractor', p.contractor], ['Department', p.department],
    ['Start date', formatDate(p.startDate)], ['Target completion', `${formatDate(p.targetDate)} (${daysLeft > 0 ? `${daysLeft} days left` : 'past due'})`],
    ['Assigned inspector', `${officer.name} (${officer.officerId})`], ['Last inspection', formatDate(p.lastInspected)], ['Check-in radius', `${p.radius} m`],
  ]

  return (
    <>
      <Link to="/inspector/new-sites" className="back-link"><ArrowLeft size={16} /> All projects</Link>
      <PageHead title={p.name} subtitle={`${p.id} · ${p.category}`}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={st.tone}>{st.label}</Badge>
          {busyElsewhere ? (
            <Link className="btn btn-ghost" to={`/inspector/${active.kind === 'existing' ? 'old' : 'new'}-sites/${active.siteId}/inspect`}>Finish current inspection first</Link>
          ) : (
            <button className="btn" onClick={start}>{resuming ? <><RotateCcw size={17} /> Resume inspection</> : <><PlayCircle size={17} /> Start inspection</>}</button>
          )}
        </div>
      </PageHead>

      <div className="grid grid-2">
        <section className="card">
          <h2>Current construction phase</h2>
          <div className="phase-track" style={{ margin: '12px 0 4px' }}>
            {phases.map((ph, i) => (
              <span key={ph} className={`phase ${i < phaseIdx ? 'past' : ''} ${i === phaseIdx ? 'now' : ''}`}>
                <span className="n">{i < phaseIdx ? <Check size={13} /> : i + 1}</span>{ph}
              </span>
            ))}
          </div>
        </section>
        <section className="card">
          <h2>Progress</h2>
          <div className="stat-trio" style={{ margin: '10px 0' }}>
            <div><span className="muted small">Expected</span><b>{p.expectedProgress}%</b></div>
            <div><span className="muted small">Actual</span><b>{p.actualProgress}%</b></div>
            <div><span className="muted small">Previous inspection</span><b>{p.previousProgress}%</b></div>
          </div>
          <div className="meter"><span className={`fill-${st.tone}`} style={{ width: `${p.actualProgress}%` }} /><i style={{ left: `${p.expectedProgress}%` }} title="Expected" /></div>
          <p style={{ marginTop: 10 }}><b>Difference: {st.diff > 0 ? '+' : ''}{st.diff}%</b> · <Badge tone={st.tone}>{st.label}</Badge> <span className="muted small">{progressText(st.diff)}</span></p>
        </section>
      </div>

      <section className="card section">
        <dl className="kv">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {p.assignedOfficer !== user.id && <p className="warn" style={{ marginTop: 14 }}>This project is assigned to {officer.name}. You can still inspect it in this demo.</p>}
      </section>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Open issues ({open.length})</h2></div>
          {open.length === 0 && <p className="muted">No open issues on this project.</p>}
          {open.map((i) => (
            <div className="list-row" key={i.id}>
              <div className="grow">
                <b>{i.title}</b>
                <div className="muted small">{i.id} · {i.category} · {i.daysAgo === 0 ? 'today' : `${i.daysAgo} days ago`}</div>
                <div className="pill-row" style={{ marginTop: 4 }}>
                  <Badge tone={severityTone[i.severity]}>{i.severity}</Badge><Badge tone={issueTone[i.status]}>{i.status}</Badge>
                  {i.recurring && <Badge tone="orange">Recurring Issue ×{i.recurrenceCount}</Badge>}
                </div>
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-head"><h2>Inspection history</h2></div>
          {history.length === 0 && <p className="muted">No inspections yet.</p>}
          {history.map((i) => (
            <div className="list-row" key={i.id}>
              <div className="grow"><b>{formatDate(i.date)}</b><div className="muted small">{getUserById(i.inspectorId).name} · {i.slot}</div></div>
              <Badge tone={inspectionTone[i.status]}>{i.status.replace('-', ' ')}</Badge>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
