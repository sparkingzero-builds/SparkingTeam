import { useState } from 'react'
import { charactersById } from '../data/characters.js'
import { META_BY_ID, META_PATCH } from '../data/metaWatch.js'
import { allMatches, loadMain } from '../utils/matchLog.js'

const LABEL = { buff: '▲ BUFF', nerf: '▼ NERF', mixed: '◆ MIXED' }

export default function MetaWatch({ onOpen }) {
  const [filter, setFilter] = useState('relevant')
  const faced = new Set(allMatches().flatMap(m => [m.enemyId, m.myId]))
  const main = loadMain()
  if (main) faced.add(main)

  let rows = [...META_BY_ID.entries()].filter(([id]) => charactersById[id])
  const relevant = rows.filter(([id]) => faced.has(id))
  if (filter === 'relevant' && relevant.length) rows = relevant
  else if (filter !== 'relevant' && filter !== 'all') rows = rows.filter(([, e]) => e.verdict === filter)
  const order = { nerf: 0, mixed: 1, buff: 2 }
  rows.sort((a, b) => order[a[1].verdict] - order[b[1].verdict])

  return (
    <section className="mw">
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">META WATCH</span>
          <h3 className="mw__title">{META_PATCH.name}</h3>
        </div>
        <div className="wr__tabs">
          {['relevant', 'buff', 'nerf', 'mixed', 'all'].map(f => (
            <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'relevant' ? 'My fights' : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {filter === 'relevant' && !relevant.length && <p className="mw__hint">None of your fighters were touched. Showing everything.</p>}
      <div className="mw__list">
        {rows.map(([id, e]) => {
          const c = charactersById[id]
          return (
            <button key={id} type="button" className={'mw__row mw__row--' + e.verdict} onClick={() => onOpen?.(id)}>
              {c.forms[0]?.image && <img src={c.forms[0].image} alt="" loading="lazy" />}
              <span className="mw__name">{c.name}{faced.has(id) && <i>FACED</i>}</span>
              <span className="mw__notes">{e.notes.map(n => n.note).join(' · ')}</span>
              <b className="mw__tag">{LABEL[e.verdict]}</b>
            </button>
          )
        })}
      </div>
      <a className="mw__link" href={META_PATCH.link} target="_blank" rel="noreferrer">Full patch notes ↗</a>
    </section>
  )
}
