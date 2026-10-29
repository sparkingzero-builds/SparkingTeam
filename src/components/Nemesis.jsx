import { charactersById } from '../data/characters.js'
import { CHARACTER_TIPS } from '../data/counterStrategies.js'
import { allMatches } from '../utils/matchLog.js'

const MIN_GAMES = 3

export default function Nemesis({ onOpen }) {
  const rows = new Map()
  for (const m of allMatches()) {
    const r = rows.get(m.enemyId) || { w: 0, l: 0 }
    r[m.result]++
    rows.set(m.enemyId, r)
  }

  let worst = null
  for (const [id, r] of rows) {
    const n = r.w + r.l
    if (n < MIN_GAMES || r.l <= r.w) continue
    const rate = r.w / n
    if (!worst || rate < worst.rate || (rate === worst.rate && n > worst.n)) worst = { id, ...r, n, rate }
  }
  if (!worst) return null

  const char = charactersById[worst.id]
  if (!char) return null
  const info = CHARACTER_TIPS[worst.id]
  const tip = info?.tips?.[new Date().getDate() % info.tips.length]
  const img = char.forms[char.forms.length - 1]?.image || char.forms[0].image

  return (
    <button className="nem" type="button" onClick={() => onOpen?.(char)}>
      <div className="nem__art">{img && <img src={img} alt="" />}</div>
      <div className="nem__body">
        <span className="nem__eyebrow">⚠ YOUR NEMESIS</span>
        <h3 className="nem__name">{char.name}</h3>
        <div className="nem__rec">
          <b className="nem__w">{worst.w}W</b>
          <b className="nem__l">{worst.l}L</b>
          <span>{Math.round(worst.rate * 100)}% win rate</span>
        </div>
        {info?.danger && <p className="nem__danger">{info.danger}</p>}
        {tip && <p className="nem__tip"><b>Try:</b> {tip}</p>}
      </div>
    </button>
  )
}
