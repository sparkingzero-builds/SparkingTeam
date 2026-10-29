import { useState } from 'react'
import { charactersById } from '../data/characters.js'
import { allMatches } from '../utils/matchLog.js'
import { matchupTrend } from '../utils/insights.js'

function heat(rate) {
  // red (0%) → amber (50%) → green (100%)
  const hue = Math.round(rate * 1.3)
  return `hsl(${hue}, 80%, 45%)`
}

export default function MatchupHeatmap({ onOpen }) {
  const [sort, setSort] = useState('worst')
  const map = new Map()
  const all = allMatches()
  for (const m of all) {
    const e = map.get(m.enemyId) || { w: 0, l: 0 }
    e[m.result]++
    map.set(m.enemyId, e)
  }
  const cells = [...map.entries()]
    .filter(([id]) => charactersById[id])
    .map(([id, e]) => ({ id, ...e, n: e.w + e.l, rate: Math.round((e.w / (e.w + e.l)) * 100) }))
  if (sort === 'worst') cells.sort((a, b) => a.rate - b.rate || b.n - a.n)
  else if (sort === 'best') cells.sort((a, b) => b.rate - a.rate || b.n - a.n)
  else cells.sort((a, b) => b.n - a.n)

  return (
    <section className="hm">
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">MAIN VS FIELD</span>
          <h3 className="mw__title">Matchup Heatmap</h3>
        </div>
        <div className="wr__tabs">
          {[['worst', 'Weakest'], ['best', 'Strongest'], ['most', 'Most faced']].map(([k, l]) => (
            <button key={k} type="button" className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </div>
      {!cells.length ? (
        <p className="mw__hint">Log some games and every opponent you've faced lights up here, green to red.</p>
      ) : (
        <>
          <div className="hm__grid">
            {cells.map(c => {
              const ch = charactersById[c.id]
              const trend = matchupTrend(c.id, all)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={'hm__cell' + (c.n < 3 ? ' hm__cell--thin' : '')}
                  style={{ '--heat': heat(c.rate) }}
                  title={`${ch.name}: ${c.w}W-${c.l}L`}
                  onClick={() => onOpen?.(c.id)}
                >
                  {ch.forms[0]?.image ? <img src={ch.forms[0].image} alt="" loading="lazy" /> : <span className="hm__ph">{ch.name[0]}</span>}
                  <b>{c.rate}%</b>
                  <small>{c.w}-{c.l}</small>
                  {trend && trend.dir !== 'flat' && (
                    <i className={'hm__trend hm__trend--' + trend.dir} title={`Last 5 vs previous 5: ${trend.diff > 0 ? '+' : ''}${trend.diff}%`}>
                      {trend.dir === 'up' ? '▲' : '▼'}
                    </i>
                  )}
                </button>
              )
            })}
          </div>
          <div className="hm__legend"><span>0%</span><i /><span>100%</span><em>▲▼ = trend over last 5 games · Faded = under 3 games</em></div>
        </>
      )}
    </section>
  )
}
