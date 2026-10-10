// type: 'existing' = completed/operational, 'construction' = under construction
// startDate / targetDate / lastInspected are days from today (converted in dataService)
export const sites = [
  { id: 'S-101', type: 'existing', name: 'Govt. Girls Higher Secondary School', area: 'Kothrud', category: 'Education', assignedOfficer: 'u1', status: 'attention', lat: 18.5074, lng: 73.8077, radius: 150, lastInspected: -12 },
  { id: 'S-102', type: 'existing', name: 'Primary Health Centre', area: 'Hadapsar', category: 'Healthcare', assignedOfficer: 'u2', status: 'good', lat: 18.5089, lng: 73.926, radius: 120, lastInspected: -6 },
  { id: 'S-103', type: 'existing', name: 'District Courts Annex', area: 'Shivajinagar', category: 'Administration', assignedOfficer: 'u3', status: 'critical', lat: 18.5308, lng: 73.8475, radius: 200, lastInspected: -20 },
  { id: 'S-104', type: 'existing', name: 'Municipal Ward Office 5', area: 'Aundh', category: 'Administration', assignedOfficer: 'u1', status: 'good', lat: 18.5586, lng: 73.8071, radius: 100, lastInspected: -4 },
  { id: 'S-105', type: 'existing', name: 'Community Hall', area: 'Baner', category: 'Public Facility', assignedOfficer: 'u4', status: 'attention', lat: 18.559, lng: 73.7868, radius: 100, lastInspected: -15 },
  { id: 'S-106', type: 'existing', name: 'Public Library', area: 'Deccan', category: 'Public Facility', assignedOfficer: 'u3', status: 'good', lat: 18.5167, lng: 73.841, radius: 80, lastInspected: -9 },
  { id: 'S-107', type: 'existing', name: 'Civil Hospital – Block B', area: 'Sassoon Road', category: 'Healthcare', assignedOfficer: 'u5', status: 'attention', lat: 18.5286, lng: 73.8744, radius: 180, lastInspected: -18 },
  { id: 'S-108', type: 'existing', name: 'City Bus Terminus', area: 'Swargate', category: 'Transport', assignedOfficer: 'u5', status: 'good', lat: 18.5018, lng: 73.8636, radius: 250, lastInspected: -7 },

  { id: 'P-201', type: 'construction', name: 'Flyover Package 2 – Mundhwa Junction', area: 'Mundhwa', category: 'Roads & Bridges', assignedOfficer: 'u6', status: 'attention', lat: 18.5362, lng: 73.9298, radius: 300, phase: 'Structure', startDate: -300, targetDate: 210, expectedProgress: 60, actualProgress: 52, previousProgress: 47, lastInspected: -10 },
  { id: 'P-202', type: 'construction', name: 'Anganwadi Centre Block', area: 'Wagholi', category: 'Education', assignedOfficer: 'u2', status: 'good', lat: 18.5809, lng: 73.9787, radius: 100, phase: 'Foundation', startDate: -45, targetDate: 240, expectedProgress: 30, actualProgress: 34, previousProgress: 22, lastInspected: -8 },
  { id: 'P-203', type: 'construction', name: 'Rural Health Sub-centre', area: 'Mulshi', category: 'Healthcare', assignedOfficer: 'u4', status: 'critical', lat: 18.5204, lng: 73.5117, radius: 120, phase: 'Walls/Masonry', startDate: -180, targetDate: 90, expectedProgress: 55, actualProgress: 41, previousProgress: 38, lastInspected: -14 },
  { id: 'P-204', type: 'construction', name: 'Govt. ITI Workshop Wing', area: 'Hadapsar', category: 'Education', assignedOfficer: 'u2', status: 'good', lat: 18.4967, lng: 73.9411, radius: 150, phase: 'MEP', startDate: -240, targetDate: 75, expectedProgress: 78, actualProgress: 76, previousProgress: 68, lastInspected: -5 },
  { id: 'P-205', type: 'construction', name: 'Water Treatment Plant Annex', area: 'Parvati', category: 'Utilities', assignedOfficer: 'u6', status: 'good', lat: 18.4967, lng: 73.8426, radius: 200, phase: 'Finishing', startDate: -330, targetDate: 30, expectedProgress: 90, actualProgress: 91, previousProgress: 84, lastInspected: -3 },
]

export const phases = ['Foundation', 'Structure', 'Walls/Masonry', 'MEP', 'Finishing', 'Completion']
