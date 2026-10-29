import { charactersById } from '../data/characters.js'
import { allMatches } from '../utils/matchLog.js'

const SESSION_GAP = 30 * 60000

// Win rate on the game right after a win vs right after a loss, within one sitting.
function tiltStats(matches) {
  const asc = [...matches].sort((a, b) => a.ts - b.ts)
  const after = { w: { n: 0, w: 0 }, l: { n: 0, w: 0 } }
  for (let i = 1; i < asc.length; i++) {
    if (asc[i].ts - asc[i - 1].ts > SESSION_GAP) continue
    const b = after[asc[i - 1].result]
    b.n++
    if (asc[i].result === 'w') b.w++
  }
  const pct = b => (b.n ? Math.round((b.w / b.n) * 100) : null)
  let streak = 0
  for (const m of matches) { if (m.result === 'l') streak++; else break }
  return { afterWin: pct(after.w), afterLoss: pct(after.l), samples: after.w.n + after.l.n, streak }
}

function formStats(matches) {
  const map = new Map()
  for (const m of matches) {
    if (!m.myId || !m.formEnd) continue
    const key = m.myId + '|' + m.formEnd
    const e = map.get(key) || { myId: m.myId, form: m.formEnd, w: 0, l: 0 }
    e[m.result]++
    map.set(key, e)
  }
  return [...map.values()].sort((a, b) => b.w + b.l - (a.w + a.l)).slice(0, 6)
}

export default function TiltForm() {
  const matches = allMatches()
  const t = tiltStats(matches)
  const forms = formStats(matches)
  const gap = t.afterWin != null && t.afterLoss != null ? t.afterWin - t.afterLoss : null
  let read = 'Log a few back-to-back games to see how losses affect you.'
  if (t.samples >= 6 && gap != null) {
    if (gap >= 15) read = `You tilt. You win ${gap}% less after a loss. Take a breather after an L.`
    else if (gap <= -10) read = 'You bounce back hard after losses. Revenge mode is real.'
    else read = 'Steady head. Losses barely change how you play.'
  }

  return (
    <section className="tf">
      <div className={'tf__card' + (t.streak >= 3 ? ' tf__card--hot' : '')}>
        <span className="mw__eyebrow">TILT METER</span>
        {t.streak >= 3 && <p className="tf__warn">⚠ {t.streak} losses in a row. Step away for 5.</p>}
        <div className="tf__pair">
          <div><b>{t.afterWin ?? '—'}{t.afterWin != null && '%'}</b><small>AFTER A WIN</small></div>
          <div><b className="tf__l">{t.afterLoss ?? '—'}{t.afterLoss != null && '%'}</b><small>AFTER A LOSS</small></div>
        </div>
        <p className="tf__read">{read}</p>
      </div>

      <div className="tf__card">
        <span className="mw__eyebrow">FORM SWITCH TRACKER</span>
        {!forms.length ? (
          <p className="tf__read">In Quick Log, tap the form you <b>finished</b> the fight in. I'll show which forms actually win you games.</p>
        ) : (
          <div className="tf__forms">
            {forms.map(f => {
              const n = f.w + f.l
              const rate = Math.round((f.w / n) * 100)
              return (
                <div key={f.myId + f.form} className="tf__form">
                  <span><b>{f.form}</b><small>{charactersById[f.myId]?.name}</small></span>
                  <div className="tf__bar"><i style={{ width: rate + '%' }} /></div>
                  <em>{rate}% <small>({n})</small></em>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
