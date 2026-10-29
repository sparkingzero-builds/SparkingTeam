import { useEffect, useMemo, useState } from 'react'
import { characters } from '../data/characters.js'
import { CHARACTER_TIPS } from '../data/counterStrategies.js'
import { allMatches, loadMain, loadHistory, saveHistory, loadRecords, saveRecords, logToJournal } from '../utils/matchLog.js'

const AS_KEY = 'szPlayingAs'
const byId = new Map(characters.map(c => [c.id, c]))

const ACTIVE_KEY = 'szActiveSession'

function readAs() {
  try { return JSON.parse(localStorage.getItem(AS_KEY)) } catch { return null }
}

function readActive() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)) } catch { return null }
}

function Portrait({ char, className }) {
  const img = char.forms[0]?.image
  return img
    ? <img className={className} src={img} alt="" loading="lazy" />
    : <div className={className + ' ql-ph'} style={{ background: char.color }}>{char.name[0]}</div>
}

export default function QuickLog({ onLogged }) {
  const [open, setOpen] = useState(false)
  const [enemy, setEnemy] = useState(null)
  const [search, setSearch] = useState('')
  const [asId, setAsId] = useState(() => readAs() || loadMain())
  const [pickingAs, setPickingAs] = useState(false)
  const [toast, setToast] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (open) setAsId(readAs() || loadMain())
  }, [open])

  useEffect(() => {
    const openSheet = () => setOpen(true)
    window.addEventListener('ql:open', openSheet)
    return () => window.removeEventListener('ql:open', openSheet)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.tip ? 9000 : 4000)
    return () => clearTimeout(t)
  }, [toast])

  const { frequent, today } = useMemo(() => {
    const matches = allMatches()
    const counts = new Map()
    for (const m of matches) counts.set(m.enemyId, (counts.get(m.enemyId) || 0) + 1)
    const frequent = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => byId.get(id))
      .filter(Boolean)
      .slice(0, 12)
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const todays = matches.filter(m => m.ts >= start.getTime())
    return {
      frequent,
      today: { w: todays.filter(m => m.result === 'w').length, l: todays.filter(m => m.result === 'l').length },
    }
  }, [version, open])

  const q = search.trim().toLowerCase()
  const results = q ? characters.filter(c => c.name.toLowerCase().includes(q)).slice(0, 24) : null
  const grid = results || (frequent.length ? frequent : characters.slice(0, 24))
  const asChar = asId ? byId.get(asId) : null

  const pickAs = (id) => {
    setAsId(id)
    localStorage.setItem(AS_KEY, JSON.stringify(id))
    setPickingAs(false)
    setSearch('')
  }

  const log = (result) => {
    const ts = Date.now()
    logToJournal(enemy.id, result, asId, ts)
    const active = readActive()
    if (active) {
      active.matches.push({ enemyId: enemy.id, result, myId: asId || null, ts })
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    }
    const tips = CHARACTER_TIPS[enemy.id]?.tips
    const tip = result === 'l' && tips?.length ? tips[Math.floor(Math.random() * tips.length)] : null
    setToast({ ts, enemyId: enemy.id, result, name: enemy.name, tip })
    setEnemy(null)
    setSearch('')
    setVersion(v => v + 1)
    onLogged?.()
  }

  const undo = () => {
    if (!toast) return
    saveHistory(loadHistory().filter(h => h.ts !== toast.ts))
    const active = readActive()
    if (active) {
      active.matches = active.matches.filter(m => m.ts !== toast.ts)
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    }
    const rec = loadRecords()
    if (rec[toast.enemyId]) {
      rec[toast.enemyId][toast.result] = Math.max(0, rec[toast.enemyId][toast.result] - 1)
      saveRecords(rec)
    }
    setToast(null)
    setVersion(v => v + 1)
    onLogged?.()
  }

  const close = () => { setOpen(false); setEnemy(null); setPickingAs(false); setSearch('') }

  return (
    <>
      <button className="ql-fab" type="button" onClick={() => setOpen(true)} aria-label="Quick log a match">
        <span className="ql-fab__bolt">⚡</span>
        <span className="ql-fab__label">LOG</span>
      </button>

      {toast && !open && (
        <div className={'ql-toast ql-toast--' + toast.result}>
          <div className="ql-toast__body">
            <span>{toast.result === 'w' ? 'WIN' : 'LOSS'} vs {toast.name} logged</span>
            {toast.tip && <p className="ql-tip"><b>Next time:</b> {toast.tip}</p>}
          </div>
          <button type="button" onClick={undo}>Undo</button>
        </div>
      )}

      {open && (
        <div className="ql-overlay" onClick={close}>
          <div className="ql-sheet" onClick={e => e.stopPropagation()}>
            <div className="ql-head">
              <button className="ql-as" type="button" onClick={() => { setPickingAs(p => !p); setSearch('') }}>
                {asChar ? <Portrait char={asChar} className="ql-as__img" /> : <div className="ql-as__img ql-ph">?</div>}
                <span className="ql-as__text">
                  <small>PLAYING AS</small>
                  <strong>{asChar ? asChar.name : 'Pick your fighter'}</strong>
                </span>
              </button>
              <div className="ql-today">
                <small>{readActive() ? <span className="ql-live">● SESSION LIVE</span> : 'TODAY'}</small>
                <strong><span className="ql-w">{today.w}W</span> · <span className="ql-l">{today.l}L</span></strong>
              </div>
              <button className="ql-close" type="button" onClick={close} aria-label="Close">✕</button>
            </div>

            {toast && (
              <div className={'ql-toast ql-toast--inline ql-toast--' + toast.result}>
                <div className="ql-toast__body">
                  <span>{toast.result === 'w' ? 'WIN' : 'LOSS'} vs {toast.name} logged</span>
                  {toast.tip && <p className="ql-tip"><b>Next time:</b> {toast.tip}</p>}
                </div>
                <button type="button" onClick={undo}>Undo</button>
              </div>
            )}

            {enemy && !pickingAs ? (
              <div className="ql-result">
                <div className="ql-vs">
                  {asChar && <Portrait char={asChar} className="ql-vs__img" />}
                  <span className="ql-vs__x">VS</span>
                  <Portrait char={enemy} className="ql-vs__img" />
                </div>
                <h3 className="ql-vs__name">{enemy.name}</h3>
                <div className="ql-wl">
                  <button className="ql-wl__btn ql-wl__btn--w" type="button" onClick={() => log('w')}>WIN</button>
                  <button className="ql-wl__btn ql-wl__btn--l" type="button" onClick={() => log('l')}>LOSS</button>
                </div>
                <button className="ql-back" type="button" onClick={() => setEnemy(null)}>← Different opponent</button>
              </div>
            ) : (
              <>
                <input
                  className="ql-search"
                  placeholder={pickingAs ? 'Who are you playing as?' : 'Search opponent…'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <p className="ql-hint">
                  {pickingAs ? 'Choose your fighter' : results ? `${results.length} found` : frequent.length ? 'Most faced' : 'Tap who you fought'}
                </p>
                <div className="ql-grid">
                  {(pickingAs ? (results || characters.slice(0, 24)) : grid).map(c => (
                    <button
                      key={c.id}
                      className={'ql-tile' + (pickingAs && c.id === asId ? ' ql-tile--on' : '')}
                      type="button"
                      onClick={() => pickingAs ? pickAs(c.id) : setEnemy(c)}
                    >
                      <Portrait char={c} className="ql-tile__img" />
                      <span className="ql-tile__name">{c.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
