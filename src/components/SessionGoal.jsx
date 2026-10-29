import { useState } from 'react'
import { GOAL_TYPES, loadGoal, saveGoal, goalProgress } from '../utils/sessionGoal.js'
import { announcerOn, setAnnouncer } from '../utils/announcer.js'

export default function SessionGoal() {
  const [goal, setGoal] = useState(loadGoal)
  const [type, setType] = useState('wins')
  const [target, setTarget] = useState(4)
  const [voice, setVoice] = useState(announcerOn)
  const p = goalProgress(goal)

  const start = () => {
    const g = { type, target, start: Date.now() }
    saveGoal(g)
    setGoal(g)
  }
  const end = () => { saveGoal(null); setGoal(null) }
  const toggleVoice = () => { setAnnouncer(!voice); setVoice(!voice) }

  return (
    <section className={'sg' + (p?.done ? ' sg--done' : '')}>
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">SESSION GOAL</span>
          <h3 className="mw__title">{p ? `${GOAL_TYPES[goal.type].label} ${goal.target} ${GOAL_TYPES[goal.type].unit}` : 'Set a goal before you play'}</h3>
        </div>
        <button type="button" className={'sg__voice' + (voice ? ' on' : '')} onClick={toggleVoice} title="Announcer voice on wins/losses">
          {voice ? '🔊 ANNOUNCER ON' : '🔇 ANNOUNCER OFF'}
        </button>
      </div>

      {p ? (
        <>
          <div className="sg__bar"><i style={{ width: Math.min(100, (p.value / goal.target) * 100) + '%' }} /></div>
          <p className="sg__text">{p.text}</p>
          <div className="sg__foot">
            <span>This session: <b className="ql-w">{p.w}W</b> · <b className="ql-l">{p.l}L</b></span>
            <button type="button" className="sg__end" onClick={end}>{p.done ? 'NEW GOAL' : 'END GOAL'}</button>
          </div>
        </>
      ) : (
        <div className="sg__set">
          <div className="wr__tabs">
            {Object.entries(GOAL_TYPES).map(([k, t]) => (
              <button key={k} type="button" className={type === k ? 'on' : ''} onClick={() => { setType(k); setTarget(k === 'lossStreak' ? 3 : k === 'games' ? 10 : 4) }}>{t.label}{k === 'lossStreak' ? ' L-streak' : ''}</button>
            ))}
          </div>
          <div className="sg__num">
            <button type="button" onClick={() => setTarget(t => Math.max(1, t - 1))}>−</button>
            <b>{target}</b>
            <button type="button" onClick={() => setTarget(t => Math.min(50, t + 1))}>+</button>
            <span>{GOAL_TYPES[type].unit}</span>
          </div>
          <p className="sg__text">{GOAL_TYPES[type].hint}</p>
          <button type="button" className="wr__share" onClick={start}>▶ START SESSION</button>
        </div>
      )}
    </section>
  )
}
