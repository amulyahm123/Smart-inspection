import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Pencil, RefreshCw, FolderKanban, HardHat, Building2, Activity, CheckCircle2, MapPin, Archive } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getSiteRows } from '../../services/adminService'
import { getInspectors } from '../../services/dataService'
import { getAllRisks } from '../../services/riskService'
import { RiskBar } from '../../components/risk/RiskVisuals'
import { inspectionSchedule } from '../../utils/schedule'
import { siteTone, siteLabel, progressStatus } from '../../utils/status'
import { formatDate } from '../../utils/date'
import { PROJECT_STATUSES, projectStatusLabel, projectStatusTone, frequencyLabel } from '../../data/siteOptions'
import PageHead from '../../components/ui/PageHead'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import Toast from '../../components/ui/Toast'
import SiteFormModal from '../../components/sites/SiteFormModal'
import { StatusModal } from '../../components/sites/QuickModals'

const SORTS = {
  newest: ['Newest first', (a, b) => (b.site.registeredOn || '').localeCompare(a.site.registeredOn || '') || b.site.id.localeCompare(a.site.id, undefined, { numeric: true })],
  name: ['Name A–Z', (a, b) => a.site.name.localeCompare(b.site.name)],
  id: ['Site ID', (a, b) => a.site.id.localeCompare(b.site.id, undefined, { numeric: true })],
  inspected: ['Last inspected', (a, b) => (b.site.lastInspected || '').localeCompare(a.site.lastInspected || '')],
  risk: ['Highest risk', (a, b) => (b.risk ? b.risk.score : -1) - (a.risk ? a.risk.score : -1)],
  issues: ['Most open issues', (a, b) => b.openIssues - a.openIssues],
}

