import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, RefreshCw, UserCog, Archive, ArchiveRestore, Trash2, Upload, FileText, MapPin, Phone, ExternalLink, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getSiteById, getUserById, getIssuesForSite, siteAgeText } from '../../services/dataService'
import { getInspectionsForSite, getSiteInspectionStats } from '../../services/adminService'
import { listSiteFiles, prepareFile, addSiteFiles, removeSiteFile, archiveSite, restoreSite, deleteSite, canArchive, getRelatedCounts, SiteError } from '../../services/siteService'
import { inspectionSchedule } from '../../utils/schedule'
import { siteTone, siteLabel, severityTone, issueTone, bucketTone, bucketLabel, progressStatus } from '../../utils/status'
import { formatDate, formatTime, formatMinutes } from '../../utils/date'
import { projectStatusLabel, projectStatusTone, frequencyLabel, FILE_LIMITS } from '../../data/siteOptions'
import { getSiteRisk } from '../../services/riskService'
import RiskPanel from '../../components/risk/RiskPanel'
import { RiskBadge } from '../../components/risk/RiskVisuals'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'
import Toast from '../../components/ui/Toast'
import SiteFormModal from '../../components/sites/SiteFormModal'
import { StatusModal, OfficerModal } from '../../components/sites/QuickModals'
import { ConfirmDialog } from '../../components/sites/Dialog'

const money = (n) => (n === null || n === undefined || n === '' ? 'Not recorded' : `₹ ${Number(n).toLocaleString('en-IN')}`)

