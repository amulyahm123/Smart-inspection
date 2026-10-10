// Existing-site checklist. Item ids are generated (e.g. "structural-0") so answers can be stored by id.
const raw = [
  ['Structural', ['Wall cracks', 'Ceiling damage', 'Water seepage', 'Corrosion', 'Floor damage']],
  ['Electrical', ['Exposed wiring', 'Damaged switches/sockets', 'Electrical panel', 'Lighting', 'Power backup/generator']],
  ['Plumbing & Sanitation', ['Water leakage', 'Drainage', 'Pipes', 'Toilets', 'Water supply']],
  ['Fire & Safety', ['Fire extinguishers', 'Emergency exits', 'Fire alarm', 'Emergency lighting']],
  ['Maintenance', ['Cleanliness', 'Garbage', 'Furniture/equipment', 'External maintenance']],
  ['Accessibility', ['Ramps', 'Lifts', 'Handrails', 'Obstructions']],
  ['Security', ['CCTV', 'Gates', 'Locks', 'Unauthorized access']],
]

export const existingChecklist = raw.map(([name, items]) => {
  const id = name.toLowerCase().replace(/[^a-z]+/g, '-')
  return { id, name, items: items.map((label, i) => ({ id: `${id}-${i}`, label, category: name })) }
})

export const checklistItems = existingChecklist.flatMap((c) => c.items)

// cls = colour class, flag = counts as "needs follow-up" (issue can be reported)
export const answerOptions = [
  { value: 'pass', label: 'Pass', cls: 'pass' },
  { value: 'attention', label: 'Attention', cls: 'attention', flag: true },
  { value: 'fail', label: 'Fail', cls: 'fail', flag: true },
]

export const materialOptions = [
  { value: 'acceptable', label: 'Acceptable', cls: 'pass' },
  { value: 'attention', label: 'Needs attention', cls: 'attention', flag: true },
  { value: 'not-acceptable', label: 'Not acceptable', cls: 'fail', flag: true },
]

export const levelOf = (value) => (value === 'fail' || value === 'not-acceptable' ? 'fail' : 'attention')
