// Maps statuses to badge colours so the whole app looks consistent.
export const severityTone = { Low: 'blue', Medium: 'amber', High: 'orange', Critical: 'red' }

export const inspectionTone = { completed: 'green', upcoming: 'blue', 'in-progress': 'amber', missed: 'red' }

export const issueTone = {
  Reported: 'gray', Verified: 'blue', Assigned: 'blue', 'In Progress': 'amber', Resolved: 'green', Closed: 'gray',
}

export const siteTone = { good: 'green', attention: 'amber', critical: 'red' }
export const siteLabel = { good: 'Good', attention: 'Attention required', critical: 'Critical' }

// Expected vs actual progress → on track / delayed
export function progressStatus(expected, actual) {
  const diff = actual - expected
  if (diff <= -5) return { diff, label: 'Delayed', tone: 'red' }
  if (diff < 0) return { diff, label: 'Attention Required', tone: 'amber' }
  return { diff, label: 'On Track', tone: 'green' }
}

export const toneEmoji = { green: '🟢', amber: '🟡', red: '🔴' }
export const progressText = (diff) => (diff < 0 ? `${-diff}% behind schedule` : diff > 0 ? `${diff}% ahead of schedule` : 'On schedule')

// Inspection groups used on the Admin pages
export const bucketTone = { completed: 'green', pending: 'amber', upcoming: 'blue', missed: 'red' }
export const bucketLabel = { completed: 'Completed', pending: 'Pending', upcoming: 'Upcoming', missed: 'Missed' }
export const attendanceTone = { Present: 'green', Incomplete: 'amber', Absent: 'red' }
