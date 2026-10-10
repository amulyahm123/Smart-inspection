import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shuffle, CalendarClock, CalendarCheck, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { getInspectors, getSites } from '../../services/dataService'
import { generateAssignment, getAssignmentHistory, cancelAssignment, countBookedOn, DURATIONS, STATUSES } from '../../services/assignmentService'
import { dayOffset, formatDate, formatDateTime } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'

const STATUS_TONE = { Assigned: 'blue', Upcoming: 'amber', Completed: 'green', Missed: 'red' }

export default function Assignments() {
  const inspectors = getInspectors()
  const sites = getSites()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)

  const [inspIds, setInspIds] = useState(inspectors.map((u) => u.id))
  const [siteIds, setSiteIds] = useState(sites.map((s) => s.id))
  const [date, setDate] = useState(dayOffset(1))
  const [from, setFrom] = useState('09:00')
  const [to, setTo] = useState('17:00')
  const [duration, setDuration] = useState(90)
  const [skipRegular, setSkipRegular] = useState(true)
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState('all')

  const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const history = getAssignmentHistory()
  const count = (s) => history.filter((h) => h.assignStatus === s).length
  const shown = filter === 'all' ? history : history.filter((h) => h.assignStatus === filter)

  const generate = () => { setResult(generateAssignment({ inspectorIds: inspIds, siteIds, date, from, to, duration, skipRegular })); refresh() }
  const cancel = (id) => { cancelAssignment(id); if (result && result.ok && result.assignment.id === id) setResult(null); refresh() }
  const a = result && result.ok ? result.assignment : null

  return (
    <>
      <PageHead title="Random inspection assignment" subtitle="Pick who and what is available, then let the engine choose inspector, site and time at random." />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={CalendarClock} label="Assigned" value={count('Assigned')} tone="blue" />
        <StatCard icon={CalendarCheck} label="Upcoming" value={count('Upcoming')} tone="amber" />
        <StatCard icon={CheckCircle2} label="Completed" value={count('Completed')} tone="green" />
        <StatCard icon={XCircle} label="Missed" value={count('Missed')} tone="red" />
      </div>

      <div className="grid grid-2">
        <section className="card form-grid">
          <h2>Inputs</h2>

          <div>
            <div className="card-head" style={{ marginBottom: 6 }}>
              <b className="small">Available inspectors ({inspIds.length}/{inspectors.length})</b>
              <span className="mini-actions"><button onClick={() => setInspIds(inspectors.map((u) => u.id))}>All</button><button onClick={() => setInspIds([])}>None</button></span>
            </div>
            <div className="check-grid">
              {inspectors.map((u) => (
                <label className="check" key={u.id}>
                  <input type="checkbox" checked={inspIds.includes(u.id)} onChange={() => toggle(inspIds, setInspIds, u.id)} />
                  <span>{u.name}<small className="muted"> · {countBookedOn(u.id, date)} booked on {date ? formatDate(date) : 'this date'}</small></span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="card-head" style={{ marginBottom: 6 }}>
              <b className="small">Available sites / projects ({siteIds.length}/{sites.length})</b>
              <span className="mini-actions">
                <button onClick={() => setSiteIds(sites.map((s) => s.id))}>All</button>
                <button onClick={() => setSiteIds(sites.filter((s) => s.type === 'existing').map((s) => s.id))}>Existing</button>
                <button onClick={() => setSiteIds(sites.filter((s) => s.type === 'construction').map((s) => s.id))}>Construction</button>
                <button onClick={() => setSiteIds([])}>None</button>
              </span>
            </div>
            <div className="check-grid scroll">
              {sites.map((s) => (
                <label className="check" key={s.id}>
                  <input type="checkbox" checked={siteIds.includes(s.id)} onChange={() => toggle(siteIds, setSiteIds, s.id)} />
                  <span>{s.name}<small className="muted"> · {s.type === 'existing' ? 'Existing' : 'Construction'}</small></span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-2">
            <label>Date<input type="date" min={dayOffset(0)} value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Inspection length
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}</select>
            </label>
          </div>
          <div className="form-2">
            <label>Time range – from<input type="time" step="1800" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>Time range – to<input type="time" step="1800" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={skipRegular} onChange={(e) => setSkipRegular(e.target.checked)} /><span>Skip the site’s regular officer (keeps visits unpredictable)</span></label>

          <button className="btn" onClick={generate}><Shuffle size={17} /> Generate Random Assignment</button>
          <p className="muted small">An inspector is never given two overlapping visits, and a site is never booked twice at the same time. “Assigned” = booked for a later day, “Upcoming” = due today.</p>
        </section>

        <section className="card">
          <h2 style={{ marginBottom: 10 }}>Generated assignment</h2>
          {!result && <p className="muted">Nothing generated yet. Press the button to create an assignment.</p>}
          {result && !result.ok && <div className="warn red" role="alert"><b>Could not generate an assignment</b><div className="small" style={{ marginTop: 3 }}>{result.reason}</div></div>}
          {a && (
            <>
              <dl className="result-list">
                <div><dt>Inspector</dt><dd>{a.inspector.name} <span className="muted small">({a.inspector.officerId})</span></dd></div>
                <div><dt>Site</dt><dd>{a.site.name}</dd></div>
                <div><dt>Date</dt><dd>{formatDate(a.date)}</dd></div>
                <div><dt>Time</dt><dd>{a.slot}</dd></div>
                <div><dt>Type</dt><dd>{a.type}</dd></div>
                <div><dt>Status</dt><dd><Badge tone={STATUS_TONE[a.assignStatus]}>{a.assignStatus}</Badge></dd></div>
              </dl>
              <p className="muted small" style={{ margin: '12px 0' }}>Picked at random from {result.optionsCount} valid options across {result.freeInspectors} free inspector{result.freeInspectors === 1 ? '' : 's'}. Saved, and {a.inspector.name.split(' ')[0]} has been notified.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={generate}><Shuffle size={16} /> Generate another</button>
                {a.assignStatus === 'Assigned' && <button className="btn btn-ghost" onClick={() => cancel(a.id)}><Trash2 size={15} /> Cancel this assignment</button>}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card section">
        <div className="card-head"><h2>Assignment history ({history.length})</h2></div>
        <div className="cat-tabs" role="tablist" aria-label="Assignment status">
          <button role="tab" aria-selected={filter === 'all'} className={`cat-tab ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All ({history.length})</button>
          {STATUSES.map((s) => <button key={s} role="tab" aria-selected={filter === s} className={`cat-tab ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>{s} ({count(s)})</button>)}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Assigned on</th><th>Inspector</th><th>Site</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((h) => (
                <tr key={h.id}>
                  <td>{formatDateTime(h.assignedAt)}</td>
                  <td><Link to={`/admin/officers/${h.inspectorId}`}><b>{h.inspector.name}</b></Link></td>
                  <td><Link to={`/admin/sites/${h.siteId}`}>{h.site.name}</Link></td>
                  <td>{formatDate(h.date)}</td><td>{h.slot}</td><td>{h.type}</td>
                  <td><Badge tone={STATUS_TONE[h.assignStatus]}>{h.assignStatus}</Badge></td>
                  <td>{h.assignStatus === 'Assigned' && h.status === 'upcoming' && <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => cancel(h.id)} aria-label={`Cancel assignment ${h.id}`}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="muted" style={{ padding: 12 }}>No assignments with this status.</p>}
        </div>
      </section>
    </>
  )
}
