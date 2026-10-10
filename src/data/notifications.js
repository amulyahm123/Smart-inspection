// STORED notifications = events that already happened (assignments, issue status changes, resolved issues, CCTV alerts).
// kind + ref say what it is and what to open when clicked. Notifications that follow the current data
// (upcoming / missed inspections, delayed projects, critical + recurring issues, team notices) are derived by
// services/notificationService.js, so they always match the real data.
// userId = null means "everyone with this role"
export const notifications = [
  { id: 'N-1', role: 'inspector', userId: 'u1', kind: 'assignment', title: 'New inspection assignment', body: 'Govt. Girls Higher Secondary School – today, 10:00', minutesAgo: 25, read: false, ref: { type: 'inspection', id: 'INSP-3001' } },
  { id: 'N-3', role: 'inspector', userId: 'u1', kind: 'issue-update', title: 'Issue update', body: 'ISS-502 wall crack moved to In Progress by Civil Works.', minutesAgo: 300, read: true, ref: { type: 'issue', id: 'ISS-502' } },
  { id: 'N-4', role: 'inspector', userId: 'u1', kind: 'issue-update', title: 'Issue update', body: 'ISS-507 garbage accumulation marked Resolved.', minutesAgo: 1700, read: true, ref: { type: 'issue', id: 'ISS-507' } },
  { id: 'N-6', role: 'inspector', userId: 'u3', kind: 'assignment', title: 'New inspection assignment', body: 'District Courts Annex – today, 15:00', minutesAgo: 60, read: false, ref: { type: 'inspection', id: 'INSP-3009' } },
  { id: 'N-7', role: 'inspector', userId: 'u4', kind: 'assignment', title: 'New inspection assignment', body: 'Rural Health Sub-centre – today, 11:30', minutesAgo: 120, read: false, ref: { type: 'inspection', id: 'INSP-3008' } },
  { id: 'N-14', role: 'inspector', userId: 'u4', kind: 'issue-update', title: 'Issue update', body: 'ISS-503 brick masonry issue moved to Verified.', minutesAgo: 800, read: false, ref: { type: 'issue', id: 'ISS-503' } },
  { id: 'N-15', role: 'inspector', userId: 'u4', kind: 'issue-update', title: 'Issue update', body: 'ISS-505 water leakage assigned to the Plumbing Team.', minutesAgo: 2400, read: true, ref: { type: 'issue', id: 'ISS-505' } },
  { id: 'N-13', role: 'admin', userId: null, kind: 'issue-resolved', title: 'Issue resolved', body: 'ISS-507 resolved by Sanitation Dept.', minutesAgo: 1700, read: true, ref: { type: 'issue', id: 'ISS-507' } },
]

// (not used any more: the Admin dashboard builds "Recent activity" from real data)
export const activity = []
