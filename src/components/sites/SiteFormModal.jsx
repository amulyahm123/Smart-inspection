import { useMemo, useRef, useState } from 'react'
import { LocateFixed, Paperclip, X } from 'lucide-react'
import { Dialog } from './Dialog'
import { getInspectors, getAllSites } from '../../services/dataService'
import { emptySite, siteToForm, validateSite, createSite, updateSite, prepareFile, addSiteFiles, SiteError } from '../../services/siteService'
import { SITE_TYPES, PROJECT_STATUSES, FREQUENCIES, CATEGORIES, DEPARTMENTS, STATES, FILE_LIMITS } from '../../data/siteOptions'
import { phases } from '../../data/sites'

function Field({ label, error, hint, required, children }) {
  return (
    <label>
      <span>{label}{required && <span className="bad"> *</span>}</span>
      {children}
      {hint && !error && <span className="muted small" style={{ fontWeight: 400 }}>{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </label>
  )
}

// Add (site = null) or edit (site = record) form. onSaved(site, message) is called after a successful save.
export default function SiteFormModal({ site, actor, onClose, onSaved }) {
  const editing = !!site
  const [v, setV] = useState(() => (site ? siteToForm(site) : emptySite('construction')))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [staged, setStaged] = useState([]) // prepared files waiting for the site to be saved
  const [fileMsg, setFileMsg] = useState('')
  const fileRef = useRef(null)
  const officers = getInspectors()
  const construction = v.type === 'construction'
  const departments = useMemo(() => [...new Set([...DEPARTMENTS, ...getAllSites().map((s) => s.department).filter(Boolean)])].sort(), [])
  const load = (id) => getAllSites().filter((s) => s.assignedOfficer === id && !s.archived).length
  const nextIdPreview = site ? site.id : '(generated automatically on save)'

  const set = (k, val) => { setV((p) => ({ ...p, [k]: val })); if (errors[k]) setErrors((p) => { const n = { ...p }; delete n[k]; return n }) }
  const switchType = (type) => {
    if (editing || type === v.type) return
    const fresh = emptySite(type)
    // keep what was already typed in the shared fields
    const keep = ['name', 'projectName', 'category', 'department', 'contractor', 'address', 'state', 'district', 'city', 'pin', 'lat', 'lng', 'radius', 'assignedOfficer', 'budget', 'remarks']
    setV({ ...fresh, ...Object.fromEntries(keep.map((k) => [k, v[k]])) })
    setErrors({})
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { setFormError('This browser cannot share your location. Enter the coordinates by hand.'); return }
    navigator.geolocation.getCurrentPosition(
      (p) => { set('lat', p.coords.latitude.toFixed(6)); set('lng', p.coords.longitude.toFixed(6)); setFormError('') },
      () => setFormError('Could not read your location. Allow location access or enter the coordinates by hand.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const pickFiles = async (e) => {
    const list = [...e.target.files]
    e.target.value = ''
    if (!list.length) return
    setFileMsg('')
    const room = FILE_LIMITS.maxFiles - staged.length
    if (list.length > room) setFileMsg(`Only ${FILE_LIMITS.maxFiles} files are allowed per site.`)
    const done = []
    for (const f of list.slice(0, Math.max(0, room))) {
      try { done.push(await prepareFile(f, actor)) } catch (err) { setFileMsg(err.message) }
    }
    setStaged((s) => [...s, ...done])
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    const found = validateSite(v, { mode: editing ? 'edit' : 'create', id: site ? site.id : null, pinOptional: editing && !site.pin })
    if (Object.keys(found).length) {
      setErrors(found)
      setFormError('Please correct the highlighted fields.')
      const first = document.querySelector('.site-form .err')
      if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setSaving(true)
    try {
      const saved = editing ? await updateSite(site.id, v, actor) : await createSite(v, actor)
      let message = editing ? `${saved.name} was updated.` : `${saved.name} was registered as ${saved.id}.`
      if (staged.length) {
        try { await addSiteFiles(saved.id, staged, actor) } catch (err) { message += ` The site was saved, but the files were not: ${err.message}` }
      }
      onSaved(saved, message)
    } catch (err) {
      if (err instanceof SiteError) { setErrors(err.errors || {}); setFormError(err.message) } else setFormError('Something went wrong while saving. Please try again.')
      setSaving(false)
    }
  }

  const text = (k, label, opts = {}) => (
    <Field label={label} error={errors[k]} required={opts.required} hint={opts.hint}>
      <input type={opts.type || 'text'} value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder={opts.placeholder} inputMode={opts.inputMode}
        step={opts.step} min={opts.min} max={opts.max} list={opts.list} maxLength={opts.maxLength} aria-invalid={!!errors[k]} disabled={saving} />
    </Field>
  )
  const area = (k, label, placeholder) => (
    <Field label={label} error={errors[k]}>
      <textarea value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} disabled={saving} />
    </Field>
  )
  const select = (k, label, options, opts = {}) => (
    <Field label={label} error={errors[k]} required={opts.required}>
      <select value={v[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} disabled={saving}>
        <option value="">{opts.placeholder || 'Select…'}</option>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </Field>
  )

  return (
    <Dialog title={editing ? `Edit site – ${site.id}` : 'Add new site'} onClose={onClose} wide busy={saving}>
      <form className="form-grid site-form" onSubmit={submit} noValidate>
        {formError && <div className="warn red" role="alert">{formError}</div>}

        <div className="form-section">
          <h3>Basic details</h3>
          <div className="form-2">
            <Field label="Site ID"><input value={nextIdPreview} readOnly disabled /></Field>
            <Field label="Site type" required hint={editing ? 'The type of a registered site cannot be changed.' : undefined}>
              <div className="seg two" role="group" aria-label="Site type">
                {SITE_TYPES.map((t) => (
                  <button type="button" key={t.value} className={v.type === t.value ? 'on' : ''} onClick={() => switchType(t.value)} disabled={saving || (editing && v.type !== t.value)}>{t.label}</button>
                ))}
              </div>
            </Field>
            {text('name', 'Site name', { required: true, placeholder: 'e.g. Govt. Primary School, Ward 7' })}
            {text('projectName', 'Project name', { required: construction, placeholder: 'e.g. School Building Upgrade 2026', hint: construction ? undefined : 'Optional for old sites' })}
            {select('category', 'Category', CATEGORIES, { required: true })}
            <Field label="Department" required error={errors.department}>
              <input list="dept-list" value={v.department} onChange={(e) => set('department', e.target.value)} placeholder="Choose or type" aria-invalid={!!errors.department} disabled={saving} />
              <datalist id="dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
            </Field>
            {text('contractor', 'Contractor / agency name', { required: construction, hint: construction ? undefined : 'Optional for old sites' })}
            {text('budget', 'Project budget (₹)', { type: 'number', min: 0, step: 'any', inputMode: 'decimal', required: construction, hint: construction ? undefined : 'Optional for old sites' })}
          </div>
        </div>

        <div className="form-section">
          <h3>Location</h3>
          <div className="form-grid">
            {text('address', 'Site address', { required: true })}
            <div className="form-2">
              {select('state', 'State', STATES, { required: true })}
              {text('district', 'District', { required: true })}
              {text('city', 'City / town', { required: true })}
              {text('pin', 'PIN code', { required: !(editing && !site.pin), inputMode: 'numeric', maxLength: 6, placeholder: '6 digits', hint: editing && !site.pin ? 'Not in the starting data – add it when known' : undefined })}
              {text('lat', 'GPS latitude', { required: true, type: 'number', step: 'any', placeholder: 'e.g. 18.5204' })}
              {text('lng', 'GPS longitude', { required: true, type: 'number', step: 'any', placeholder: 'e.g. 73.8567' })}
              {text('radius', 'GPS check-in radius (metres)', { required: true, type: 'number', min: 30, max: 1000, hint: 'How close an inspector must be to check in.' })}
              <div style={{ alignSelf: 'end' }}>
                <button type="button" className="btn btn-ghost" onClick={useMyLocation} disabled={saving}><LocateFixed size={16} /> Use my current location</button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Schedule &amp; status</h3>
          <div className="form-2">
            {text('startDate', 'Project start date', { type: 'date', required: construction, hint: construction ? undefined : 'Leave empty if unknown' })}
            {text('targetDate', 'Expected completion date', { type: 'date', required: construction, hint: construction ? undefined : 'Leave empty if unknown' })}
            {select('projectStatus', 'Site status', PROJECT_STATUSES, { required: true })}
            {select('inspectionFrequency', 'Inspection frequency', FREQUENCIES, { required: true })}
            <Field label="Assigned officer" required error={errors.assignedOfficer}>
              <select value={v.assignedOfficer} onChange={(e) => set('assignedOfficer', e.target.value)} aria-invalid={!!errors.assignedOfficer} disabled={saving}>
                <option value="">Select an officer…</option>
                {officers.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.designation} ({load(u.id)} sites)</option>)}
              </select>
            </Field>
            {construction && select('phase', 'Current phase', phases, { required: true })}
            {construction && text('actualProgress', 'Current progress (%)', { type: 'number', min: 0, max: 100, required: true, hint: 'Use 0 for a project that has not started.' })}
          </div>
        </div>

        {!construction && (
          <div className="form-section">
            <h3>Existing-site information <span className="muted small" style={{ fontWeight: 400 }}>(fill in what is available)</span></h3>
            <div className="form-2">
              {text('builtYear', 'Year built', { type: 'number', min: 1800, max: new Date().getFullYear(), inputMode: 'numeric' })}
              {text('lastInspectionDate', 'Date of last inspection', { type: 'date', max: new Date().toISOString().slice(0, 10) })}
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              {text('currentProgress', 'Current condition / progress', { placeholder: 'e.g. Operational, roof repair 60% done' })}
              {area('lastInspectionNotes', 'Previous inspection information', 'Findings of the last inspection, who inspected, etc.')}
              {area('pendingIssues', 'Pending issues', 'Known problems that are still open')}
              {area('historyNotes', 'Historical information', 'Earlier repairs, audits, complaints…')}
            </div>
          </div>
        )}

        <div className="form-section">
          <h3>Remarks &amp; attachments</h3>
          <div className="form-grid">
            {area('remarks', 'Description / remarks', 'Anything else the inspectors or admins should know')}
            <div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={pickFiles} />
              <button type="button" className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={saving || staged.length >= FILE_LIMITS.maxFiles}><Paperclip size={16} /> Attach photos / PDF documents</button>
              <div className="muted small" style={{ marginTop: 6 }}>Photos are shrunk automatically; PDFs up to {Math.round(FILE_LIMITS.maxDocBytes / 1024)} KB; max {FILE_LIMITS.maxFiles} files. {editing && 'More can be added on the site page.'}</div>
              {fileMsg && <div className="err" role="alert">{fileMsg}</div>}
              {staged.length > 0 && (
                <ul className="file-chips">
                  {staged.map((f) => (
                    <li key={f.id}>{f.kind === 'image' ? <img src={f.data} alt="" /> : <Paperclip size={14} />}<span>{f.name}</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setStaged(staged.filter((x) => x.id !== f.id))} disabled={saving}><X size={14} /></button></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Register site'}</button>
        </div>
      </form>
    </Dialog>
  )
}
