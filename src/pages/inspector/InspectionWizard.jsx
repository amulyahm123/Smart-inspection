import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInspection, STEPS_BY_KIND } from '../../context/InspectionContext'
import { getSiteById } from '../../services/dataService'
import { getSummary } from '../../utils/inspection'
import { sitePath } from '../../utils/paths'
import PageHead from '../../components/ui/PageHead'
import StepIndicator from '../../components/inspection/StepIndicator'
import GpsVerifier from '../../components/inspection/GpsVerifier'
import ChecklistStep from '../../components/inspection/ChecklistStep'
import ProgressStep from '../../components/inspection/ProgressStep'
import PhaseItemsStep from '../../components/inspection/PhaseItemsStep'
import EvidenceStep from '../../components/inspection/EvidenceStep'
import IssuesStep from '../../components/inspection/IssuesStep'
import SummaryStep from '../../components/inspection/SummaryStep'
import ConstructionSummaryStep from '../../components/inspection/ConstructionSummaryStep'
import CheckoutStep from '../../components/inspection/CheckoutStep'
import CompletedScreen from '../../components/inspection/CompletedScreen'

// Used for BOTH old and new sites. The step list comes from the inspection kind.
// Old:  Check-in → Checklist → Evidence → Issues → Summary → Check-out
// New:  Check-in → Progress → Checklist → Materials → Evidence → Issues → Summary → Check-out
export default function InspectionWizard() {
  const { siteId } = useParams()
  const insp = useInspection()
  const { draft } = insp
  const site = getSiteById(siteId)

  if (!site) return <Navigate to="/inspector" replace />
  if (!draft || draft.siteId !== siteId) return <Navigate to={sitePath(site)} replace />

  const steps = STEPS_BY_KIND[draft.kind]
  const construction = draft.kind === 'construction'
  const summary = getSummary(draft, site)
  const done = draft.step === steps.length
  const label = steps[draft.step]

  return (
    <>
      {!done && !draft.submitted && <Link to={sitePath(site)} className="back-link"><ArrowLeft size={16} /> {construction ? 'Project' : 'Site'} details (progress is kept)</Link>}
      <PageHead title={done ? 'All done' : construction ? 'Construction inspection' : 'Site inspection'} subtitle={site.name} />
      {!done && <StepIndicator steps={steps} current={draft.step} locked={draft.submitted} onSelect={insp.goto} />}

      {label === 'Check-in' && <GpsVerifier site={site} purpose="checkin" onConfirm={insp.setCheckIn} />}
      {label === 'Progress' && <ProgressStep site={site} insp={insp} />}
      {label === 'Checklist' && (construction ? <PhaseItemsStep site={site} insp={insp} mode="work" /> : <ChecklistStep site={site} insp={insp} summary={summary} />)}
      {label === 'Materials' && <PhaseItemsStep site={site} insp={insp} mode="materials" />}
      {label === 'Evidence' && <EvidenceStep insp={insp} summary={summary} />}
      {label === 'Issues' && <IssuesStep site={site} insp={insp} summary={summary} />}
      {label === 'Summary' && (construction ? <ConstructionSummaryStep site={site} insp={insp} summary={summary} /> : <SummaryStep site={site} insp={insp} summary={summary} />)}
      {label === 'Check-out' && <CheckoutStep site={site} insp={insp} />}
      {done && <CompletedScreen site={site} insp={insp} summary={summary} />}
    </>
  )
}
