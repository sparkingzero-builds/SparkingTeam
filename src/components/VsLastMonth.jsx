import { charactersById } from '../data/characters.js'
import { allMatches } from '../utils/matchLog.js'
import { DAY, between, summary } from '../utils/insights.js'

const GRADE = ['F', 'D', 'C', 'B', 'A']
const grade = v => (v == null ? '—' : GRADE[Math.min(4, Math.max(0, Math.round(v) - 1))])

export default function VsLastMonth() {
  const all = allMatches()
  const now = Date.now()
  const cur = summary(between(all, now - 30 * DAY, now + 1))
  const prev = summary(between(all, now - 60 * DAY, now - 30 * DAY))
  const name = e => (e ? charactersById[e[0]]?.name || '—' : '—')

  const rows = [
    ['Games', cur.n, prev.n, 'more'],
    ['Win rate', cur.rate, prev.rate, 'more', '%'],
    ['Best streak', cur.streak, prev.streak, 'more'],
    ['Opponents faced', cur.opponents, prev.opponents, 'more'],
    ['Ki grade', cur.ki, prev.ki, 'more', '', grade],
  ]

  return (
    <section className="vm">
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">YOU VS LAST MONTH</span>
          <h3 className="mw__title">Last 30 days vs the 30 before</h3>
        </div>
      </div>
      {!cur.n && !prev.n ? (
        <p className="mw__hint">Once you've logged a few weeks of games, this compares you to your past self.</p>
      ) : (
        <>
          <div className="vm__grid">
            <span className="vm__h" />
            <span className="vm__h">NOW</span>
            <span className="vm__h">THEN</span>
            {rows.map(([label, a, b, , unit = '', fmt]) => {
              const show = v => (v == null ? '—' : fmt ? fmt(v) : v + unit)
              const better = a != null && b != null && a > b
              const worse = a != null && b != null && a < b
              return [
                <span key={label + 'l'} className="vm__label">{label}</span>,
                <b key={label + 'a'} className={'vm__now' + (better ? ' up' : worse ? ' down' : '')}>{show(a)}{better ? ' ▲' : worse ? ' ▼' : ''}</b>,
                <span key={label + 'b'} className="vm__then">{show(b)}</span>,
              ]
            })}
            <span className="vm__label">Nemesis</span>
            <b className="vm__now">{name(cur.worst)}</b>
            <span className="vm__then">{name(prev.worst)}</span>
          </div>
          {cur.rate != null && prev.rate != null && (
            <p className="tf__read">
              {cur.rate - prev.rate >= 5 ? `You've levelled up: ${cur.rate - prev.rate}% better than last month.`
                : cur.rate - prev.rate <= -5 ? `Down ${prev.rate - cur.rate}% on last month. Check the heatmap for what's changed.`
                : 'Holding steady with last month.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
