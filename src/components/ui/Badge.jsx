export default function Badge({ tone = 'gray', children }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}
