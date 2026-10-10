// Returns an ISO date (YYYY-MM-DD) n days from today. Keeps mock data "fresh" on any demo day.
export function dayOffset(n = 0) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function formatDate(iso) {
  if (!iso) return 'Not recorded'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(minutes) {
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`
  return `${Math.round(minutes / 1440)} day ago`
}

export function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso) {
  return `${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${formatTime(iso)}`
}

export function durationText(startIso, endIso) {
  const mins = Math.max(1, Math.round((new Date(endIso) - new Date(startIso)) / 60000))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${mins % 60} min`
}

// "5 min ago" for past times, "in 2 hr" for future ones. ms = timestamp in milliseconds.
export function relTime(ms) {
  const diff = Math.round((Date.now() - ms) / 60000)
  if (diff >= 0) return timeAgo(diff)
  const ahead = timeAgo(-diff).replace(' ago', '')
  return `in ${ahead}`
}

export function formatMinutes(m) {
  if (!m) return '–'
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`
}
