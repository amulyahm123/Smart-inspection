import { completeInspection } from '../../services/dataService'
import GpsVerifier from './GpsVerifier'

export default function CheckoutStep({ site, insp }) {
  const { draft, markCompleted } = insp
  const onConfirm = (checkOut) => {
    completeInspection(draft.recordId, checkOut)
    markCompleted(checkOut)
  }
  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <b>Inspection submitted.</b>
        <p className="muted">Verify your GPS position to check out. This completes the inspection and records your attendance.</p>
      </div>
      <GpsVerifier site={site} purpose="checkout" onConfirm={onConfirm} />
    </>
  )
}
