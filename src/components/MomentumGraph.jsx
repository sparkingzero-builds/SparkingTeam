import { useState } from 'react'
import { charactersById } from '../data/characters.js'
import { allMatches } from '../utils/matchLog.js'

const GAP = 30 * 60000
const W = 640, H = 220, PX = 34, PY = 22

// Splits matches (newest first) into sittings separated by 30+ min breaks, oldest game first inside each.
function sittings(matches) {
  const asc = [...matches].sort((a, b) => a.ts - b.ts)
  const out = []
  for (const m of asc) {
    const cur = out[out.length - 1]
    if (cur && m.ts - cur[cur.length - 1].ts <= GAP) cur.push(m)
    else out.push([m])
  }
  return out.filter(s => s.length >= 3).reverse()
}

function analyse(games) {
  let w = 0, run = 0
  const pts = games.map((g, i) => {
    if (g.result === 'w') w++
    return { ...g, i, rate: Math.round((w / (i + 1)) * 100), net: (run += g.result === 'w' ? 1 : -1) }
  })
  // Peak = highest net score; the slide starts there if it ends 2+ lower.
  let peak = 0
  pts.forEach((p, i) => { if (p.net > pts[peak].net) peak = i })
  const end = pts[pts.length - 1]
  const slide = pts[peak].net - end.net >= 2 && peak < pts.length - 1 ? peak : null
  let low = 0
  pts.forEach((p, i) => { if (p.net < pts[low].net) low = i })
  const comeback = end.net - pts[low].net >= 2 && low < pts.length - 1 ? low : null
  return { pts, peak, slide, comeback, w, l: games.length - w }
}

export default function MomentumGraph() {
  const all = sittings(allMatches()).slice(0, 12)
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(null)

  if (!all.length) {
    return (
      <section className="mg">
        <span className="mw__eyebrow">MOMENTUM</span>
        <h3 className="mw__title">Session momentum</h3>
        <p className="mw__hint">Play a session of 3+ games (with less than 30 min between them) and you'll see exactly where it swung.</p>
      </section>
    )
  }

  const games = all[Math.min(idx, all.length - 1)]
  const { pts, slide, comeback, w, l } = analyse(games)
  const nets = pts.map(p => p.net)
  const max = Math.max(1, ...nets), min = Math.min(-1, ...nets)
  const x = i => PX + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - PX * 2))
  const y = v => PY + ((max - v) / (max - min)) * (H - PY * 2)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.net)}`).join(' ')
  const area = `${line} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const day = new Date(games[0].ts)
  const label = s => new Date(s[0].ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${s.length}`
  const h = hover != null ? pts[hover] : null

  let verdict
  if (slide != null) verdict = `It turned after game ${slide + 1}. You went ${pts.slice(slide + 1).filter(p => p.result === 'w').length}-${pts.slice(slide + 1).filter(p => p.result === 'l').length} from there. That was the moment to stop.`
  else if (comeback != null) verdict = `Comeback session. You were down at game ${comeback + 1} and fought back.`
  else if (w > l) verdict = 'Clean session. You never really lost control.'
  else verdict = 'Tough from the start. Some days the inputs just aren\'t there.'

  return (
    <section className="mg">
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">MOMENTUM · {day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</span>
          <h3 className="mw__title">{w}W – {l}L session</h3>
        </div>
        <select className="mg__pick" value={idx} onChange={e => { setIdx(+e.target.value); setHover(null) }}>
          {all.map((s, i) => <option key={s[0].ts} value={i}>{i === 0 ? 'Latest · ' : ''}{label(s)} games</option>)}
        </select>
      </div>

      <div className="mg__chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="mg-up" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3ddc84" stopOpacity=".35" />
              <stop offset="1" stopColor="#3ddc84" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line className="mg__zero" x1={PX} x2={W - PX} y1={y(0)} y2={y(0)} />
          {slide != null && <rect className="mg__slide" x={x(slide)} y={PY} width={x(pts.length - 1) - x(slide)} height={H - PY * 2} />}
          <path className="mg__area" d={area} />
          <path className="mg__line" d={line} />
          {pts.map((p, i) => (
            <g key={p.ts} onPointerEnter={() => setHover(i)}>
              <rect x={x(i) - (W / pts.length) / 2} y="0" width={W / pts.length} height={H} fill="transparent" />
              <circle className={'mg__dot mg__dot--' + p.result + (hover === i ? ' on' : '')} cx={x(i)} cy={y(p.net)} r={hover === i ? 7 : 5} />
            </g>
          ))}
          {slide != null && <text className="mg__mark" x={x(slide)} y={y(pts[slide].net) - 12} textAnchor="middle">PEAK</text>}
          {comeback != null && slide == null && <text className="mg__mark mg__mark--low" x={x(comeback)} y={y(pts[comeback].net) + 22} textAnchor="middle">LOW</text>}
        </svg>
        <span className="mg__axis mg__axis--top">+{max}</span>
        <span className="mg__axis mg__axis--bot">{min}</span>
      </div>

      <p className="mg__tip">
        {h
          ? <>Game {h.i + 1}: <b className={h.result === 'w' ? 'ql-w' : 'ql-l'}>{h.result === 'w' ? 'WIN' : 'LOSS'}</b> vs {charactersById[h.enemyId]?.name || '?'} · running {h.rate}% · net {h.net > 0 ? '+' : ''}{h.net}</>
          : verdict}
      </p>
    </section>
  )
}