export default function Sites() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [q, setQ] = useState('')
  const [params] = useSearchParams()
  const [f, setF] = useState({ type: 'all', department: 'all', officer: 'all', district: 'all', status: 'all', view: 'active', risk: ['high', 'medium', 'low'].includes(params.get('risk')) ? params.get('risk') : 'all' })
  const [sort, setSort] = useState(params.get('sort') === 'risk' || params.get('risk') ? 'risk' : 'newest')
  const [form, setForm] = useState(null) // null | { site } (site = null → add)
  const [statusFor, setStatusFor] = useState(null)
  const [toast, setToast] = useState(location.state && location.state.toast ? { text: location.state.toast, tone: 'ok' } : null)
  const setFilter = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const riskMap = Object.fromEntries(getAllRisks().map((x) => [x.site.id, x.risk]))
  const all = getSiteRows().map((r) => ({ ...r, risk: riskMap[r.site.id] || null }))
  const active = all.filter((r) => !r.site.archived)
  const officers = getInspectors()
  const departments = useMemo(() => [...new Set(all.map((r) => r.site.department).filter(Boolean))].sort(), [all.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const districts = useMemo(() => [...new Set(all.map((r) => r.site.district).filter(Boolean))].sort(), [all.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = {
    total: active.length,
    fresh: active.filter((r) => r.site.type === 'construction').length,
    old: active.filter((r) => r.site.type === 'existing').length,
    progress: active.filter((r) => r.site.projectStatus === 'in-progress').length,
    done: active.filter((r) => r.site.projectStatus === 'completed').length,
  }
  const archivedCount = all.length - active.length

  const needle = q.trim().toLowerCase()
  const rows = all.filter(({ site: s, officer, risk }) =>
    (f.view === 'all' || (f.view === 'archived') === !!s.archived) &&
    (f.type === 'all' || s.type === f.type) && (f.department === 'all' || s.department === f.department) &&
    (f.officer === 'all' || s.assignedOfficer === f.officer) && (f.district === 'all' || s.district === f.district) &&
    (f.status === 'all' || s.projectStatus === f.status) && (f.risk === 'all' || (risk && risk.level === f.risk)) &&
    (!needle || `${s.name} ${s.projectName || ''} ${s.id} ${s.area} ${s.city || ''} ${s.district || ''} ${s.contractor || ''} ${officer ? officer.name : ''}`.toLowerCase().includes(needle))
  ).sort(SORTS[sort][1])
  const filtered = needle || Object.entries(f).some(([k, val]) => (k === 'view' ? val !== 'active' : val !== 'all'))
  const clear = () => { setQ(''); setF({ type: 'all', department: 'all', officer: 'all', district: 'all', status: 'all', view: 'active', risk: 'all' }) }

  const say = (text, tone = 'ok') => setToast({ text, tone })
  const typeCell = (s) => (s.type === 'existing' ? 'Existing' : `New · ${s.phase}`)
  const actions = (s) => (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button className="btn btn-ghost icon-btn" title="Edit site" aria-label={`Edit ${s.name}`} onClick={() => setForm({ site: s })}><Pencil size={15} /></button>
      <button className="btn btn-ghost icon-btn" title="Change status" aria-label={`Change status of ${s.name}`} disabled={s.archived} onClick={() => setStatusFor(s)}><RefreshCw size={15} /></button>
    </div>
  )
  const badges = (s) => (
    <div className="pill-row">
      <Badge tone={projectStatusTone[s.projectStatus]}>{projectStatusLabel[s.projectStatus]}</Badge>
      {s.archived && <Badge tone="gray">Archived</Badge>}
    </div>
  )

  return (
    <>
      <PageHead title="Sites / projects" subtitle="Register, manage and monitor every old and new site.">
        <button className="btn" onClick={() => setForm({ site: null })}><Plus size={18} /> Add new site</button>
      </PageHead>

      <div className="grid grid-4 stats-5">
        <StatCard icon={FolderKanban} label="Total sites" value={stats.total} />
        <StatCard icon={HardHat} label="New sites" value={stats.fresh} tone="amber" />
        <StatCard icon={Building2} label="Existing sites" value={stats.old} tone="gray" />
        <StatCard icon={Activity} label="In-progress projects" value={stats.progress} />
        <StatCard icon={CheckCircle2} label="Completed projects" value={stats.done} tone="green" />
      </div>

      <div className="filters" style={{ marginTop: 18 }}>
        <input placeholder="Search name, ID, city, contractor or officer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sites" style={{ flex: '2 1 240px' }} />
        <select value={f.type} onChange={setFilter('type')} aria-label="Filter by site type"><option value="all">All types</option><option value="existing">Old / existing</option><option value="construction">New sites</option></select>
        <select value={f.department} onChange={setFilter('department')} aria-label="Filter by department"><option value="all">All departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <select value={f.officer} onChange={setFilter('officer')} aria-label="Filter by officer"><option value="all">All officers</option>{officers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <select value={f.district} onChange={setFilter('district')} aria-label="Filter by district"><option value="all">All districts</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <select value={f.status} onChange={setFilter('status')} aria-label="Filter by status"><option value="all">All statuses</option>{PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select value={f.risk} onChange={setFilter('risk')} aria-label="Filter by risk level"><option value="all">All risk levels</option><option value="high">High risk</option><option value="medium">Medium risk</option><option value="low">Low risk</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort sites">{Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>Sort: {label}</option>)}</select>
        <select value={f.view} onChange={setFilter('view')} aria-label="Show active or archived"><option value="active">Active sites</option><option value="archived">Archived ({archivedCount})</option><option value="all">Active + archived</option></select>
      </div>

      {rows.length === 0 && (
        <div className="card empty-state">
          <Search size={22} />
          {all.length === 0 ? (
            <><b>No sites registered yet</b><span className="muted">Add the first site to start inspections.</span><button className="btn" onClick={() => setForm({ site: null })}><Plus size={16} /> Add new site</button></>
          ) : (
            <><b>No sites match</b><span className="muted">Try different filters or search words.</span>{filtered && <button className="btn btn-ghost" onClick={clear}>Clear filters</button>}</>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="card table-wrap only-wide">
            <table>
              <thead><tr><th>Site</th><th>Type</th><th>Location</th><th>Department</th><th>Officer</th><th>Status</th><th>Risk</th><th>Next inspection</th><th>Open issues</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {rows.map(({ site: s, officer, openIssues, lastDone, risk }) => {
                  const sch = inspectionSchedule(s, lastDone)
                  return (
                    <tr key={s.id} className={`row-link${s.archived ? ' is-archived' : ''}`} onClick={() => navigate(`/admin/sites/${s.id}`)}>
                      <td><Link to={`/admin/sites/${s.id}`} onClick={(e) => e.stopPropagation()}><b>{s.name}</b></Link><div className="muted small">{s.id}{s.projectName ? ` · ${s.projectName}` : ''}</div></td>
                      <td>{typeCell(s)}</td>
                      <td>{s.area}{s.district && s.district !== s.area && <div className="muted small">{s.district}</div>}</td>
                      <td className="small">{s.department || '–'}</td>
                      <td>{officer ? officer.name : <span className="bad">Unassigned</span>}<div className="muted small">{frequencyLabel[s.inspectionFrequency]}</div></td>
                      <td>{badges(s)}<div style={{ marginTop: 4 }}><Badge tone={siteTone[s.status]}>{siteLabel[s.status]}</Badge></div></td>
                      <td title={risk ? risk.summary : ''}><RiskBar risk={risk} /><div className="muted small">{risk ? risk.levelLabel : ''}</div></td>
                      <td><Badge tone={sch.tone}>{sch.label}</Badge><div className="muted small">Last: {formatDate(s.lastInspected)}</div></td>
                      <td>{openIssues > 0 ? <Badge tone="orange">{openIssues}</Badge> : <span className="muted">0</span>}</td>
                      <td>{actions(s)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="site-cards only-narrow">
            {rows.map(({ site: s, officer, openIssues, lastDone, risk }) => {
              const sch = inspectionSchedule(s, lastDone)
              const ps = s.type === 'construction' ? progressStatus(s.expectedProgress, s.actualProgress) : null
              return (
                <div key={s.id} className={`card site-card${s.archived ? ' is-archived' : ''}`}>
                  <Link to={`/admin/sites/${s.id}`} className="site-card-main">
                    <b>{s.name}</b>
                    <div className="muted small">{s.id} · {typeCell(s)}</div>
                    <ul className="meta-list">
                      <li><MapPin size={14} /> {s.area}{s.district && s.district !== s.area ? `, ${s.district}` : ''}</li>
                      <li><Archive size={14} /> {s.department || '–'}</li>
                      <li>Officer: {officer ? officer.name : 'Unassigned'} · {frequencyLabel[s.inspectionFrequency]}</li>
                    </ul>
                    <div style={{ margin: '4px 0' }}><RiskBar risk={risk} /></div>
                    <div className="pill-row">
                      {badges(s)}
                      <Badge tone={siteTone[s.status]}>{siteLabel[s.status]}</Badge>
                      <Badge tone={sch.tone}>{sch.label}</Badge>
                      {ps && <Badge tone={ps.tone}>{ps.label}</Badge>}
                      {openIssues > 0 && <Badge tone="orange">{openIssues} open issue{openIssues === 1 ? '' : 's'}</Badge>}
                    </div>
                  </Link>
                  {actions(s)}
                </div>
              )
            })}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>Showing {rows.length} of {all.length} site{all.length === 1 ? '' : 's'}.</p>
        </>
      )}

      {form && (
        <SiteFormModal site={form.site} actor={user} onClose={() => setForm(null)}
          onSaved={(saved, msg) => { setForm(null); refresh(); say(msg); if (!form.site) navigate(`/admin/sites/${saved.id}`, { state: { toast: msg } }) }} />
      )}
      {statusFor && <StatusModal site={statusFor} actor={user} onClose={() => setStatusFor(null)} onSaved={(msg) => { setStatusFor(null); refresh(); say(msg) }} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}
