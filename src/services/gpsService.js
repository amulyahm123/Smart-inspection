// GPS helpers. "demo" mode simulates a position inside/outside the site; "device" uses the browser.
const M_PER_DEG = 111320
const toRad = (d) => (d * Math.PI) / 180

export function distanceMeters(a, b) {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function measure(site, loc) {
  const distance = Math.round(distanceMeters(site, loc))
  return { distance, within: distance <= site.radius }
}

// East/south offsets in metres from the site centre (used to draw the mini map)
export function mapOffsets(site, loc) {
  return {
    dx: (loc.lng - site.lng) * M_PER_DEG * Math.cos(toRad(site.lat)),
    dy: -(loc.lat - site.lat) * M_PER_DEG,
  }
}

export function demoLocation(site, inside) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dist = inside ? site.radius * (0.15 + Math.random() * 0.5) : site.radius * (2.2 + Math.random() * 2)
      const ang = Math.random() * 2 * Math.PI
      resolve({
        lat: site.lat + (dist * Math.cos(ang)) / M_PER_DEG,
        lng: site.lng + (dist * Math.sin(ang)) / (M_PER_DEG * Math.cos(toRad(site.lat))),
        accuracy: Math.round(6 + Math.random() * 8),
        source: 'demo',
      })
    }, 1100)
  })
}

export function realLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported on this device.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy), source: 'device' }),
      (err) => reject(new Error(err.code === 1
        ? 'Location permission was denied. Allow it in your browser settings, or switch to demo GPS.'
        : 'Could not read your location. Try again, or switch to demo GPS.')),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
