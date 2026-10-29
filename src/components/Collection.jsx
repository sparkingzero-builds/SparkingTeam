import { useState } from 'react'
import { characters } from '../data/characters.js'
import { allMatches } from '../utils/matchLog.js'
import { rarityFor } from './FighterCard.jsx'

const SHINY_AT = 10

export default function Collection({ onOpen }) {
  const [show, setShow] = useState('all')
  const wins = new Map()
  for (const m of allMatches()) if (m.result === 'w') wins.set(m.enemyId, (wins.get(m.enemyId) || 0) + 1)

  const total = characters.length
  const owned = characters.filter(c => wins.has(c.id)).length
  const shiny = characters.filter(c => (wins.get(c.id) || 0) >= SHINY_AT).length
  const list = characters.filter(c =>
    show === 'owned' ? wins.has(c.id) : show === 'locked' ? !wins.has(c.id) : show === 'shiny' ? (wins.get(c.id) || 0) >= SHINY_AT : true)

  return (
    <section className="col">
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">CARD COLLECTION</span>
          <h3 className="mw__title">{owned} / {total} defeated</h3>
        </div>
        <div className="wr__tabs">
          {[['all', 'All'], ['owned', 'Unlocked'], ['locked', 'Locked'], ['shiny', '✦ Shiny']].map(([k, l]) => (
            <button key={k} type="button" className={show === k ? 'on' : ''} onClick={() => setShow(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="col__progress"><i style={{ width: (owned / total) * 100 + '%' }} /></div>
      <p className="mw__hint">Beat a fighter once to unlock their card. Beat them {SHINY_AT} times for the shiny version. {shiny ? `✦ ${shiny} shiny so far.` : ''}</p>
      <div className="col__grid">
        {list.map(c => {
          const n = wins.get(c.id) || 0
          const peak = c.forms.reduce((a, f) => (f.dp > a.dp ? f : a), c.forms[0])
          const state = n >= SHINY_AT ? 'shiny' : n ? 'owned' : 'locked'
          return (
            <button
              key={c.id}
              type="button"
              className={`col__card col__card--${state} col__card--${rarityFor(peak.dp)}`}
              onClick={() => onOpen?.(c.id)}
              title={n ? `${c.name}: beaten ${n}×` : `${c.name}: not beaten yet`}
            >
              {c.forms[0]?.image ? <img src={c.forms[0].image} alt="" loading="lazy" /> : <span className="col__ph">?</span>}
              <span className="col__name">{state === 'locked' ? '???' : c.name}</span>
              {n > 0 && <span className="col__count">{state === 'shiny' ? '✦' : '×'}{n}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
