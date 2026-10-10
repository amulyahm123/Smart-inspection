import { useState } from 'react'
import { Dialog } from './Dialog'
import { getInspectors, getAllSites } from '../../services/dataService'
import { changeSiteStatus, assignOfficer } from '../../services/siteService'
import { PROJECT_STATUSES } from '../../data/siteOptions'

export function StatusModal({ site, actor, onClose, onSaved }) {
  const [value, setValue] = useState(site.projectStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true); setError('')
    try { await changeSiteStatus(site.id, value, actor); onSaved(`${site.name} is now “${PROJECT_STATUSES.find((s) => s.value === value).label}”.`) } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Dialog title="Change site status" onClose={onClose} busy={busy}>
      <div className="form-grid">
        <div className="muted small">{site.name} · {site.id}</div>
        <div className="seg two" role="radiogroup" aria-label="Site status">
          {PROJECT_STATUSES.map((s) => <button key={s.value} type="button" className={value === s.value ? 'on' : ''} onClick={() => setValue(s.value)} disabled={busy}>{s.label}</button>)}
        </div>
        {value === 'completed' && site.type === 'construction' && <div className="warn">Marking a project as completed sets its progress to 100%.</div>}
        {value === 'on-hold' && <div className="warn">An on-hold site is not counted as behind schedule and is not due for inspections.</div>}
        {error && <div className="warn red" role="alert">{error}</div>}
        <div className="action-bar" style={{ marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy || value === site.projectStatus}>{busy ? 'Saving…' : 'Update status'}</button>
        </div>
      </div>
    </Dialog>
  )
}

export function OfficerModal({ site, actor, onClose, onSaved }) {
  const [value, setValue] = useState(site.assignedOfficer)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const officers = getInspectors()
  const load = (id) => getAllSites().filter((s) => s.assignedOfficer === id && !s.archived).length
  const save = async () => {
    setBusy(true); setError('')
    try { await assignOfficer(site.id, value, actor); onSaved(`${site.name} is now assigned to ${officers.find((u) => u.id === value).name}.`) } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Dialog title="Assign officer" onClose={onClose} busy={busy}>
      <div className="form-grid">
        <div className="muted small">{site.name} · {site.id}</div>
        <label><span>Responsible officer</span>
          <select value={value} onChange={(e) => setValue(e.target.value)} disabled={busy}>
            {officers.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.designation} · {u.area} ({load(u.id)} sites)</option>)}
          </select>
        </label>
        <div className="muted small">The officer is notified and the site appears in their Old / New Sites list under “Assigned to me”.</div>
        {error && <div className="warn red" role="alert">{error}</div>}
        <div className="action-bar" style={{ marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy || value === site.assignedOfficer}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Dialog>
  )
}
