import { tierLists } from '../data/tierList.js'
import { META_BY_ID } from '../data/metaWatch.js'

const singles = tierLists.find(t => t.name === 'Singles')
const TIER_OF = new Map()
for (const t of singles?.tiers || []) for (const id of t.characters) TIER_OF.set(id, t)

export function rarityFor(dp) {
  if (dp >= 9) return 'mythic'
  if (dp >= 7) return 'legendary'
  if (dp === 6) return 'epic'
  if (dp === 5) return 'rare'
  if (dp === 4) return 'uncommon'
  return 'common'
}

function tilt(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width
  const y = (e.clientY - r.top) / r.height
  el.style.setProperty('--rx', `${(0.5 - y) * 16}deg`)
  el.style.setProperty('--ry', `${(x - 0.5) * 18}deg`)
  el.style.setProperty('--mx', `${x * 100}%`)
  el.style.setProperty('--my', `${y * 100}%`)
}

function reset(e) {
  const el = e.currentTarget
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

export default function FighterCard({ charId, name, form, dp, image, color, health, kiBars, traits = [], rank, size = 'md', onClick, delay = 0 }) {
  const rarity = rarityFor(dp)
  const tier = TIER_OF.get(charId)
  const meta = META_BY_ID.get(charId)
  return (
    <button
      type="button"
      className={`fc fc--${rarity} fc--${size}` + (meta ? ` fc--meta-${meta.verdict}` : '')}
      title={meta ? meta.notes.map(n => n.note).join(' · ') : undefined}
      style={{ '--aura': color || '#ff8a1f', '--delay': `${delay}ms` }}
      onPointerMove={tilt}
      onPointerLeave={reset}
      onClick={onClick}
    >
      <div className="fc__inner">
        <div className="fc__art">
          {image
            ? <img src={image} alt={name} loading="lazy" draggable="false" />
            : <div className="fc__ph">{name[0]}</div>}
        </div>
        <div className="fc__lines" />
        <div className="fc__shine" />
        <div className="fc__frame" />

        {tier && <span className="fc__tier" style={{ '--t': tier.color }}>{tier.tier}</span>}
        {rank != null && <span className="fc__rank">#{rank}</span>}
        {meta && <span className={'fc__meta fc__meta--' + meta.verdict}>{meta.verdict === 'buff' ? '▲' : meta.verdict === 'nerf' ? '▼' : '◆'} {meta.verdict.toUpperCase()}</span>}
        <span className="fc__dp"><b>{dp}</b><small>DP</small></span>

        <div className="fc__info">
          {form && <span className="fc__form">{form}</span>}
          <span className="fc__name">{name}</span>
          {(health || kiBars) && (
            <div className="fc__stats">
              {health ? <span><i>HP</i>{health.toLocaleString()}</span> : null}
              {kiBars ? <span><i>KI</i>{'▮'.repeat(kiBars)}</span> : null}
            </div>
          )}
          {traits.length > 0 && (
            <div className="fc__traits">
              {traits.slice(0, 3).map(t => <span key={t}>{t}</span>)}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
