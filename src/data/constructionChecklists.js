// Phase-specific checklists. "work" items use Pass / Attention / Fail.
// "materials" use Acceptable / Needs attention / Not acceptable. Keep these simple – visual checks only.
import { phases } from './sites'

const raw = {
  Foundation: { work: ['Excavation & levels', 'Foundation work', 'Reinforcement placement', 'Curing of concrete'], materials: ['Steel', 'Cement', 'Sand', 'Concrete'] },
  Structure: { work: ['Columns', 'Beams', 'Slabs', 'Formwork & scaffolding'], materials: ['Steel', 'Concrete', 'Bricks'] },
  'Walls/Masonry': { work: ['Wall alignment', 'Mortar joints', 'Lintels & openings', 'Curing of masonry'], materials: ['Bricks', 'Cement', 'Sand'] },
  MEP: { work: ['Electrical conduits & wiring', 'Plumbing lines', 'Drainage lines', 'Fire-fighting pipes'], materials: ['Pipes', 'Electrical materials', 'Switchgear & panels'] },
  Finishing: { work: ['Plastering', 'Flooring', 'Painting', 'Doors & windows'], materials: ['Tiles', 'Paint', 'Fixtures & fittings'] },
  Completion: { work: ['Final cleaning', 'Electrical testing', 'Plumbing testing', 'Snag list cleared'], materials: ['Fire safety equipment', 'Fixtures & fittings'] },
}

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-')

export function checklistForPhase(phase) {
  const set = raw[phase] || raw[phases[0]]
  const make = (kind, label, i) => ({ id: `${slug(phase)}-${kind}-${i}`, label, category: 'Quality', source: kind === 'w' ? 'work' : 'material' })
  return { work: set.work.map((l, i) => make('w', l, i)), materials: set.materials.map((l, i) => make('m', l, i)) }
}
