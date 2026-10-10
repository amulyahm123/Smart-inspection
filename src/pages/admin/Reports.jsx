import { Link } from 'react-router-dom'
import { ClipboardCheck, CalendarCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getReportData } from '../../services/adminService'
import { getAllRisks, getRiskTrend, getRiskConfig } from '../../services/riskService'
import { RiskBar } from '../../components/risk/RiskVisuals'
import { FormulaNote } from '../../components/risk/RiskPanel'
import { RISK_COLOR, TREND_META, CONF_LABEL } from '../../utils/risk'
import { formatDateTime } from '../../utils/date'
import PageHead from '../../components/ui/PageHead'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import DonutChart from '../../components/charts/DonutChart'
import BarList from '../../components/charts/BarList'
import StackedBars from '../../components/charts/StackedBars'

const sevTone = { Critical: 'red', High: 'orange', Medium: 'amber', Low: 'blue' }

export default function Reports() {
  const r = getReportData()
  const ins = r.inspections
  const risks = getAllRisks().filter((x) => x.risk).sort((a, b) => b.risk.score - a.risk.score)
  const lvl = (l) => risks.filter((x) => x.risk.level === l).length
  const updated = risks.reduce((m, x) => (x.risk.calculatedAt > m ? x.risk.calculatedAt : m), '')

  return (
    <>
      <PageHead title="Reports" subtitle="Summary statistics and trends across all sites, projects and officers" />

      <div className="grid grid-4">
        <StatCard icon={ClipboardCheck} label="Inspection completion rate" value={`${ins.rate}%`} tone="green" />
        <StatCard icon={CalendarCheck} label="Average attendance (30 days)" value={r.attendance.percent === null ? '–' : `${r.attendance.percent}%`} tone="blue" />
        <StatCard icon={AlertTriangle} label="Open issues" value={`${r.issueTotals.open} of ${r.issueTotals.total}`} tone="orange" />
        <StatCard icon={CheckCircle2} label="Recurring, unresolved" value={r.issueTotals.recurring} tone="red" />
      </div>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Inspection completion</h2></div>
          <DonutChart centerValue={`${ins.rate}%`} centerLabel="completed" data={[
            { label: 'Completed', value: ins.completed, color: 'var(--green)' }, { label: 'Pending', value: ins.pending, color: '#e0a82f' },
            { label: 'Upcoming', value: ins.upcoming, color: 'var(--blue)' }, { label: 'Missed', value: ins.missed, color: 'var(--red)' },
          ]} />
          <p className="muted small" style={{ marginTop: 8 }}>Completion rate = completed ÷ (completed + pending + missed). Upcoming visits are not counted yet.</p>
        </section>
        <section className="card">
          <div className="card-head"><h2>Weekly trend</h2></div>
          <StackedBars rows={r.weekly.map((w) => ({ label: w.label, parts: [{ value: w.completed, tone: 'green' }, { value: w.missed, tone: 'red' }] }))}
            legend={[{ label: 'Completed', tone: 'green' }, { label: 'Missed', tone: 'red' }]} />
        </section>
      </div>

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-head"><h2>Issues by severity</h2></div>
          <BarList rows={r.issuesBySeverity.map(([label, value]) => ({ label, value, tone: sevTone[label] }))} />
        </section>
        <section className="card">
          <div className="card-head"><h2>Issues by category</h2></div>
          <BarList rows={r.issuesByCategory.map(([label, value]) => ({ label, value, tone: 'blue' }))} />
        </section>
      </div>

      <section className="card section">
        <div className="card-head"><h2>Site risk overview</h2><span className="muted small">{updated ? `Scores updated ${formatDateTime(updated)}` : ''}</span></div>
        <div className="grid grid-2">
          <DonutChart centerValue={risks.length} centerLabel="sites scored" data={[
            { label: 'High risk', value: lvl('high'), color: RISK_COLOR.high }, { label: 'Medium risk', value: lvl('medium'), color: RISK_COLOR.medium }, { label: 'Low risk', value: lvl('low'), color: RISK_COLOR.low },
          ]} />
          <div className="muted small">
            <p style={{ marginTop: 0 }}>{risks.filter((x) => x.risk.confidence === 'low').length} site(s) have limited data (marked *). Archived sites are not scored.</p>
            <details><summary style={{ cursor: 'pointer' }}><b>How scores are calculated</b></summary><FormulaNote cfg={getRiskConfig()} /></details>
          </div>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Site</th><th>Risk score</th><th>Level</th><th>Trend</th><th>Data confidence</th><th>Main reason</th></tr></thead>
            <tbody>
              {risks.map(({ site, risk }) => {
                const t = TREND_META[getRiskTrend(site.id).direction]
                return (
                  <tr key={site.id}>
                    <td><Link to={`/admin/sites/${site.id}`}><b>{site.name}</b></Link><div className="muted small">{site.id}</div></td>
                    <td><RiskBar risk={risk} /></td><td><Badge tone={{ low: 'green', medium: 'amber', high: 'red' }[risk.level]}>{risk.levelLabel}</Badge></td>
                    <td className="small">{t.arrow} {t.label === 'Not enough history yet' ? 'New' : t.label}</td><td>{CONF_LABEL[risk.confidence]}</td>
                    <td className="small">{risk.reasons.length ? risk.reasons[0].text : 'No risk factors found'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section">
        <div className="card-head"><h2>Project progress</h2><span className="muted small">bar = actual · black marker = expected</span></div>
        {r.projects.map((p) => (
          <div className="proj-row" key={p.id}>
            <div className="proj-top"><Link to={`/admin/sites/${p.id}`}><b>{p.name}</b></Link><Badge tone={p.tone}>{p.status}</Badge></div>
            <div className="meter"><span className={`fill-${p.tone}`} style={{ width: `${p.actual}%` }} /><i style={{ left: `${p.expected}%` }} title="Expected" /></div>
            <div className="muted small">{p.phase} · actual {p.actual}% vs expected {p.expected}% ({p.diff > 0 ? '+' : ''}{p.diff}%)</div>
          </div>
        ))}
      </section>

      <section className="card section">
        <div className="card-head"><h2>Officer activity</h2></div>
        <StackedBars rows={r.officers.map((o) => ({ label: o.name, parts: [{ value: o.completed, tone: 'green' }, { value: o.pending, tone: 'amber' }, { value: o.missed, tone: 'red' }] }))}
          legend={[{ label: 'Completed', tone: 'green' }, { label: 'Pending', tone: 'amber' }, { label: 'Missed', tone: 'red' }]} />
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Officer</th><th>Completed</th><th>Pending</th><th>Missed</th><th>Issues reported</th><th>Attendance</th></tr></thead>
            <tbody>{r.officers.map((o) => <tr key={o.id}><td><Link to={`/admin/officers/${o.id}`}><b>{o.name}</b></Link></td><td>{o.completed}</td><td>{o.pending}</td><td>{o.missed}</td><td>{o.issues}</td><td>{o.attendance === null ? '–' : `${o.attendance}%`}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  )
}