export default function SiteDetail() {
  const { siteId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [modal, setModal] = useState(null) // edit | status | officer | archive | delete
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [toast, setToast] = useState(location.state && location.state.toast ? { text: location.state.toast, tone: 'ok' } : null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  const site = getSiteById(siteId)
  if (!site) return <Navigate to="/admin/sites" replace />
  const isAdmin = user && user.role === 'admin'

  const officer = getUserById(site.assignedOfficer)
  const history = getInspectionsForSite(siteId)
  const issues = getIssuesForSite(siteId)
  const stats = getSiteInspectionStats(siteId)
  const files = listSiteFiles(siteId)
  const related = getRelatedCounts(siteId)
  const construction = site.type === 'construction'
  const st = construction ? progressStatus(site.expectedProgress, site.actualProgress) : null
  const sch = inspectionSchedule(site, stats.lastDone)
  const risk = getSiteRisk(siteId)
  const openIssues = issues.filter((i) => !['Resolved', 'Closed'].includes(i.status)).length
  const legacy = site.legacy || {}
  const hasLegacy = !construction && (legacy.currentProgress || legacy.lastInspectionNotes || legacy.pendingIssues || legacy.historyNotes)

  const say = (text, tone = 'ok') => setToast({ text, tone })
  const close = () => { setModal(null); setDialogError(''); setBusy(false) }
  const done = (msg) => { close(); refresh(); say(msg) }
  const run = async (fn, okMsg) => {
    setBusy(true); setDialogError('')
    try { await fn(); done(okMsg) } catch (e) { setDialogError(e instanceof SiteError ? e.message : 'Something went wrong. Please try again.'); setBusy(false) }
  }

  const info = [
    ['Site ID', site.id], ['Type', construction ? `New site · ${site.phase} phase` : 'Old / existing site'],
    ...(site.projectName ? [['Project name', site.projectName]] : []),
    ['Category', site.category], ['Department', site.department],
    ...(construction ? [['Contractor / agency', site.contractor || 'Not recorded']] : [['Site age', siteAgeText(site)]]),
    ['Budget', money(site.budget)],
    ['Start date', formatDate(site.startDate)], ['Expected completion', formatDate(site.targetDate)],
    ['Inspection frequency', frequencyLabel[site.inspectionFrequency] || 'Not set'], ['Last inspection', formatDate(site.lastInspected)],
    ['Registered on', site.registeredOn ? formatDate(site.registeredOn) : 'Starting data'],
  ]
  const where = [
    ['Address', site.address || 'Not recorded'],
    ['City / District', [site.city || site.area, site.district].filter(Boolean).join(', ')],
    ['State · PIN', [site.state, site.pin].filter(Boolean).join(' · ') || 'Not recorded'],
    ['GPS', `${site.lat.toFixed(5)}, ${site.lng.toFixed(5)}`], ['Check-in radius', `${site.radius} m`],
  ]

  const upload = async (e) => {
    const list = [...e.target.files]
    e.target.value = ''
    if (!list.length) return
    setUploading(true)
    try {
      const prepared = []
      for (const f of list) prepared.push(await prepareFile(f, user))
      await addSiteFiles(siteId, prepared, user)
      refresh(); say(`${prepared.length} file${prepared.length === 1 ? '' : 's'} added.`)
    } catch (err) { say(err.message || 'Upload failed.', 'error') }
    setUploading(false)
  }
  const removeFile = async (f) => {
    try { await removeSiteFile(siteId, f.id, user); refresh(); say('File removed.') } catch (err) { say(err.message, 'error') }
  }

  return (
    <>
      <Link to="/admin/sites" className="back-link"><ArrowLeft size={16} /> All sites / projects</Link>
      <PageHead title={site.name} subtitle={`${site.id} · ${site.category}${site.area ? ` · ${site.area}` : ''}`}>
        <div className="pill-row">
          <Badge tone={projectStatusTone[site.projectStatus]}>{projectStatusLabel[site.projectStatus]}</Badge>
          <Badge tone={siteTone[site.status]}>{siteLabel[site.status]}</Badge>
          <RiskBadge risk={risk} />
          {site.archived && <Badge tone="gray">Archived</Badge>}
        </div>
      </PageHead>

      {site.archived && (
        <div className="warn" style={{ marginBottom: 14 }}>
          This site is archived{site.archivedAt ? ` (since ${formatDate(site.archivedAt.slice(0, 10))})` : ''}. It is hidden from inspectors and new assignments, and its history is kept.
        </div>
      )}

      {isAdmin ? (
        <div className="action-row">
          <button className="btn" onClick={() => setModal('edit')}><Pencil size={16} /> Edit site</button>
          <button className="btn btn-ghost" onClick={() => setModal('status')} disabled={site.archived}><RefreshCw size={16} /> Change status</button>
          <button className="btn btn-ghost" onClick={() => setModal('officer')}><UserCog size={16} /> Change officer</button>
          {site.archived
            ? <button className="btn btn-ghost" onClick={() => run(() => restoreSite(siteId, user), `${site.name} was restored.`)} disabled={busy}><ArchiveRestore size={16} /> Restore</button>
            : <button className="btn btn-ghost" onClick={() => setModal('archive')}><Archive size={16} /> Archive</button>}
          <button className="btn btn-ghost danger" onClick={() => setModal('delete')}><Trash2 size={16} /> Delete</button>
        </div>
      ) : <div className="warn red">Only an Admin can change sites.</div>}

      <div className="grid grid-4 stats-5" style={{ marginTop: 16 }}>
        <div className="card"><div className="s-value">{stats.completed}</div><div className="s-label muted small">Inspections completed</div></div>
        <div className="card"><div className="s-value">{stats.pending}</div><div className="s-label muted small">Pending inspections</div></div>
        <div className="card"><div className="s-value" style={stats.missed ? { color: 'var(--red)' } : undefined}>{stats.missed}</div><div className="s-label muted small">Missed inspections</div></div>
        <div className="card"><div className="s-value">{openIssues}</div><div className="s-label muted small">Open issues ({issues.length} total)</div></div>
        <div className="card"><div className="s-label muted small">Next inspection</div><div style={{ marginTop: 6 }}><Badge tone={sch.tone}>{sch.label}</Badge></div></div>
      </div>

      <RiskPanel site={site} risk={risk} isAdmin={isAdmin} actor={user} onChanged={refresh} onMessage={say} />

      <div className="grid grid-2eq section">
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Site information</h2>
          <dl className="kv">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {site.remarks && <><h3 style={{ marginTop: 16 }}>Remarks</h3><p className="small" style={{ whiteSpace: 'pre-wrap' }}>{site.remarks}</p></>}
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Location</h2>
          <dl className="kv">{where.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <a className="back-link" style={{ marginTop: 12, marginBottom: 0 }} target="_blank" rel="noreferrer"
            href={`https://www.openstreetmap.org/?mlat=${site.lat}&mlon=${site.lng}#map=17/${site.lat}/${site.lng}`}><MapPin size={15} /> View on map <ExternalLink size={13} /></a>
          <h2 style={{ margin: '18px 0 10px' }}>Assigned officer</h2>
          {officer ? (
            <div>
              <Link to={`/admin/officers/${officer.id}`}><b>{officer.name}</b></Link>
              <div className="muted small">{officer.designation} · {officer.officerId}</div>
              <div className="muted small">{officer.department} · Area: {officer.area}</div>
              <div className="small" style={{ marginTop: 4 }}><Phone size={13} /> {officer.phone}</div>
            </div>
          ) : <p className="muted">No officer assigned.</p>}
        </section>
      </div>

      <section className="card section">
        <h2 style={{ marginBottom: 10 }}>Project status &amp; progress</h2>
        {construction ? (
          <>
            <div className="pill-row" style={{ marginBottom: 10 }}><Badge tone={projectStatusTone[site.projectStatus]}>{projectStatusLabel[site.projectStatus]}</Badge><Badge tone={st.tone}>{st.label}</Badge><span className="muted small">Phase: {site.phase}</span></div>
            <div className="progress-pair">
              <div><div className="small muted">Actual {site.actualProgress}%</div><div className="bar"><span style={{ width: `${site.actualProgress}%` }} /></div></div>
              <div><div className="small muted">Expected {site.expectedProgress}%</div><div className="bar expected"><span style={{ width: `${site.expectedProgress}%` }} /></div></div>
            </div>
          </>
        ) : (
          <div className="pill-row"><Badge tone={projectStatusTone[site.projectStatus]}>{projectStatusLabel[site.projectStatus]}</Badge><Badge tone={siteTone[site.status]}>Condition: {siteLabel[site.status]}</Badge></div>
        )}
        {hasLegacy && (
          <dl className="kv" style={{ marginTop: 14 }}>
            {legacy.currentProgress && <div><dt>Current condition / progress</dt><dd>{legacy.currentProgress}</dd></div>}
            {legacy.pendingIssues && <div><dt>Pending issues (as registered)</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{legacy.pendingIssues}</dd></div>}
            {legacy.lastInspectionNotes && <div><dt>Previous inspection information{legacy.lastInspectionDate ? ` (${formatDate(legacy.lastInspectionDate)})` : ''}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{legacy.lastInspectionNotes}</dd></div>}
            {legacy.historyNotes && <div><dt>Historical information</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{legacy.historyNotes}</dd></div>}
          </dl>
        )}
      </section>

      <section className="card section table-wrap">
        <h2 style={{ marginBottom: 8 }}>Inspection history ({history.length})</h2>
        {history.length === 0 && <div className="empty-inline"><b>No inspections yet.</b><span className="muted"> {site.projectStatus === 'not-started' ? 'Inspections begin once the project starts.' : `The first one is due as per the ${(frequencyLabel[site.inspectionFrequency] || '').toLowerCase()} schedule; ${officer ? officer.name : 'the assigned officer'} will see this site under “Assigned to me”.`}</span></div>}
        {history.length > 0 && (
          <table>
            <thead><tr><th>Date</th><th>Inspector</th><th>Slot</th><th>Check-in</th><th>Check-out</th><th>On site</th><th>Result</th><th>Status</th></tr></thead>
            <tbody>
              {history.map((i) => (
                <tr key={i.id}>
                  <td>{formatDate(i.date)}<div className="muted small">{i.id}</div></td>
                  <td><Link to={`/admin/officers/${i.inspectorId}`}>{i.inspector.name}</Link>{i.random && <> <Badge tone="gray">Random</Badge></>}</td>
                  <td>{i.slot}</td>
                  <td>{i.checkIn ? formatTime(i.checkIn.time) : '–'}</td><td>{i.checkOut ? formatTime(i.checkOut.time) : '–'}</td><td>{formatMinutes(i.durationMin)}</td>
                  <td>{i.summary ? `${i.summary.issues} issue${i.summary.issues === 1 ? '' : 's'}` : '–'}</td>
                  <td><Badge tone={bucketTone[i.bucket]}>{bucketLabel[i.bucket]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card section">
        <h2>Issues at this site ({issues.length})</h2>
        {issues.length === 0 && <div className="empty-inline"><b>No issues reported.</b><span className="muted"> Issues raised during inspections will appear here with their resolution status.</span></div>}
        {issues.map((i) => (
          <div className="list-row" key={i.id}>
            <div className="grow"><b>{i.title}</b><div className="muted small">{i.id} · {i.category} · {i.daysAgo === 0 ? 'today' : `${i.daysAgo} days ago`}</div></div>
            <div className="pill-row">
              {i.recurring && <Badge tone="orange">Recurring ×{i.recurrenceCount}</Badge>}
              <Badge tone={severityTone[i.severity]}>{i.severity}</Badge><Badge tone={issueTone[i.status]}>{i.status}</Badge>
            </div>
          </div>
        ))}
      </section>

      <section className="card section">
        <div className="card-head">
          <h2 style={{ margin: 0 }}>Photos &amp; documents ({files.length})</h2>
          {isAdmin && (
            <>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={upload} />
              <button className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={uploading || files.length >= FILE_LIMITS.maxFiles}><Upload size={16} /> {uploading ? 'Uploading…' : 'Add files'}</button>
            </>
          )}
        </div>
        {files.length === 0 && <div className="empty-inline"><b>Nothing uploaded.</b><span className="muted"> Add site photos or PDF documents (up to {FILE_LIMITS.maxFiles}).</span></div>}
        {files.length > 0 && (
          <div className="thumbs">
            {files.map((f) => (
              <div className="thumb" key={f.id} style={{ position: 'relative' }}>
                {f.kind === 'image'
                  ? <button className="thumb-btn" onClick={() => setPreview(f)} aria-label={`Open ${f.name}`}><img src={f.data} alt={f.name} /></button>
                  : <a className="thumb-doc" href={f.data} download={f.name}><FileText size={30} /><span>PDF</span></a>}
                <div className="meta">{f.name}<br />{Math.max(1, Math.round(f.size / 1024))} KB · {formatDate(f.addedAt.slice(0, 10))}</div>
                {isAdmin && <button className="thumb-x" onClick={() => removeFile(f)} aria-label={`Remove ${f.name}`}><X size={14} /></button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {modal === 'edit' && <SiteFormModal site={site} actor={user} onClose={close} onSaved={(s, msg) => done(msg)} />}
      {modal === 'status' && <StatusModal site={site} actor={user} onClose={close} onSaved={done} />}
      {modal === 'officer' && <OfficerModal site={site} actor={user} onClose={close} onSaved={done} />}

      {modal === 'archive' && (
        <ConfirmDialog title="Archive this site?" confirmLabel="Archive site" busy={busy} error={dialogError} onClose={close}
          onConfirm={canArchive(site) ? () => run(() => archiveSite(siteId, user), `${site.name} was archived.`) : undefined}>
          {canArchive(site)
            ? <p>“{site.name}” will be hidden from inspectors, assignments and alerts. Its inspections, issues and reports are kept, and you can restore it at any time.</p>
            : <p>Only <b>completed</b> or inactive (<b>on hold / not started</b>) sites can be archived. This site is “{projectStatusLabel[site.projectStatus]}”. Change its status first.</p>}
        </ConfirmDialog>
      )}

      {modal === 'delete' && (
        <ConfirmDialog title="Delete this site?" confirmLabel="Delete permanently" danger busy={busy} error={dialogError} onClose={close}
          onConfirm={related.inspections + related.issues + related.cameras + related.alerts > 0 ? undefined : () => run(async () => { await deleteSite(siteId, user); navigate('/admin/sites', { replace: true, state: { toast: `${site.name} was deleted.` } }) }, '')}
          extra={related.inspections + related.issues + related.cameras + related.alerts > 0 && canArchive(site) ? <button className="btn" onClick={() => setModal('archive')}><Archive size={16} /> Archive instead</button> : null}>
          {related.inspections + related.issues + related.cameras + related.alerts > 0 ? (
            <>
              <p><b>This site cannot be deleted</b> because it has records that must be kept:</p>
              <ul>
                {related.inspections > 0 && <li>{related.inspections} inspection{related.inspections === 1 ? '' : 's'}</li>}
                {related.issues > 0 && <li>{related.issues} issue{related.issues === 1 ? '' : 's'}</li>}
                {related.cameras > 0 && <li>{related.cameras} CCTV camera{related.cameras === 1 ? '' : 's'}</li>}
                {related.alerts > 0 && <li>{related.alerts} alert{related.alerts === 1 ? '' : 's'}</li>}
              </ul>
              <p>Archive it instead – the history stays intact and the site disappears from active lists.{!canArchive(site) && ' (Set the status to completed, on hold or not started first.)'}</p>
            </>
          ) : <p>“{site.name}” has no inspections or issues. Deleting it removes the site{related.files ? ` and its ${related.files} file(s)` : ''} <b>permanently</b>. This cannot be undone.</p>}
        </ConfirmDialog>
      )}

      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <img src={preview.data} alt={preview.name} style={{ maxWidth: '94vw', maxHeight: '90vh', borderRadius: 10, background: '#fff' }} />
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}
