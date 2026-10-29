import { loadSets } from '../utils/sets.js'

export default function SetRecord() {
  const sets = loadSets()
  if (!sets.length) {
    return (
      <section className="srec">
        <span className="mw__eyebrow">SETS</span>
        <h3 className="mw__title">Set record</h3>
        <p className="mw__hint">Tap <b>SET</b> in Quick Log to start a first-to-2, 3, 5 or 10. The score counts up as you log each game.</p>
      </section>
    )
  }
  const won = sets.filter(s => s.won).length
  const rivals = new Map()
  for (const s of sets) {
    if (!s.name) continue
    const key = s.name.toLowerCase()
    const r = rivals.get(key) || { name: s.name, w: 0, l: 0 }
    r[s.won ? 'w' : 'l']++
    rivals.set(key, r)
  }
  const top = [...rivals.values()].sort((a, b) => b.w + b.l - (a.w + a.l)).slice(0, 4)

  return (
    <section className="srec">
      <div className="mw__head">
        <div>
          <span className="mw__eyebrow">SETS</span>
          <h3 className="mw__title">Set record <span className="srec__big"><b className="ql-w">{won}</b>–<b className="ql-l">{sets.length - won}</b></span></h3>
        </div>
      </div>
      <div className="srec__cols">
        <div>
          <small className="srec__h">RECENT</small>
          {sets.slice(0, 6).map(s => (
            <div key={s.start} className={'srec__row srec__row--' + (s.won ? 'w' : 'l')}>
              <b>{s.won ? 'W' : 'L'}</b>
              <span>{s.w}–{s.l} <em>FT{s.ft}</em></span>
              <span className="srec__who">{s.name || '—'}</span>
              <small>{new Date(s.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
            </div>
          ))}
        </div>
        {top.length > 0 && (
          <div>
            <small className="srec__h">HEAD TO HEAD</small>
            {top.map(r => (
              <div key={r.name} className="srec__row">
                <span className="srec__who">{r.name}</span>
                <span><b className="ql-w">{r.w}</b>–<b className="ql-l">{r.l}</b></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
