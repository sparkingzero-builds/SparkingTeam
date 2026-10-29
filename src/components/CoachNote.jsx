import { charactersById } from '../data/characters.js'
import { META_BY_ID } from '../data/metaWatch.js'
import { allMatches } from '../utils/matchLog.js'
import { DAY, between, summary, matchupTrend } from '../utils/insights.js'

function weekStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

const name = id => charactersById[id]?.name || 'them'

// Builds this week's coaching points from last week's games vs the week before.
function buildNote(all) {
  const start = weekStart()
  const last = summary(between(all, start - 7 * DAY, start))
  const before = summary(between(all, start - 14 * DAY, start - 7 * DAY))
  const pts = []

  if (!last.n) {
    const lifetime = summary(all)
    if (!lifetime.n) return null
    pts.push({ k: 'info', t: `No games last week. Your lifetime record is ${lifetime.w}-${lifetime.l}. Time to get back in there.` })
  } else {
    if (before.rate != null) {
      const d = last.rate - before.rate
      if (d >= 8) pts.push({ k: 'good', t: `Win rate up ${d}% to ${last.rate}%. Whatever you changed, keep doing it.` })
      else if (d <= -8) pts.push({ k: 'bad', t: `Win rate dropped ${-d}% to ${last.rate}%. Rough week, don't force it.` })
      else pts.push({ k: 'info', t: `Steady week at ${last.rate}% (${last.w}-${last.l}).` })
    } else pts.push({ k: 'info', t: `Last week: ${last.w}-${last.l} (${last.rate}%).` })

    if (last.worst) {
      const [id, e] = last.worst
      pts.push({ k: 'bad', t: `${name(id)} beat you ${e.l} times. Make them your focus this week. Open their profile for counter tips.` })
    }
    if (last.best) pts.push({ k: 'good', t: `You bullied ${name(last.best[0])} (${last.best[1].w}-${last.best[1].l}). That matchup's locked in.` })
    if (last.ki != null && before.ki != null && Math.abs(last.ki - before.ki) >= 0.5) {
      pts.push(last.ki > before.ki
        ? { k: 'good', t: 'Your Ki management is improving. Fewer empty-bar moments.' }
        : { k: 'bad', t: 'Ki grades slipped. Stop spamming blasts and keep bars for Vanish and Super Perception.' })
    }
    if (last.streak >= 5) pts.push({ k: 'good', t: `${last.streak}-game win streak. That's real form.` })
  }

  for (const id of new Set(all.slice(0, 40).map(m => m.enemyId))) {
    const t = matchupTrend(id, all)
    if (t?.dir === 'down') { pts.push({ k: 'bad', t: `You're getting worse against ${name(id)} lately (${t.diff}%).` }); break }
  }
  const buffedFoe = all.slice(0, 40).map(m => m.enemyId).find(id => META_BY_ID.get(id)?.verdict === 'buff')
  if (buffedFoe) pts.push({ k: 'info', t: `Heads up: ${name(buffedFoe)} got buffed last patch, so expect to see them more.` })

  return pts.slice(0, 5)
}

export default function CoachNote() {
  const pts = buildNote(allMatches())
  if (!pts) return null
  const date = new Date(weekStart()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return (
    <section className="coach">
      <div className="coach__badge">🧠</div>
      <div className="coach__body">
        <span className="mw__eyebrow">COACH'S NOTE · WEEK OF {date.toUpperCase()}</span>
        <ul>
          {pts.map((p, i) => <li key={i} className={'coach__pt coach__pt--' + p.k}>{p.t}</li>)}
        </ul>
      </div>
    </section>
  )
}
