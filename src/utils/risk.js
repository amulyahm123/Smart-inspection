// Colours / labels for risk levels (the thresholds themselves live in the risk settings, not here)
export const RISK_TONE = { low: 'green', medium: 'amber', high: 'red' }
export const RISK_COLOR = { low: 'var(--green)', medium: '#e0a82f', high: 'var(--red)' }
export const RISK_LABEL = { low: 'Low', medium: 'Medium', high: 'High' }
export const CONF_TONE = { high: 'green', medium: 'amber', low: 'gray' }
export const CONF_LABEL = { high: 'High', medium: 'Medium', low: 'Low' }
export const TREND_META = {
  increasing: { label: 'Increasing', arrow: '↑', tone: 'red' },
  decreasing: { label: 'Decreasing', arrow: '↓', tone: 'green' },
  stable: { label: 'Stable', arrow: '→', tone: 'gray' },
  insufficient: { label: 'Not enough history yet', arrow: '·', tone: 'gray' },
}
export const priorityText = (risk) => (risk.needsImmediate ? 'Immediate inspection' : risk.level === 'medium' ? 'Inspect soon' : 'Routine schedule')
export const priorityTone = (risk) => (risk.needsImmediate ? 'red' : risk.level === 'medium' ? 'amber' : 'green')
