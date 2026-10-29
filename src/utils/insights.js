import { allMatches } from './matchLog.js'

export const DAY = 86400000

export function between(matches, from, to) {
  return matches.filter(m => m.ts >= from && m.ts < to)
}

export function summary(matches) {
  const n = matches.length
  const w = matches.filter(m => m.result === 'w').length
  let best = 0, run = 0
  for (const m of [...matches].sort((a, b) => a.ts - b.ts)) {
    run = m.result === 'w' ? run + 1 : 0
    best = Math.max(best, run)
  }
  const graded = matches.filter(m => m.ki)
  const byEnemy = new Map()
  for (const m of matches) {
    const e = byEnemy.get(m.enemyId) || { w: 0, l: 0 }
    e[m.result]++
    byEnemy.set(m.enemyId, e)
  }
  const worst = [...byEnemy.entries()].filter(([, e]) => e.l > e.w).sort((a, b) => b[1].l - b[1].w - (a[1].l - a[1].w))[0]
  const best_ = [...byEnemy.entries()].filter(([, e]) => e.w > e.l).sort((a, b) => b[1].w - b[1].l - (a[1].w - a[1].l))[0]
  return {
    n, w, l: n - w,
    rate: n ? Math.round((w / n) * 100) : null,
    streak: best,
    ki: graded.length ? graded.reduce((s, m) => s + m.ki, 0) / graded.length : null,
    opponents: byEnemy.size,
    worst, best: best_,
    byEnemy,
  }
}

// Per-opponent trend: last 5 games vs the 5 before. Needs 6+ games against them.
export function matchupTrend(enemyId, matches = allMatches()) {
  const vs = matches.filter(m => m.enemyId === enemyId)
  if (vs.length < 6) return null
  const rate = list => list.filter(m => m.result === 'w').length / list.length
  const recent = vs.slice(0, 5)
  const older = vs.slice(5, 10)
  const diff = Math.round((rate(recent) - rate(older)) * 100)
  return { diff, dir: diff >= 40 ? 'up' : diff <= -40 ? 'down' : 'flat' }
}
