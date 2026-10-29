import { useEffect } from 'react'
import FighterCard from './FighterCard.jsx'

export default function FormPicker({ character, remaining, onAdd, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!character) return null

  return (
    <div className="fp-backdrop" onClick={onClose}>
      <div
        className="fp"
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a form for ${character.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fp__head">
          <div>
            <span className="fp__eyebrow">SELECT FORM · {remaining} DP LEFT</span>
            <h2 className="fp__title">{character.name}</h2>
          </div>
          <button className="fp__close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        <div className="fp__row">
          {character.forms.map((form, i) => {
            const fits = form.dp <= remaining
            return (
              <div key={form.form} className={'fp__slot' + (fits ? '' : ' fp__slot--locked')}>
                <FighterCard
                  charId={character.id}
                  name={character.name}
                  form={form.form}
                  dp={form.dp}
                  image={form.image}
                  color={character.color}
                  health={form.health}
                  kiBars={form.kiBars}
                  traits={form.traits}
                  delay={i * 60}
                  onClick={() => fits && onAdd(character, form)}
                />
                <span className="fp__cta">{fits ? '+ ADD TO SQUAD' : `NEEDS ${form.dp} DP`}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
