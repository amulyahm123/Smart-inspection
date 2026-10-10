import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlayCircle, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInspection } from '../../context/InspectionContext'
import { getSiteById, getUserById, siteAgeText, getIssuesForSite, getInspectionsForSite } from '../../services/dataService'
import { siteTone, siteLabel, severityTone, issueTone, inspectionTone } from '../../utils/status'
import { formatDate } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'

export default function SiteDetails() {
  const { siteId } = useParams()
  const { user } = useAuth()
  const insp = useInspection()
  const navigate = useNavigate()
  const site = getSiteById(siteId)
  if (!site || site.type !== 'existing') return <Navigate to="/inspector/old-sites" replace />

  const active = insp.draft && !insp.draft.checkOut ? insp.draft : null
  const resuming = active && active.siteId === site.id
  const busyElsewhere = active && active.siteId !== site.id
  const issues = getIssuesForSite(site.id)
  const open = issues.filter((i) => !['Resolved', 'Closed'].includes(i.status))
  const history = getInspectionsForSite(site.id).slice(0, 5)
  const officer = getUserById(site.assignedOfficer)

  const start = () => {
    if (!resuming) insp.start(site, user)
    navigate(`/inspector/old-sites/${site.id}/inspect`)
  }

  const info = [
    ['Address', site.address], ['Department', site.department], ['Category', site.category],
    ['Site age', siteAgeText(site)], ['Assigned inspector', `${officer.name} (${officer.officerId})`],
    ['Last inspection', formatDate(site.lastInspected)], ['GPS location', `${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}`],
    ['Check-in radius', `${site.radius} m`],
  ]

  return (
    <>
      <Link to="/inspector/old-sites" className="back-link"><ArrowLeft size={16} /> All old sites</Link>
      <PageHead title={site.name} subtitle={`${site.id} · ${site.area}`}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={siteTone[site.status]}>{siteLabel[site.status]}</Badge>
          {busyElsewhere ? (
            <Link className="btn btn-ghost" to={`/inspector/old-sites/${active.siteId}/inspect`}>Finish current inspection first</Link>
          ) : (
            <button className="btn" onClick={start}>{resuming ? <><RotateCcw size={17} /> Resume inspection</> : <><PlayCircle size={17} /> Start inspection</>}</button>
          )}
        </div>
      </PageHead>

      <section className="card">
        <dl className="kv">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {site.assignedOfficer !== user.id && <p className="warn" style={{ marginTop: 14 }}>This site is assigned to {officer.name}. You can still inspect it in this demo.</p>}
      </section>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Open issues ({open.length})</h2></div>
          {open.length === 0 && <p className="muted">No open issues at this site.</p>}
          {open.map((i) => (
            <div className="list-row" key={i.id}>
              <div className="grow">
                <b>{i.title}</b>
                <div className="muted small">{i.id} · {i.category} · {i.daysAgo === 0 ? 'today' : `${i.daysAgo} days ago`}</div>
                <div className="pill-row" style={{ marginTop: 4 }}>
                  <Badge tone={severityTone[i.severity]}>{i.severity}</Badge>
                  <Badge tone={issueTone[i.status]}>{i.status}</Badge>
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
