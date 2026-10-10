// Choices used by the Admin "Add / Edit site" form and the Sites filters.
export const SITE_TYPES = [
  { value: 'existing', label: 'Old / existing site', short: 'Existing' },
  { value: 'construction', label: 'New site (project)', short: 'New' },
]

export const PROJECT_STATUSES = [
  { value: 'not-started', label: 'Not started', tone: 'gray' },
  { value: 'in-progress', label: 'In progress', tone: 'blue' },
  { value: 'on-hold', label: 'On hold', tone: 'amber' },
  { value: 'completed', label: 'Completed', tone: 'green' },
]
export const projectStatusLabel = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s.label]))
export const projectStatusTone = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s.tone]))

// days between inspections
export const FREQUENCIES = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'fortnightly', label: 'Every 2 weeks', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
]
export const frequencyLabel = Object.fromEntries(FREQUENCIES.map((f) => [f.value, f.label]))
export const frequencyDays = Object.fromEntries(FREQUENCIES.map((f) => [f.value, f.days]))

export const CATEGORIES = ['Education', 'Healthcare', 'Administration', 'Public Facility', 'Transport', 'Roads & Bridges', 'Utilities', 'Housing', 'Water & Sanitation', 'Other']

export const DEPARTMENTS = [
  'School Education Dept.', 'Public Health Dept.', 'Law & Judiciary Dept.', 'Urban Development Dept.', 'Municipal Corporation',
  'Cultural Affairs Dept.', 'Medical Education & Health Dept.', 'State Transport Corporation', 'Public Works Dept.',
  'Women & Child Development Dept.', 'Skill Development Dept.', 'Water Resources Dept.', 'Rural Development Dept.',
]

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

// Limits for files attached to a site (everything is stored in the browser, so they are kept small)
export const FILE_LIMITS = { maxFiles: 8, maxDocBytes: 700 * 1024, imageMaxEdge: 1280, imageQuality: 0.75 }
export const DOC_TYPES = ['application/pdf']
