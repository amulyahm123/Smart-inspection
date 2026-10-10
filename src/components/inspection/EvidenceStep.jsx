import { useAuth } from '../../context/AuthContext'
import EvidenceCapture from './EvidenceCapture'
import Badge from '../ui/Badge'

export default function EvidenceStep({ insp, summary }) {
  const { user } = useAuth()
  const { draft, addEvidence, removeEvidence, next, back } = insp
  const forItem = (id) => draft.evidence.filter((e) => e.link.type === 'item' && e.link.ref === id)
  const general = draft.evidence.filter((e) => e.link.type === 'general')

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>Evidence capture</h2>
        <p className="muted">Every photo is stamped with time, your GPS position and your officer ID. Add a photo for each flagged item. Photos for issues are added inside the issue form.</p>
      </div>

      {summary.flagged.length === 0 && <div className="card muted" style={{ marginBottom: 14 }}>No items were flagged, so no item photos are needed.</div>}
      {summary.flagged.map((item) => {
        const photos = forItem(item.id)
        return (
          <section className="card" key={item.id} style={{ marginBottom: 14 }}>
            <div className="card-head">
              <div><b>{item.label}</b><div className="muted small">{item.category}</div></div>
              <Badge tone={item.level === 'fail' ? 'red' : 'amber'}>{item.level === 'fail' ? 'Fail' : 'Attention'}</Badge>
            </div>
            <EvidenceCapture link={{ type: 'item', ref: item.id }} label={item.label} items={photos}
              onAdd={addEvidence} onRemove={removeEvidence} user={user} checkIn={draft.checkIn} />
            {photos.length === 0 && <p className="muted small" style={{ marginTop: 8 }}>No photo yet – recommended for flagged items.</p>}
          </section>
        )
      })}

      <section className="card">
        <div className="card-head"><div><b>General site photos</b><div className="muted small">Overall condition, entrance, anything else worth recording</div></div></div>
        <EvidenceCapture link={{ type: 'general' }} label={`${draft.siteId} general`} items={general}
          onAdd={addEvidence} onRemove={removeEvidence} user={user} checkIn={draft.checkIn} />
      </section>

      <div className="action-bar">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn" onClick={next}>Continue to issues ({summary.evidence} photos)</button>
      </div>
    </>
  )
}
