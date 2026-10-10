// Simulated detections a camera can raise
export const cameraAlertTypes = [
  { key: 'person', label: 'Unauthorized person detected', severity: 'High' },
  { key: 'intrusion', label: 'Intrusion after hours', severity: 'Critical' },
  { key: 'smoke', label: 'Smoke / fire detected', severity: 'Critical' },
  { key: 'loiter', label: 'Loitering detected', severity: 'Medium' },
  { key: 'tamper', label: 'Camera tampering', severity: 'High' },
]
