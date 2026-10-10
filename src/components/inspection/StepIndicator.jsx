import { Check } from 'lucide-react'

export default function StepIndicator({ steps, current, locked, onSelect }) {
  return (
    <div className="stepper" role="list">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : ''
        const canGo = i < current && i > 0 && !locked
        return (
          <button key={label} role="listitem" className={`step ${state}`} disabled={!canGo} onClick={() => onSelect(i)}
            aria-current={i === current ? 'step' : undefined}>
            <span className="n">{state === 'done' ? <Check size={15} /> : i + 1}</span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
