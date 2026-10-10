// status: live | offline.  An "alert" is NOT stored here – it is any open alert in alerts.js that has this camera's id.
export const cameras = [
  { id: 'CAM-01', siteId: 'P-201', name: 'Pier Line – North', location: 'North pier line, Mundhwa Junction', status: 'live', minutesAgo: 0 },
  { id: 'CAM-02', siteId: 'P-201', name: 'Batching Yard', location: 'Material yard, east side', status: 'live', minutesAgo: 0 },
  { id: 'CAM-03', siteId: 'P-203', name: 'Main Gate', location: 'Site entrance, village road', status: 'live', minutesAgo: 0 },
  { id: 'CAM-04', siteId: 'P-203', name: 'Masonry Block A', location: 'Block A, ground level', status: 'offline', minutesAgo: 95 },
  { id: 'CAM-05', siteId: 'S-103', name: 'Entrance Lobby', location: 'Ground floor lobby', status: 'live', minutesAgo: 0 },
  { id: 'CAM-06', siteId: 'S-107', name: 'Ward Corridor 2F', location: 'Second floor, Block B', status: 'live', minutesAgo: 1 },
  { id: 'CAM-07', siteId: 'P-205', name: 'Pump House', location: 'Pump house, west compound', status: 'live', minutesAgo: 0 },
  { id: 'CAM-08', siteId: 'S-108', name: 'Platform Bay 4', location: 'Platform 4, boarding area', status: 'live', minutesAgo: 2 },
  { id: 'CAM-09', siteId: 'S-101', name: 'Main Gate', location: 'School front gate, Karve Road', status: 'live', minutesAgo: 0 },
  { id: 'CAM-10', siteId: 'S-104', name: 'Ward Office Lobby', location: 'Public service counter', status: 'live', minutesAgo: 1 },
  { id: 'CAM-11', siteId: 'P-202', name: 'Foundation Pit', location: 'Excavation area, plot centre', status: 'live', minutesAgo: 0 },
  { id: 'CAM-12', siteId: 'S-102', name: 'Entrance & Ramp', location: 'Main entrance, patient ramp', status: 'live', minutesAgo: 3 },
]
