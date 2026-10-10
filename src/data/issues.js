// status follows the lifecycle: Reported → Verified → Assigned → In Progress → Resolved → Closed
export const issues = [
  { id: 'ISS-501', siteId: 'S-103', category: 'Electrical', title: 'Exposed wiring near courtroom 3 corridor', severity: 'Critical', status: 'Assigned', reportedBy: 'u3', daysAgo: 4, team: 'Electrical Maintenance', recurring: true },
  { id: 'ISS-502', siteId: 'S-101', category: 'Structural', title: 'Diagonal wall crack in science lab', severity: 'Critical', status: 'In Progress', reportedBy: 'u1', daysAgo: 12, team: 'Civil Works', recurring: false },
  { id: 'ISS-503', siteId: 'P-203', category: 'Quality', title: 'Brick masonry joints below specified thickness', severity: 'Critical', status: 'Verified', reportedBy: 'u4', daysAgo: 2, team: 'Contractor QA', recurring: false },
  { id: 'ISS-504', siteId: 'S-107', category: 'Fire & Safety', title: 'Fire extinguishers expired on 2nd floor', severity: 'High', status: 'Reported', reportedBy: 'u5', daysAgo: 1, team: 'Fire Safety Cell', recurring: true },
  { id: 'ISS-505', siteId: 'S-105', category: 'Plumbing & Sanitation', title: 'Water leakage in ground-floor toilets', severity: 'Medium', status: 'Assigned', reportedBy: 'u4', daysAgo: 7, team: 'Plumbing Team', recurring: true },
  { id: 'ISS-506', siteId: 'P-201', category: 'Safety', title: 'Missing edge protection on pier cap work area', severity: 'High', status: 'In Progress', reportedBy: 'u6', daysAgo: 10, team: 'Contractor Safety', recurring: false },
  { id: 'ISS-507', siteId: 'S-104', category: 'Maintenance', title: 'Garbage accumulation at rear entrance', severity: 'Low', status: 'Resolved', reportedBy: 'u1', daysAgo: 6, team: 'Sanitation Dept.', recurring: false },
  { id: 'ISS-508', siteId: 'S-102', category: 'Accessibility', title: 'Ramp handrail loose at main entrance', severity: 'Medium', status: 'Closed', reportedBy: 'u2', daysAgo: 20, team: 'Civil Works', recurring: false },
  { id: 'ISS-509', siteId: 'S-101', category: 'Security', title: 'Back gate lock broken', severity: 'Medium', status: 'Reported', reportedBy: 'u1', daysAgo: 12, team: 'Security Office', recurring: false },
  { id: 'ISS-510', siteId: 'S-103', category: 'Structural', title: 'Water seepage on basement ceiling', severity: 'High', status: 'In Progress', reportedBy: 'u3', daysAgo: 15, team: 'Civil Works', recurring: true },
  { id: 'ISS-511', siteId: 'P-202', category: 'Quality', title: 'Rebar spacing deviation in footing F4', severity: 'Medium', status: 'Resolved', reportedBy: 'u2', daysAgo: 8, team: 'Contractor QA', recurring: false },
  // Older, already-closed issues. They are what makes newer ones "recurring" at the same site.
  { id: 'ISS-512', siteId: 'S-103', category: 'Electrical', title: 'Exposed wiring in corridor near court 1', severity: 'High', status: 'Closed', reportedBy: 'u3', daysAgo: 41, team: 'Electrical Maintenance', recurring: false },
  { id: 'ISS-513', siteId: 'S-107', category: 'Fire & Safety', title: 'Fire extinguishers expired in ward corridor', severity: 'High', status: 'Resolved', reportedBy: 'u5', daysAgo: 62, team: 'Fire Safety Cell', recurring: false },
  { id: 'ISS-514', siteId: 'S-105', category: 'Plumbing & Sanitation', title: 'Water leakage in toilets block', severity: 'Medium', status: 'Closed', reportedBy: 'u4', daysAgo: 36, team: 'Plumbing Team', recurring: false },
  { id: 'ISS-515', siteId: 'S-103', category: 'Structural', title: 'Water seepage in basement ceiling', severity: 'High', status: 'Resolved', reportedBy: 'u3', daysAgo: 49, team: 'Civil Works', recurring: false },
  { id: 'ISS-516', siteId: 'S-103', category: 'Electrical', title: 'Exposed wiring in server room', severity: 'Medium', status: 'Closed', reportedBy: 'u3', daysAgo: 90, team: 'Electrical Maintenance', recurring: false },
]
