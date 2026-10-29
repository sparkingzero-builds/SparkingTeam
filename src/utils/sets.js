const ACTIVE = 'szActiveSet'
const SETS = 'szSets'

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export const SET_FORMATS = [2, 3, 5, 10]

export function loadActiveSet() { return read(ACTIVE, null) }
export function loadSets() { return read(SETS, []) }

export function startSet(ft, name) {
  const set = { ft, name: name.trim() || null, w: 0, l: 0, games: [], start: Date.now() }
  localStorage.setItem(ACTIVE, JSON.stringify(set))
  return set
}

export function cancelSet() { localStorage.removeItem(ACTIVE) }

// Adds a game to the running set. Returns the finished set when this game decides it.
export function addSetGame(result, ts, myId) {
  const set = loadActiveSet()
  if (!set) return null
  set[result]++
  set.games.push(ts)
  if (set.w < set.ft && set.l < set.ft) {
    localStorage.setItem(ACTIVE, JSON.stringify(set))
    return { set, done: false }
  }
  const done = { ...set, won: set.w > set.l, myId: myId || null, end: ts }
  localStorage.setItem(SETS, JSON.stringify([done, ...loadSets()].slice(0, 300)))
  localStorage.removeItem(ACTIVE)
  return { set: done, done: true }
}

// Reverses addSetGame for an undone game, reopening the set if that game had finished it.
export function undoSetGame(ts, result) {
  const active = loadActiveSet()
  if (active?.games.includes(ts)) {
    active[result]--
    active.games = active.games.filter(g => g !== ts)
    localStorage.setItem(ACTIVE, JSON.stringify(active))
    return
  }
  const sets = loadSets()
  if (sets[0]?.end === ts) {
    const { won, myId, end, ...reopened } = sets[0]
    reopened[result]--
    reopened.games = reopened.games.filter(g => g !== ts)
    localStorage.setItem(SETS, JSON.stringify(sets.slice(1)))
    localStorage.setItem(ACTIVE, JSON.stringify(reopened))
  }
}
