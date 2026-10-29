import { useState } from 'react'
import { characters } from '../data/characters.js'
import { allMatches, loadMain } from '../utils/matchLog.js'

const WINDOW = 20
const TARGET = 60
const RANK_KEY = 'szRank'

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function mostPlayed(matches) {
  const counts = new Map()
  for (const m of matches) if (m.myId) counts.set(m.myId, (counts.get(m.myId) || 0) + 1)
  let best = null
  for (const [id, n] of counts) if (!best || n > best[1]) best = [id, n]
  return best?.[0] || null
}

export default function LevelUpGoal({ onLog }) {
  const [rank, setRank] = useState(() => read(RANK_KEY) || '')
  const [editing, setEditing] = useState(false)

  const matches = allMatches()
  const charId = read('szPlayingAs') || loadMain() || mostPlayed(matches)
  const char = charId ? characters.find(c => c.id === charId) : null
  if (!char) {
    return (
      <div className="lvl lvl--empty">
        <div className="lvl__body">
          <span className="lvl__eyebrow">LEVEL-UP TRACKER</span>
          <h3 className="lvl__title">Who do you main?</h3>
          <p className="lvl__verdict">Log one game and pick who you're playing as. I'll track when you're ready for the next form.</p>
        </div>
        <div className="lvl__side">
          <button className="lvl__log" type="button" onClick={onLog}>⚡ LOG GAME</button>
        </div>
      </div>
    )
  }

  const recent = matches.filter(m => m.myId === char.id).slice(0, WINDOW)
  const wins = recent.filter(m => m.result === 'w').length
  const rate = recent.length ? Math.round((wins / recent.length) * 100) : 0
  const ready = recent.length >= WINDOW && rate >= TARGET
  const next = char.forms[1]
  const R = 46
  const C = 2 * Math.PI * R

  const saveRank = (v) => {
    const clean = v.trim().toUpperCase().slice(0, 6)
    setRank(clean)
    localStorage.setItem(RANK_KEY, JSON.stringify(clean))
    setEditing(false)
  }

  let verdict
  if (recent.length < WINDOW) verdict = `Log ${WINDOW - recent.length} more ${char.name} games to get a read.`
  else if (ready) verdict = next ? `You're ready. Time to run ${next.form}.` : `You've mastered ${char.name}.`
  else verdict = `${TARGET - rate}% to go over your last ${WINDOW}. Keep grinding base.`

  return (
    <div className={'lvl' + (ready ? ' lvl--ready' : '')}>
      <div className="lvl__ring">
        <svg viewBox="0 0 110 110">
          <circle className="lvl__track" cx="55" cy="55" r={R} />
          <circle className="lvl__target" cx="55" cy="55" r={R} strokeDasharray={`2 ${C}`} strokeDashoffset={-C * TARGET / 100} />
          <circle className="lvl__fill" cx="55" cy="55" r={R} strokeDasharray={`${(C * rate) / 100} ${C}`} />
        </svg>
        <div className="lvl__ring-val"><b>{rate}%</b><small>LAST {recent.length}</small></div>
      </div>

      <div className="lvl__body">
        <span className="lvl__eyebrow">{ready ? 'LEVEL UP UNLOCKED · ' : 'ROAD TO '}{next ? next.form.toUpperCase() : 'MASTERY'}</span>
        <h3 className="lvl__title">{char.name} <span>{char.forms[0].form}</span></h3>
        <p className="lvl__verdict">{verdict}</p>
        <div className="lvl__pips">
          {Array.from({ length: WINDOW }, (_, i) => {
            const m = recent[WINDOW - 1 - i]
            return <i key={i} className={m ? 'lvl__pip--' + m.result : ''} />
          })}
        </div>
      </div>

      <div className="lvl__side">
        {editing ? (
          <input
            className="lvl__rank-input"
            defaultValue={rank}
            placeholder="B1"
            autoFocus
            onBlur={e => saveRank(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveRank(e.target.value)}
          />
        ) : (
          <button className="lvl__rank" type="button" onClick={() => setEditing(true)} title="Set your ranked tier">
            <small>RANK</small>
            <b>{rank || '—'}</b>
          </button>
        )}
        <button className="lvl__log" type="button" onClick={onLog}>⚡ LOG GAME</button>
      </div>
    </div>
  )
}
