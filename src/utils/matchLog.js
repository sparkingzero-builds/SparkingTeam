export const RECORD_KEY = 'szMatchRecord'
export const HISTORY_KEY = 'szMatchHistory'
export const SESSIONS_KEY = 'szSessions'
export const MAIN_KEY = 'szMainFighter'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function loadRecords() { return read(RECORD_KEY, {}) }
export function loadHistory() { return read(HISTORY_KEY, []) }
export function loadSessions() { return read(SESSIONS_KEY, []) }
export function loadMain() { return read(MAIN_KEY, null) }

export function saveRecords(r) { localStorage.setItem(RECORD_KEY, JSON.stringify(r)) }
export function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) }

// ts must be the same value stored on the session match, so allMatches() can
// dedupe the two copies of a Session Mode result.
export function logToJournal(enemyId, result, myId, ts = Date.now(), formEnd = null) {
  const records = loadRecords()
  if (!records[enemyId]) records[enemyId] = { w: 0, l: 0 }
  records[enemyId][result]++
  saveRecords(records)

  const history = loadHistory()
  history.unshift({ enemyId, result, myId: myId || null, ts, ...(formEnd && { formEnd }) })
  saveHistory(history.slice(0, 500))
}

export const MASTERY_TIERS = [
  { name: 'Diamond', min: 100, color: '#7fd8ff' },
  { name: 'Platinum', min: 50, color: '#b9f2e8' },
  { name: 'Gold', min: 30, color: '#ffc93c' },
  { name: 'Silver', min: 15, color: '#c8d3e6' },
  { name: 'Bronze', min: 5, color: '#cd7f32' },
  { name: 'Unranked', min: 0, color: '#5d6b8a' },
]

export function masteryFor(wins) {
  const tier = MASTERY_TIERS.find(t => wins >= t.min)
  const idx = MASTERY_TIERS.indexOf(tier)
  const next = idx > 0 ? MASTERY_TIERS[idx - 1] : null
  const progress = next
    ? Math.round(((wins - tier.min) / (next.min - tier.min)) * 100)
    : 100
  return { tier, next, progress }
}

// Every match ever recorded, from both loose history and completed sessions.
// Session matches are deduped against history by timestamp since Session Mode
// writes to both stores.
export function allMatches() {
  const history = loadHistory()
  const seen = new Set(history.map(h => h.ts))
  const out = [...history]
  for (const s of loadSessions()) {
    for (const m of s.matches) {
      if (!seen.has(m.ts)) out.push({ ...m, myId: m.myId || null })
    }
  }
  return out.sort((a, b) => b.ts - a.ts)
}
