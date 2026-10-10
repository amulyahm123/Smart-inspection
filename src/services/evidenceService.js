// Evidence = photo + timestamp + GPS + inspector identity, linked to a checklist item / issue / the site.
const esc = (s) => String(s).replace(/[&<>]/g, '').slice(0, 38)

export function placeholderPhoto(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#33466b'/><stop offset='1' stop-color='#1b2742'/></linearGradient></defs>
<rect width='400' height='300' fill='url(#g)'/>
<text x='200' y='140' fill='#cfd8ee' font-family='sans-serif' font-size='20' text-anchor='middle'>Simulated photo</text>
<text x='200' y='172' fill='#8fa0c4' font-family='sans-serif' font-size='15' text-anchor='middle'>${esc(label)}</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// link: { type: 'item' | 'issue' | 'general', ref?: id }
export function buildEvidence({ photo, link, label, user, checkIn }) {
  return {
    id: `EV-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    photo,
    label,
    link,
    timestamp: new Date().toISOString(),
    lat: checkIn ? checkIn.lat : null,
    lng: checkIn ? checkIn.lng : null,
    inspectorId: user.id,
    inspectorName: user.name,
    officerId: user.officerId,
  }
}

// Photos taken / uploaded in the browser are temporary blob: URLs that stop working after a refresh.
// When saving, swap those for a placeholder so the record stays valid.
export const portablePhoto = (e) => (e.photo && e.photo.startsWith('blob:') ? { ...e, photo: placeholderPhoto(e.label) } : e)
