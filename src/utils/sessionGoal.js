import { allMatches } from './matchLog.js'

const KEY = 'szSessionGoal'

export const GOAL_TYPES = {
  wins: { label: 'Win', unit: 'games', hint: 'Stop once you hit it, while you\'re ahead' },
  games: { label: 'Play', unit: 'games', hint: 'A set number of games, then done' },
  lossStreak: { label: 'Stop after', unit: 'losses in a row', hint: 'Tilt guard: quit before it spirals' },
}

export function loadGoal() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function saveGoal(goal) {
  if (goal) localStorage.setItem(KEY, JSON.stringify(goal))
  else localStorage.removeItem(KEY)
}

// { goal, value, done, w, l, games, text }
export function goalProgress(goal = loadGoal()) {
  if (!goal) return null
  const ms = allMatches().filter(m => m.ts >= goal.start)
  const w = ms.filter(m => m.result === 'w').length
  let run = 0
  for (const m of ms) { if (m.result === 'l') run++; else break }
  const value = goal.type === 'wins' ? w : goal.type === 'games' ? ms.length : run
  const done = value >= goal.target
  let text
  if (goal.type === 'wins') text = done ? `Goal smashed! ${w} wins. Quit while you're ahead!` : `${goal.target - w} more ${goal.target - w === 1 ? 'win' : 'wins'} to go`
  else if (goal.type === 'games') text = done ? `Session complete. ${ms.length} games, ${w} wins.` : `${goal.target - ms.length} games left`
  else text = done ? `That's ${run} losses in a row. Session over, come back fresh.` : run ? `${run} of ${goal.target} losses in a row. Careful.` : 'Clean so far'
  return { goal, value, done, w, l: ms.length - w, games: ms.length, text }
}
