import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { playBadge } from '../utils/sounds.js'

const ORDER = 'EDCBASZ'

// True when `next` looks like progress over `prev`: a better letter, or the same letter with a different division.
export function isRankUp(prev, next) {
  if (!next || !prev || prev === next) return false
  const a = ORDER.indexOf(prev[0]), b = ORDER.indexOf(next[0])
  if (a < 0 || b < 0) return false
  return b > a || b === a
}

export default function RankUpCutscene({ from, to, onDone }) {
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    playBadge()
    const t = setTimeout(() => done.current(), 3200)
    return () => clearTimeout(t)
  }, [])

  const big = ORDER.indexOf(to[0]) > ORDER.indexOf(from[0])
  return createPortal(
    <div className="rk" onClick={onDone} role="dialog" aria-label={`Rank up to ${to}`}>
      <div className="rk__flash" />
      <div className="rk__rays" />
      <div className="rk__stage">
        <span className="rk__eyebrow">{big ? 'PROMOTION' : 'RANK UP'}</span>
        <div className="rk__ranks">
          <span className="rk__from">{from}</span>
          <span className="rk__arrow">➜</span>
          <span className="rk__to">{to}</span>
        </div>
        <span className="rk__sub">{big ? `Welcome to ${to[0]} rank, warrior.` : 'Keep climbing.'}</span>
      </div>
    </div>,
    document.body,
  )
}
