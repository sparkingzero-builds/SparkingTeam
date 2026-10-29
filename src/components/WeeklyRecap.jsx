import { useState } from 'react'
import { charactersById } from '../data/characters.js'
import { allMatches } from '../utils/matchLog.js'

const DAY = 86400000

function weekStart(offset = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offset * 7)
  return d.getTime()
}

function stats(matches) {
  const w = matches.filter(m => m.result === 'w').length
  const rate = matches.length ? Math.round((w / matches.length) * 100) : 0
  let best = 0, run = 0
  for (const m of [...matches].sort((a, b) => a.ts - b.ts)) {
    run = m.result === 'w' ? run + 1 : 0
    best = Math.max(best, run)
  }
  const tally = (key, filter) => {
    const map = new Map()
    for (const m of matches) {
      if (!m[key]) continue
      const e = map.get(m[key]) || { w: 0, l: 0 }
      e[m.result]++
      map.set(m[key], e)
    }
    return [...map.entries()].filter(filter)
  }
  const nemesis = tally('enemyId', ([, e]) => e.l > e.w).sort((a, b) => b[1].l - a[1].l)[0]
  const victim = tally('enemyId', ([, e]) => e.w > e.l).sort((a, b) => b[1].w - a[1].w)[0]
  const mvp = tally('myId', ([, e]) => e.w + e.l >= 3).sort((a, b) => b[1].w / (b[1].w + b[1].l) - a[1].w / (a[1].w + a[1].l))[0]
  const days = new Map()
  for (const m of matches) {
    const k = new Date(m.ts).toLocaleDateString('en-GB', { weekday: 'long' })
    days.set(k, (days.get(k) || 0) + 1)
  }
  const grindDay = [...days.entries()].sort((a, b) => b[1] - a[1])[0]
  return { total: matches.length, w, l: matches.length - w, rate, best, nemesis, victim, mvp, grindDay }
}

function title(s, delta) {
  if (s.rate >= 70) return 'UNSTOPPABLE'
  if (s.best >= 5) return 'ON A RAMPAGE'
  if (delta >= 10) return 'POWERING UP'
  if (s.rate >= 50) return 'HOLDING THE LINE'
  if (s.total >= 20) return 'THE GRINDER'
  return 'TRAINING ARC'
}

export default function WeeklyRecap() {
  const [lastWeek, setLastWeek] = useState(false)
  const [copied, setCopied] = useState(false)
  const all = allMatches()
  const start = weekStart(lastWeek ? 1 : 0)
  const end = start + 7 * DAY
  const week = all.filter(m => m.ts >= start && m.ts < end)
  const prev = all.filter(m => m.ts >= start - 7 * DAY && m.ts < start)
  const s = stats(week)
  const p = stats(prev)
  const delta = prev.length ? s.rate - p.rate : 0
  const name = id => charactersById[id]?.name || '—'
  const img = id => charactersById[id]?.forms[0]?.image
  const range = `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(end - DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

  const share = async () => {
    const text = [
      `⚡ SPARKING! ZERO WEEKLY RECAP (${range})`,
      `${title(s, delta)} · ${s.w}W-${s.l}L (${s.rate}%)`,
      `Best streak: ${s.best}`,
      s.mvp && `MVP: ${name(s.mvp[0])}`,
      s.nemesis && `Nemesis: ${name(s.nemesis[0])}`,
      s.victim && `Favourite victim: ${name(s.victim[0])}`,
    ].filter(Boolean).join('\n')
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    } catch {}
  }

  return (
    <section className="wr">
      <div className="wr__head">
        <span className="wr__eyebrow">WEEKLY RECAP · {range}</span>
        <div className="wr__tabs">
          <button type="button" className={!lastWeek ? 'on' : ''} onClick={() => setLastWeek(false)}>This week</button>
          <button type="button" className={lastWeek ? 'on' : ''} onClick={() => setLastWeek(true)}>Last week</button>
        </div>
      </div>

      {!s.total ? (
        <p className="wr__empty">No games logged {lastWeek ? 'last week' : 'yet this week'}. Hit ⚡ LOG after your next match.</p>
      ) : (
        <>
          <h3 className="wr__title">{title(s, delta)}</h3>
          <div className="wr__stats">
            <div><b>{s.w}<i>-</i>{s.l}</b><small>RECORD</small></div>
            <div><b>{s.rate}%</b><small>WIN RATE{prev.length ? <em className={delta >= 0 ? 'up' : 'down'}> {delta >= 0 ? '▲' : '▼'}{Math.abs(delta)}</em> : null}</small></div>
            <div><b>{s.best}</b><small>BEST STREAK</small></div>
            <div><b>{s.total}</b><small>GAMES</small></div>
          </div>
          <div className="wr__awards">
            {[['MVP', s.mvp, 'mvp'], ['NEMESIS', s.nemesis, 'nem'], ['FAVOURITE VICTIM', s.victim, 'vic']].map(([label, entry, cls]) => entry && (
              <div key={cls} className={'wr__award wr__award--' + cls}>
                {img(entry[0]) && <img src={img(entry[0])} alt="" loading="lazy" />}
                <span><small>{label}</small><b>{name(entry[0])}</b><em>{entry[1].w}W-{entry[1].l}L</em></span>
              </div>
            ))}
          </div>
          {s.grindDay && <p className="wr__foot">Grind day: <b>{s.grindDay[0]}</b> ({s.grindDay[1]} games)</p>}
          <button type="button" className="wr__share" onClick={share}>{copied ? '✓ COPIED' : '⇪ SHARE RECAP'}</button>
        </>
      )}
    </section>
  )
}
