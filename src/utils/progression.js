import { tierLists } from '../data/tierList.js'

const DAY_MS = 86400000
const WIN_XP = 100
const LOSS_XP = 40
const STREAK_XP = 25
const QUEST_XP = 150

const singles = tierLists.find(t => t.name === 'Singles')
const TOP_TIER = new Set([...(singles?.tiers || [])].filter(t => t.tier === 'Z' || t.tier === 'S').flatMap(t => t.characters))

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayIndex(ts) {
  return Math.floor(startOfDay(ts) / DAY_MS)
}

function longestWinRun(matches) {
  let best = 0, run = 0
  for (const m of matches) {
    run = m.result === 'w' ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

const QUEST_POOL = [
  { id: 'play3', label: 'Log 3 matches', goal: 3, count: ms => ms.length },
  { id: 'play5', label: 'Log 5 matches', goal: 5, count: ms => ms.length },
  { id: 'win2', label: 'Win 2 matches', goal: 2, count: ms => ms.filter(m => m.result === 'w').length },
  { id: 'win4', label: 'Win 4 matches', goal: 4, count: ms => ms.filter(m => m.result === 'w').length },
  { id: 'streak2', label: 'Win 2 in a row', goal: 2, count: ms => longestWinRun(ms) },
  { id: 'streak3', label: 'Win 3 in a row', goal: 3, count: ms => longestWinRun(ms) },
  { id: 'toptier', label: 'Beat a Z or S tier fighter', goal: 1, count: ms => ms.filter(m => m.result === 'w' && TOP_TIER.has(m.enemyId)).length },
  { id: 'variety', label: 'Face 3 different opponents', goal: 3, count: ms => new Set(ms.map(m => m.enemyId)).size },
]

// Same three quests for everyone on a given day; rotates at midnight.
function questsForDay(day) {
  const picks = []
  let seed = day * 2654435761 % 4294967296
  const pool = [...QUEST_POOL]
  while (picks.length < 3 && pool.length) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    picks.push(pool.splice(seed % pool.length, 1)[0])
  }
  return picks
}

export function dailyQuests(matches, now = Date.now()) {
  const day = dayIndex(now)
  const today = matches.filter(m => dayIndex(m.ts) === day).sort((a, b) => a.ts - b.ts)
  return questsForDay(day).map(q => {
    const progress = Math.min(q.goal, q.count(today))
    return { ...q, progress, done: progress >= q.goal }
  })
}

export function xpRequired(level) {
  return 300 + (level - 1) * 75
}

export function progression(matches) {
  const chrono = [...matches].sort((a, b) => a.ts - b.ts)
  let xp = 0, run = 0
  for (const m of chrono) {
    if (m.result === 'w') {
      run++
      xp += WIN_XP + (run >= 2 ? STREAK_XP * Math.min(run - 1, 4) : 0)
    } else {
      run = 0
      xp += LOSS_XP
    }
  }

  const days = new Set(chrono.map(m => dayIndex(m.ts)))
  for (const d of days) {
    const dayMatches = chrono.filter(m => dayIndex(m.ts) === d)
    for (const q of questsForDay(d)) if (q.count(dayMatches) >= q.goal) xp += QUEST_XP
  }

  let level = 1, rest = xp
  while (rest >= xpRequired(level)) {
    rest -= xpRequired(level)
    level++
  }
  return { xp, level, into: rest, need: xpRequired(level), pct: Math.round((rest / xpRequired(level)) * 100) }
}

export { QUEST_XP }
