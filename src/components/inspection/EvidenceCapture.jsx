import { useRef } from 'react'
import { Camera, Upload, X, MapPin } from 'lucide-react'
import { buildEvidence, placeholderPhoto } from '../../services/evidenceService'
import { formatTime } from '../../utils/date'

// Simulated photo capture (or real upload). Every photo gets timestamp + GPS + inspector identity.
export default function EvidenceCapture({ link, label, items, onAdd, onRemove, user, checkIn }) {
  const fileRef = useRef(null)
  const add = (photo) => onAdd(buildEvidence({ photo, link, label, user, checkIn }))
  const upload = (e) => {
    const f = e.target.files && e.target.files[0]
    if (f) add(URL.createObjectURL(f))
    e.target.value = ''
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={() => add(placeholderPhoto(label))}><Camera size={16} /> Simulate photo</button>
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current.click()}><Upload size={16} /> Upload / take photo</button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={upload} />
      </div>
      {items.length > 0 && (
        <div className="thumbs">
          {items.map((e) => (
            <div className="thumb" key={e.id}>
              <div style={{ position: 'relative' }}>
                <img src={e.photo} alt={`Evidence: ${e.label}`} />
                <button type="button" className="thumb-x" onClick={() => onRemove(e.id)} aria-label="Remove photo"><X size={13} /></button>
              </div>
              <div className="meta">
                <div>{formatTime(e.timestamp)} · {e.officerId}</div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}><MapPin size={10} /> {e.lat ? `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}` : 'no GPS'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
