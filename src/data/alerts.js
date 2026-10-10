// Stored alerts = CCTV events only. Every other alert (issues, delays, missed / pending inspections)
// is DERIVED live by services/alertService.js, so it always matches the real data.
// status: open | pending (acknowledged) | resolved
export const alerts = [
  { id: 'AL-906', type: 'CCTV alert – camera offline', severity: 'Medium', siteId: 'P-203', officerId: 'u4', category: 'CCTV', status: 'pending', minutesAgo: 95, cameraId: 'CAM-04' },
  { id: 'AL-910', type: 'CCTV alert – Unauthorized person detected', severity: 'High', siteId: 'S-103', officerId: 'u3', category: 'CCTV', status: 'open', minutesAgo: 12, cameraId: 'CAM-05', detection: 'Unauthorized person detected', confidence: 94 },
]
