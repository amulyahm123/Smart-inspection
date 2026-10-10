import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertOctagon, BellRing, Repeat2, Video, SearchX, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getSites, getInspectors } from '../../services/dataService'
import { buildAlerts, isActive, visibleTo, ALERT_TYPES, SEVERITY_RANK } from '../../services/alertService'
import { STATUS_OPTIONS } from '../../components/alerts/alertMeta'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import AlertRow from '../../components/alerts/AlertRow'
import AlertDetail from '../../components/alerts/AlertDetail'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const FILTERS_OFF = { severity: 'all', site: 'all', inspector: 'all', status: 'active', mine: false }

// Central alert page for Inspector and Admin.
export default function Alerts() {
  const { user } = useAuth()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [f, setF] = useState(FILTERS_OFF)
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('priority')
  const [params, setParams] = useSearchParams()
  const [openId, setOpenId] = useState(params.get('alert'))
  const closeAlert = () => { setOpenId(null); setParams({}, { replace: true }) }
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const all = buildAlerts().filter(visibleTo(user))
  const active = all.filter(isActive)

  // Everything except the type chips – so the chip counts always match the other filters
  const passes = (a) =>
    (f.severity === 'all' || a.severity === f.severity) &&
    (f.site === 'all' || a.siteId === f.site) &&
    (f.inspector === 'all' || a.inspectorId === f.inspector) &&
    (f.status === 'all' || (f.status === 'active' ? isActive(a) : a.status === f.status)) &&
    (!f.mine || a.inspectorId === user.id)
  const base = all.filter(passes)
  const shown = base
    .filter((a) => type === 'all' || a.types.includes(type))
    .sort((a, b) => sort === 'newest' ? b.at - a.at : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.at - a.at)

  const sites = [...new Map(all.map((a) => [a.siteId, a.siteName])).entries()].sort((x, y) => x[1].localeCompare(y[1]))
  const filtered = f.severity !== 'all' || f.site !== 'all' || f.inspector !== 'all' || f.status !== 'active' || f.mine || type !== 'all'
  const clear = () => { setF(FILTERS_OFF); setType('all') }
  const openAlert = openId ? all.find((a) => a.id === openId) : null

  return (
    <>
      <PageHead title="Ongoing / pending alerts" subtitle="Issues, delays, missed and pending inspections and CCTV events in one place" />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={BellRing} label="Active alerts" value={active.length} tone="blue" />
        <StatCard icon={AlertOctagon} label="Critical" value={active.filter((a) => a.severity === 'Critical').length} tone="red" />
        <StatCard icon={Repeat2} label="Recurring – escalate" value={active.filter((a) => a.escalated).length} tone="orange" />
        <StatCard icon={Video} label="CCTV alerts" value={active.filter((a) => a.kind === 'cctv').length} tone="gray" />
      </div>

      <div className="cat-tabs" role="tablist" aria-label="Alert type">
        <button role="tab" aria-selected={type === 'all'} className={`cat-tab ${type === 'all' ? 'on' : ''}`} onClick={() => setType('all')}>All types ({base.length})</button>
        {ALERT_TYPES.filter((t) => t.key !== 'risk' || user.role === 'admin').map((t) => (
          <button key={t.key} role="tab" aria-selected={type === t.key} className={`cat-tab ${type === t.key ? 'on' : ''}`} onClick={() => setType(t.key)}>
            {t.label} ({base.filter((a) => a.types.includes(t.key)).length})
          </button>
        ))}
      </div>

      <div className="filters">
        <select value={f.severity} onChange={(e) => set('severity', e.target.value)} aria-label="Filter by severity">
          <option value="all">All severities</option>
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={f.site} onChange={(e) => set('site', e.target.value)} aria-label="Filter by site or project">
          <option value="all">All sites / projects</option>
          {sites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={f.inspector} onChange={(e) => set('inspector', e.target.value)} aria-label="Filter by inspector">
          <option value="all">All inspectors</option>
          {getInspectors().map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Filter by status">
          <option value="active">Active (not resolved)</option>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort alerts">
          <option value="priority">Sort: severity first</option>
          <option value="newest">Sort: newest first</option>
        </select>
        {user.role === 'inspector' && <button className={`btn ${f.mine ? '' : 'btn-ghost'}`} onClick={() => set('mine', !f.mine)}>My alerts</button>}
        {filtered && <button className="btn btn-ghost" onClick={clear}><X size={15} /> Clear filters</button>}
      </div>

      <p className="muted small" style={{ margin: '0 0 10px' }}>Showing {shown.length} alert{shown.length === 1 ? '' : 's'}. Tap one for details.</p>
      {shown.length === 0 && (
        <div className="card muted" style={{ textAlign: 'center', padding: 28 }}>
          <SearchX size={26} /><p style={{ marginTop: 6 }}>No alerts match these filters.</p>
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={clear}>Clear filters</button>
        </div>
      )}
      <div className="alert-list">
        {shown.map((a) => <AlertRow key={a.id} alert={a} onOpen={setOpenId} />)}
      </div>

      {openAlert && <AlertDetail alert={openAlert} user={user} onClose={closeAlert} onChanged={refresh} />}
      {user.role === 'admin' && <p className="muted small" style={{ marginTop: 16 }}>Admin: open an issue alert to move it through the lifecycle, or use the <Link to="/admin/issues"><b>Issues</b></Link> page.</p>}
    </>
  )
}
