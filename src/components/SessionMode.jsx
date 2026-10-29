import { useState, useMemo, useCallback } from 'react'
import { characters, charactersById } from '../data/characters.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { logToJournal, allMatches } from '../utils/matchLog.js'

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SessionMode() {
  const [sessions, setSessions] = useLocalStorage('szSessions', [])
  const [active, setActive] = useLocalStorage('szActiveSession', null)
  const [main] = useLocalStorage('szMainFighter', null)
  const [playingAs, setPlayingAs] = useLocalStorage('szPlayingAs', null)
  const [search, setSearch] = useState('')
  const [viewingSession, setViewingSession] = useState(null)
  const [tiltDismissed, setTiltDismissed] = useState(0)
  const [showAsPicker, setShowAsPicker] = useState(false)
  const [asSearch, setAsSearch] = useState('')
  const [logMode, setLogMode] = useLocalStorage('szLogMode', 'single')
  const [openSet, setOpenSet] = useState(null)

  const currentAs = playingAs || main
  const currentAsChar = currentAs ? charactersById[currentAs] : null

  const asResults = useMemo(() => {
    if (!asSearch.trim()) return characters.slice(0, 12)
    return characters.filter(c => c.name.toLowerCase().includes(asSearch.trim().toLowerCase())).slice(0, 12)
  }, [asSearch])

  const searchResults = useMemo(() => {
    if (!search.trim()) {
      const counts = new Map()
      for (const m of allMatches()) counts.set(m.enemyId, (counts.get(m.enemyId) || 0) + 1)
      const faced = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => charactersById[id]).filter(Boolean)
      const rest = characters.filter(c => !counts.has(c.id))
      return [...faced, ...rest].slice(0, 18)
    }
    return characters.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 12)
  }, [search])

  const startSession = useCallback(() => {
    setActive({ startedAt: Date.now(), matches: [] })
    setTiltDismissed(0)
  }, [setActive])

  const logMatch = useCallback((enemyId, result) => {
    const ts = Date.now()
    setActive(prev => {
      if (!prev) return prev
      return { ...prev, matches: [...prev.matches, { enemyId, result, myId: currentAs || null, ts }] }
    })
    logToJournal(enemyId, result, currentAs, ts)
  }, [setActive, currentAs])

  // A ranked set is up to 3 games vs the same opponent. Each game is still
  // logged individually so per-character records stay accurate; the shared
  // setId is what lets us report set wins on top of game wins.
  const commitSet = useCallback((enemyId, games) => {
    if (games.length === 0) return
    const setId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const base = Date.now()
    const newMatches = games.map((result, i) => ({
      enemyId, result, myId: currentAs || null, ts: base + i, setId, gameNo: i + 1,
    }))
    setActive(prev => prev ? { ...prev, matches: [...prev.matches, ...newMatches] } : prev)
    for (const m of newMatches) logToJournal(m.enemyId, m.result, m.myId, m.ts)
    setOpenSet(null)
  }, [setActive, currentAs])

  const addSetGame = (result) => {
    setOpenSet(prev => {
      if (!prev || prev.games.length >= 3) return prev
      return { ...prev, games: [...prev.games, result] }
    })
  }

  const undoSetGame = () => {
    setOpenSet(prev => prev ? { ...prev, games: prev.games.slice(0, -1) } : prev)
  }

  const setScore = (games) => ({
    w: games.filter(g => g === 'w').length,
    l: games.filter(g => g === 'l').length,
  })
  const setDecided = (games) => {
    const { w, l } = setScore(games)
    return w === 2 || l === 2 || games.length === 3
  }

  const endSession = useCallback(() => {
    if (!active || active.matches.length === 0) {
      setActive(null)
      return
    }
    const session = {
      id: Date.now().toString(36),
      startedAt: active.startedAt,
      endedAt: Date.now(),
      matches: active.matches,
    }
    setSessions(prev => [session, ...prev].slice(0, 50))
    setActive(null)
    setViewingSession(session)
  }, [active, setActive, setSessions])

  const deleteSession = useCallback((id) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (viewingSession?.id === id) setViewingSession(null)
  }, [setSessions, viewingSession])

  const getSessionStats = (session) => {
    const matches = session.matches
    const wins = matches.filter(m => m.result === 'w').length
    const losses = matches.filter(m => m.result === 'l').length
    const total = matches.length
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    const duration = (session.endedAt || Date.now()) - session.startedAt

    let bestStreak = 0, worstStreak = 0, curW = 0, curL = 0
    for (const m of matches) {
      if (m.result === 'w') { curW++; curL = 0; if (curW > bestStreak) bestStreak = curW }
      else { curL++; curW = 0; if (curL > worstStreak) worstStreak = curL }
    }

    const oppRecord = {}
    for (const m of matches) {
      if (!oppRecord[m.enemyId]) oppRecord[m.enemyId] = { w: 0, l: 0 }
      oppRecord[m.enemyId][m.result]++
    }
    const oppEntries = Object.entries(oppRecord).map(([id, rec]) => ({
      id, char: charactersById[id], ...rec, total: rec.w + rec.l,
      winRate: Math.round((rec.w / (rec.w + rec.l)) * 100)
    })).filter(o => o.char)

    const hardest = [...oppEntries].filter(o => o.total >= 2).sort((a, b) => a.winRate - b.winRate).slice(0, 3)
    const easiest = [...oppEntries].filter(o => o.total >= 2).sort((a, b) => b.winRate - a.winRate).slice(0, 3)
    const mostFaced = [...oppEntries].sort((a, b) => b.total - a.total).slice(0, 3)

    // Sets: only matches tagged with a setId count toward set W/L.
    const setMap = new Map()
    for (const m of matches) {
      if (!m.setId) continue
      if (!setMap.has(m.setId)) setMap.set(m.setId, { w: 0, l: 0 })
      setMap.get(m.setId)[m.result]++
    }
    let setsWon = 0, setsLost = 0
    for (const s of setMap.values()) {
      if (s.w > s.l) setsWon++
      else if (s.l > s.w) setsLost++
    }
    const setsTotal = setsWon + setsLost
    const setWinRate = setsTotal > 0 ? Math.round((setsWon / setsTotal) * 100) : 0

    return {
      wins, losses, total, winRate, duration, bestStreak, worstStreak,
      hardest, easiest, mostFaced, setsWon, setsLost, setsTotal, setWinRate,
    }
  }

  // Collapse set games into a single display entry, keeping singles as-is.
  const groupEntries = (matches) => {
    const out = []
    const bySet = new Map()
    for (const m of matches) {
      if (!m.setId) { out.push({ type: 'single', ...m }); continue }
      if (bySet.has(m.setId)) { bySet.get(m.setId).games.push(m); continue }
      const entry = { type: 'set', setId: m.setId, enemyId: m.enemyId, ts: m.ts, games: [m] }
      bySet.set(m.setId, entry)
      out.push(entry)
    }
    return out
  }

  const activeStats = active ? getSessionStats({ ...active, endedAt: Date.now() }) : null

  const lossStreak = useMemo(() => {
    if (!active) return 0
    let n = 0
    for (let i = active.matches.length - 1; i >= 0; i--) {
      if (active.matches[i].result === 'l') n++
      else break
    }
    return n
  }, [active])

  const showTilt = lossStreak >= 3 && lossStreak > tiltDismissed

  if (viewingSession) {
    const stats = getSessionStats(viewingSession)
    return (
      <div className="session">
        <button className="session-back" type="button" onClick={() => setViewingSession(null)}>&larr; Back</button>
        <SessionSummary session={viewingSession} stats={stats} />
      </div>
    )
  }

  if (active) {
    return (
      <div className="session">
        <div className="session-active-header">
          <div className="session-active-header__left">
            <div className="session-live-dot" />
            <span className="session-active-header__title">Session Live</span>
            <span className="session-active-header__time">{formatDuration(Date.now() - active.startedAt)}</span>
          </div>
          <button className="session-end-btn" type="button" onClick={endSession}>End Session</button>
        </div>

        <div className="session-as">
          <span className="session-as__label">Playing as</span>
          {currentAsChar ? (
            <button className="session-as__current" type="button" onClick={() => setShowAsPicker(v => !v)}>
              {currentAsChar.forms[0]?.image ? (
                <img className="session-as__img" src={currentAsChar.forms[0].image} alt="" />
              ) : (
                <div className="session-as__ph" style={{ background: currentAsChar.color }}>{currentAsChar.name[0]}</div>
              )}
              <span>{currentAsChar.name}</span>
              <span className="session-as__caret">&#9662;</span>
            </button>
          ) : (
            <button className="session-as__pick" type="button" onClick={() => setShowAsPicker(v => !v)}>Choose fighter</button>
          )}
          {showAsPicker && (
            <div className="session-as__picker">
              <input
                className="session-as__search"
                type="text"
                placeholder="Search your fighter..."
                value={asSearch}
                onChange={e => setAsSearch(e.target.value)}
                autoFocus
              />
              <div className="session-as__results">
                {asResults.map(c => (
                  <button
                    key={c.id}
                    className={'session-as__result' + (c.id === currentAs ? ' session-as__result--active' : '')}
                    type="button"
                    onClick={() => { setPlayingAs(c.id); setShowAsPicker(false); setAsSearch('') }}
                  >
                    {c.forms[0]?.image ? (
                      <img className="session-as__result-img" src={c.forms[0].image} alt="" />
                    ) : (
                      <div className="session-as__result-ph" style={{ background: c.color }}>{c.name[0]}</div>
                    )}
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showTilt && (
          <div className="session-tilt">
            <div className="session-tilt__body">
              <span className="session-tilt__title">{lossStreak} losses in a row</span>
              <span className="session-tilt__sub">
                {lossStreak >= 5
                  ? "That's a rough run. Step away for a bit — you'll come back sharper."
                  : 'Tilt kills more runs than bad matchups. Take a breather?'}
              </span>
            </div>
            <div className="session-tilt__actions">
              <button className="session-tilt__btn" type="button" onClick={() => setTiltDismissed(lossStreak)}>Keep playing</button>
              <button className="session-tilt__btn session-tilt__btn--end" type="button" onClick={endSession}>End session</button>
            </div>
          </div>
        )}

        <div className="session-live-stats">
          <div className="session-live-stat">
            <span className="session-live-stat__val">{activeStats.total}</span>
            <span className="session-live-stat__label">Matches</span>
          </div>
          <div className="session-live-stat">
            <span className="session-live-stat__val session-live-stat__val--w">{activeStats.wins}</span>
            <span className="session-live-stat__label">Wins</span>
          </div>
          <div className="session-live-stat">
            <span className="session-live-stat__val session-live-stat__val--l">{activeStats.losses}</span>
            <span className="session-live-stat__label">Losses</span>
          </div>
          <div className="session-live-stat">
            <span className="session-live-stat__val">{activeStats.winRate}%</span>
            <span className="session-live-stat__label">Win Rate</span>
          </div>
          {activeStats.setsTotal > 0 && (
            <div className="session-live-stat">
              <span className="session-live-stat__val">{activeStats.setsWon}-{activeStats.setsLost}</span>
              <span className="session-live-stat__label">Sets</span>
            </div>
          )}
        </div>

        {active.matches.length > 0 && (
          <div className="session-momentum">
            <span className="session-momentum__label">Momentum</span>
            <div className="session-momentum__track">
              {active.matches.map((m, i) => (
                <div
                  key={i}
                  className={'session-momentum__dot session-momentum__dot--' + m.result}
                  title={`${charactersById[m.enemyId]?.name || '?'} — ${m.result === 'w' ? 'Win' : 'Loss'}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="session-log">
          <div className="session-log__head">
            <p className="session-log__intro">Who did you just fight?</p>
            <div className="session-modes">
              <button
                className={'session-mode' + (logMode === 'single' ? ' session-mode--active' : '')}
                type="button"
                onClick={() => { setLogMode('single'); setOpenSet(null) }}
              >Single</button>
              <button
                className={'session-mode' + (logMode === 'set' ? ' session-mode--active' : '')}
                type="button"
                onClick={() => setLogMode('set')}
              >Best of 3</button>
            </div>
          </div>

          {openSet ? (
            <SetPanel
              enemy={charactersById[openSet.enemyId]}
              games={openSet.games}
              score={setScore(openSet.games)}
              decided={setDecided(openSet.games)}
              onGame={addSetGame}
              onUndo={undoSetGame}
              onSave={() => commitSet(openSet.enemyId, openSet.games)}
              onCancel={() => setOpenSet(null)}
            />
          ) : (
            <>
              <input
                className="session-log__search"
                type="text"
                placeholder="Search opponent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="session-log__grid">
                {searchResults.map(c => (
                  <div key={c.id} className="session-log__card">
                    <div className="session-log__card-top">
                      {c.forms[0]?.image ? (
                        <img className="session-log__card-img" src={c.forms[0].image} alt="" />
                      ) : (
                        <div className="session-log__card-ph" style={{ background: c.color }}>{c.name[0]}</div>
                      )}
                      <span className="session-log__card-name">{c.name}</span>
                    </div>
                    {logMode === 'set' ? (
                      <button
                        className="session-log__set-btn"
                        type="button"
                        onClick={() => setOpenSet({ enemyId: c.id, games: [] })}
                      >Log Set</button>
                    ) : (
                      <div className="session-log__card-btns">
                        <button className="session-log__btn session-log__btn--w" type="button" onClick={() => logMatch(c.id, 'w')}>W</button>
                        <button className="session-log__btn session-log__btn--l" type="button" onClick={() => logMatch(c.id, 'l')}>L</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {active.matches.length > 0 && (
          <div className="session-recent">
            <h3 className="session-recent__title">This Session</h3>
            <div className="session-recent__list">
              {[...groupEntries(active.matches)].reverse().map((e, i) => {
                const char = charactersById[e.enemyId]
                if (!char) return null
                const isSet = e.type === 'set'
                const score = isSet ? setScore(e.games.map(g => g.result)) : null
                const outcome = isSet ? (score.w > score.l ? 'w' : 'l') : e.result
                return (
                  <div key={i} className={'session-recent__entry session-recent__entry--' + outcome}>
                    {char.forms[0]?.image ? (
                      <img className="session-recent__img" src={char.forms[0].image} alt="" />
                    ) : (
                      <div className="session-recent__ph" style={{ background: char.color }}>{char.name[0]}</div>
                    )}
                    <span className="session-recent__name">{char.name}</span>
                    {isSet && (
                      <>
                        <span className="session-recent__set-tag">SET</span>
                        <span className="session-recent__games">
                          {e.games.map((g, gi) => (
                            <span key={gi} className={'session-recent__game session-recent__game--' + g.result}>
                              {g.result === 'w' ? 'W' : 'L'}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                    <span className={'session-recent__result session-recent__result--' + outcome}>
                      {isSet ? `${score.w}-${score.l}` : (e.result === 'w' ? 'W' : 'L')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="session">
      <div className="session-start">
        <h2 className="session-start__title">Session Mode</h2>
        <p className="session-start__sub">Track a play session in real time. Log each match as you go, see your momentum, and get a full breakdown when you're done.</p>
        <button className="session-start__btn" type="button" onClick={startSession}>Start Session</button>
      </div>

      {sessions.length > 0 && (
        <div className="session-history">
          <h3 className="session-history__title">Past Sessions</h3>
          <div className="session-history__list">
            {sessions.map(s => {
              const stats = getSessionStats(s)
              return (
                <div
                  key={s.id}
                  className="session-history__card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingSession(s)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewingSession(s) } }}
                >
                  <div className="session-history__card-top">
                    <span className="session-history__date">{formatDate(s.startedAt)}</span>
                    <span className="session-history__duration">{formatDuration(stats.duration)}</span>
                  </div>
                  <div className="session-history__card-stats">
                    <span className={'session-history__winrate' + (stats.winRate >= 50 ? ' session-history__winrate--good' : ' session-history__winrate--bad')}>
                      {stats.winRate}%
                    </span>
                    <span className="session-history__record">{stats.wins}W-{stats.losses}L</span>
                    <span className="session-history__total">{stats.total} matches</span>
                  </div>
                  <div className="session-history__momentum">
                    {s.matches.slice(0, 20).map((m, i) => (
                      <div key={i} className={'session-momentum__dot session-momentum__dot--' + m.result} />
                    ))}
                    {s.matches.length > 20 && <span className="session-history__more">+{s.matches.length - 20}</span>}
                  </div>
                  <button
                    className="session-history__delete"
                    type="button"
                    onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                  >&times;</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SetPanel({ enemy, games, score, decided, onGame, onUndo, onSave, onCancel }) {
  if (!enemy) return null
  return (
    <div className="setpanel">
      <div className="setpanel__head">
        {enemy.forms[0]?.image ? (
          <img className="setpanel__img" src={enemy.forms[0].image} alt="" />
        ) : (
          <div className="setpanel__ph" style={{ background: enemy.color }}>{enemy.name[0]}</div>
        )}
        <div className="setpanel__id">
          <span className="setpanel__label">Set vs</span>
          <span className="setpanel__name">{enemy.name}</span>
        </div>
        <span className={'setpanel__score' + (score.w > score.l ? ' setpanel__score--w' : score.l > score.w ? ' setpanel__score--l' : '')}>
          {score.w}-{score.l}
        </span>
      </div>

      <div className="setpanel__games">
        {[0, 1, 2].map(i => {
          const g = games[i]
          return (
            <div key={i} className={'setpanel__game' + (g ? ' setpanel__game--' + g : '')}>
              <span className="setpanel__game-no">Game {i + 1}</span>
              <span className="setpanel__game-res">{g ? (g === 'w' ? 'WIN' : 'LOSS') : '—'}</span>
            </div>
          )
        })}
      </div>

      {!decided ? (
        <div className="setpanel__btns">
          <button className="setpanel__btn setpanel__btn--w" type="button" onClick={() => onGame('w')}>
            Won Game {games.length + 1}
          </button>
          <button className="setpanel__btn setpanel__btn--l" type="button" onClick={() => onGame('l')}>
            Lost Game {games.length + 1}
          </button>
        </div>
      ) : (
        <p className="setpanel__done">
          Set {score.w > score.l ? 'won' : 'lost'} {score.w}-{score.l}. Save it to add {games.length} match{games.length === 1 ? '' : 'es'} to your record.
        </p>
      )}

      <div className="setpanel__actions">
        <button className="setpanel__action" type="button" onClick={onCancel}>Cancel</button>
        {games.length > 0 && (
          <button className="setpanel__action" type="button" onClick={onUndo}>Undo last</button>
        )}
        <button
          className="setpanel__action setpanel__action--save"
          type="button"
          onClick={onSave}
          disabled={games.length === 0}
        >Save Set</button>
      </div>
    </div>
  )
}

function SessionSummary({ session, stats }) {
  return (
    <div className="session-summary">
      <h2 className="session-summary__title">Session Summary</h2>
      <div className="session-summary__meta">
        <span>{formatDate(session.startedAt)}</span>
        <span>{formatDuration(stats.duration)}</span>
      </div>

      <div className="session-summary__big-stats">
        <div className="session-summary__stat">
          <span className={'session-summary__stat-val' + (stats.winRate >= 50 ? ' session-summary__stat-val--good' : ' session-summary__stat-val--bad')}>
            {stats.winRate}%
          </span>
          <span className="session-summary__stat-label">Win Rate</span>
        </div>
        <div className="session-summary__stat">
          <span className="session-summary__stat-val">{stats.wins}-{stats.losses}</span>
          <span className="session-summary__stat-label">Record</span>
        </div>
        <div className="session-summary__stat">
          <span className="session-summary__stat-val">{stats.total}</span>
          <span className="session-summary__stat-label">Matches</span>
        </div>
        <div className="session-summary__stat">
          <span className="session-summary__stat-val session-summary__stat-val--good">{stats.bestStreak}</span>
          <span className="session-summary__stat-label">Best Streak</span>
        </div>
        <div className="session-summary__stat">
          <span className="session-summary__stat-val session-summary__stat-val--bad">{stats.worstStreak}</span>
          <span className="session-summary__stat-label">Worst Streak</span>
        </div>
        {stats.setsTotal > 0 && (
          <>
            <div className="session-summary__stat">
              <span className="session-summary__stat-val">{stats.setsWon}-{stats.setsLost}</span>
              <span className="session-summary__stat-label">Sets</span>
            </div>
            <div className="session-summary__stat">
              <span className={'session-summary__stat-val' + (stats.setWinRate >= 50 ? ' session-summary__stat-val--good' : ' session-summary__stat-val--bad')}>
                {stats.setWinRate}%
              </span>
              <span className="session-summary__stat-label">Set Win Rate</span>
            </div>
          </>
        )}
      </div>

      <div className="session-summary__momentum">
        <span className="session-momentum__label">Match Flow</span>
        <div className="session-momentum__track">
          {session.matches.map((m, i) => (
            <div
              key={i}
              className={'session-momentum__dot session-momentum__dot--' + m.result}
              title={`${charactersById[m.enemyId]?.name || '?'} — ${m.result === 'w' ? 'Win' : 'Loss'}`}
            />
          ))}
        </div>
      </div>

      {stats.mostFaced.length > 0 && (
        <div className="session-summary__section">
          <h3 className="session-summary__section-title">Most Faced</h3>
          <div className="session-summary__opp-list">
            {stats.mostFaced.map(o => (
              <div key={o.id} className="session-summary__opp">
                {o.char.forms[0]?.image ? (
                  <img className="session-summary__opp-img" src={o.char.forms[0].image} alt="" />
                ) : (
                  <div className="session-summary__opp-ph" style={{ background: o.char.color }}>{o.char.name[0]}</div>
                )}
                <span className="session-summary__opp-name">{o.char.name}</span>
                <span className="session-summary__opp-record">{o.w}W-{o.l}L</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.hardest.length > 0 && (
        <div className="session-summary__section">
          <h3 className="session-summary__section-title">Struggled Against</h3>
          <div className="session-summary__opp-list">
            {stats.hardest.map(o => (
              <div key={o.id} className="session-summary__opp">
                {o.char.forms[0]?.image ? (
                  <img className="session-summary__opp-img" src={o.char.forms[0].image} alt="" />
                ) : (
                  <div className="session-summary__opp-ph" style={{ background: o.char.color }}>{o.char.name[0]}</div>
                )}
                <span className="session-summary__opp-name">{o.char.name}</span>
                <span className="session-summary__opp-record session-summary__opp-record--bad">{o.winRate}% ({o.w}W-{o.l}L)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.easiest.length > 0 && (
        <div className="session-summary__section">
          <h3 className="session-summary__section-title">Dominated</h3>
          <div className="session-summary__opp-list">
            {stats.easiest.map(o => (
              <div key={o.id} className="session-summary__opp">
                {o.char.forms[0]?.image ? (
                  <img className="session-summary__opp-img" src={o.char.forms[0].image} alt="" />
                ) : (
                  <div className="session-summary__opp-ph" style={{ background: o.char.color }}>{o.char.name[0]}</div>
                )}
                <span className="session-summary__opp-name">{o.char.name}</span>
                <span className="session-summary__opp-record session-summary__opp-record--good">{o.winRate}% ({o.w}W-{o.l}L)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
