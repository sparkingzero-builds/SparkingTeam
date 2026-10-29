import { allMatches } from '../utils/matchLog.js'
import { dailyQuests, progression, QUEST_XP } from '../utils/progression.js'

function untilMidnight() {
  const end = new Date()
  end.setHours(24, 0, 0, 0)
  const mins = Math.round((end - Date.now()) / 60000)
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
}

export default function DailyQuests() {
  const matches = allMatches()
  const quests = dailyQuests(matches)
  const prog = progression(matches)
  const done = quests.filter(q => q.done).length

  return (
    <div className="dq">
      <div className="dq__head">
        <div className="dq__level">
          <span className="dq__lvl-num">{prog.level}</span>
          <span className="dq__lvl-tag">LEVEL</span>
        </div>
        <div className="dq__xp">
          <div className="dq__xp-top">
            <span>SEASON XP</span>
            <span>{prog.into} / {prog.need}</span>
          </div>
          <div className="dq__xp-bar"><i style={{ width: `${prog.pct}%` }} /></div>
        </div>
        <div className="dq__timer">
          <small>RESETS IN</small>
          <b>{untilMidnight()}</b>
        </div>
      </div>

      <div className="dq__title">DAILY QUESTS <span>{done}/3</span></div>
      <div className="dq__list">
        {quests.map(q => (
          <div key={q.id} className={'dq__quest' + (q.done ? ' dq__quest--done' : '')}>
            <span className="dq__check" />
            <div className="dq__quest-body">
              <span className="dq__quest-label">{q.label}</span>
              <div className="dq__quest-bar"><i style={{ width: `${(q.progress / q.goal) * 100}%` }} /></div>
            </div>
            <span className="dq__quest-count">{q.progress}/{q.goal}</span>
            <span className="dq__reward">+{QUEST_XP} XP</span>
          </div>
        ))}
      </div>
    </div>
  )
}
