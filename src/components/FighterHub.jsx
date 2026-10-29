import { useState, useMemo } from 'react'
import { characters, charactersById } from '../data/characters.js'
import { getCombatData } from '../data/combatData.js'
import { tierLists } from '../data/tierList.js'
import CharacterDetail from './CharacterDetail.jsx'
import FighterCard from './FighterCard.jsx'

const GOOD_TRAITS = ['Instant Spark', 'Dodge Skill', 'Unblockable Ultimate', 'Health Regeneration']
const GOOD_SKILLS = ['Wild Sense', 'Explosive Wave', 'Afterimage Strike', 'Afterimage', 'Full Power', 'Super Explosive Wave']
const RUSH_SKILLS = ['Rush Attack', 'Instant Transmission', 'False Courage']
const SUPER_ARMOUR_DP = 7
const RECORD_KEY = 'szMatchRecord'

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(RECORD_KEY)) || {} } catch { return {} }
}

function getFormChain(char, selectedForm) {
  const idx = char.forms.findIndex(f => f.form === selectedForm.form)
  if (idx === -1) return char.forms
  return char.forms.slice(idx)
}

function getFullProfile(char, selectedForm) {
  const chain = selectedForm ? getFormChain(char, selectedForm) : char.forms
  const traits = new Set()
  const skills = new Set()
  let bestDp = 0, peakHp = 0, peakMelee = 0, peakUltDmg = 0
  let startDp = selectedForm ? selectedForm.dp : char.forms[0].dp

  for (const form of chain) {
    for (const t of form.traits) traits.add(t)
    if (form.dp > bestDp) bestDp = form.dp
    if (form.health > peakHp) peakHp = form.health
    const combat = getCombatData(char.name, form.form)
    if (combat) {
      if (combat.skill1) skills.add(combat.skill1)
      if (combat.skill2) skills.add(combat.skill2)
      if (combat.meleeDmg > peakMelee) peakMelee = combat.meleeDmg
      if (combat.ultimate?.damage > peakUltDmg) peakUltDmg = combat.ultimate.damage
    }
  }
  return { traits, skills, bestDp, startDp, peakHp, peakMelee, peakUltDmg, transformRange: bestDp - startDp }
}

function scoreMatchup(myChar, myForm, enemyChar) {
  const my = getFullProfile(myChar, myForm)
  const enemy = getFullProfile(enemyChar, null)
  let score = 0

  if (enemy.traits.has('Instant Spark') && my.traits.has('Dodge Skill')) score += 2
  if (enemy.traits.has('Dodge Skill') && my.skills.has('Explosive Wave')) score += 2
  if (enemy.traits.has('Health Regeneration') && my.peakMelee > 4000) score += 1
  if (!enemy.traits.has('Dodge Skill') && my.peakMelee > 4000) score += 1
  if (!enemy.traits.has('Instant Spark') && my.traits.has('Unblockable Ultimate')) score += 2

  if (enemy.traits.has('Instant Spark') && !my.traits.has('Dodge Skill')) score -= 2
  if (enemy.traits.has('Dodge Skill') && !my.skills.has('Explosive Wave')) score -= 1
  if (enemy.traits.has('Unblockable Ultimate') && !my.traits.has('Instant Spark')) score -= 2
  if (enemy.traits.has('Health Regeneration')) score -= 1

  if (enemy.bestDp > SUPER_ARMOUR_DP && my.bestDp <= SUPER_ARMOUR_DP) score -= 4
  if (my.bestDp > SUPER_ARMOUR_DP && enemy.bestDp <= SUPER_ARMOUR_DP) score += 2

  const dpDiff = my.bestDp - enemy.bestDp
  if (dpDiff >= 2) score += 1
  if (dpDiff <= -2) score -= 1
  if (dpDiff <= -4) score -= 2

  if (my.peakHp < enemy.peakHp - 5000) score -= 1
  if (enemy.peakMelee > my.peakMelee + 2000) score -= 1
  if (my.transformRange >= 3) score += 1
  if (enemy.transformRange >= 3 && my.transformRange < 2) score -= 1
  if (my.peakUltDmg > 18000) score += 1
  if (enemy.peakUltDmg > 18000 && !my.traits.has('Instant Spark')) score -= 1

  let skillBonus = 0
  for (const s of my.skills) { if (GOOD_SKILLS.includes(s)) skillBonus += 0.5 }
  score += Math.min(skillBonus, 1.5)
  for (const s of enemy.skills) { if (RUSH_SKILLS.includes(s) && !my.traits.has('Dodge Skill')) score -= 0.5 }

  return score
}

function getRating(score) {
  if (score >= 7) return { label: 'Easy', cls: 'hub-easy', icon: '++' }
  if (score >= 4) return { label: 'Favoured', cls: 'hub-fav', icon: '+' }
  if (score >= 1) return { label: 'Even', cls: 'hub-even', icon: '=' }
  if (score >= -2) return { label: 'Tough', cls: 'hub-tough', icon: '-' }
  return { label: 'Hard', cls: 'hub-hard', icon: '--' }
}

function getTierInfo(charId) {
  for (const list of tierLists) {
    for (const t of list.tiers) {
      if (t.characters.includes(charId)) return { tier: t.tier, list: list.name }
    }
  }
  return null
}

export default function FighterHub({ onNavigate }) {
  const [search, setSearch] = useState('')
  const [selectedChar, setSelectedChar] = useState(null)
  const [selectedFormIdx, setSelectedFormIdx] = useState(0)
  const [detailChar, setDetailChar] = useState(null)

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    return characters.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [search])

  const selectedForm = selectedChar ? selectedChar.forms[selectedFormIdx] || selectedChar.forms[0] : null
  const profile = selectedChar ? getFullProfile(selectedChar, selectedForm) : null
  const tierInfo = selectedChar ? getTierInfo(selectedChar.id) : null

  const records = useMemo(() => loadRecords(), [selectedChar])

  const matchups = useMemo(() => {
    if (!selectedChar || !selectedForm) return []
    const threats = []
    for (const list of tierLists) {
      for (const t of list.tiers) {
        if (t.tier === 'Z' || t.tier === 'S' || t.tier === 'A') {
          for (const id of t.characters) {
            if (id === selectedChar.id) continue
            const char = charactersById[id]
            if (!char || threats.find(th => th.char.id === id)) continue
            const score = scoreMatchup(selectedChar, selectedForm, char)
            const rating = getRating(score)
            threats.push({ char, tier: t.tier, score, rating })
          }
        }
      }
    }
    threats.sort((a, b) => a.score - b.score)
    return threats
  }, [selectedChar, selectedFormIdx])

  const summary = useMemo(() => {
    if (matchups.length === 0) return null
    const hard = matchups.filter(m => m.score < -2).length
    const tough = matchups.filter(m => m.score >= -2 && m.score < 1).length
    const even = matchups.filter(m => m.score >= 1 && m.score < 4).length
    const fav = matchups.filter(m => m.score >= 4).length
    return { hard, tough, even, fav, total: matchups.length }
  }, [matchups])

  const personalStats = useMemo(() => {
    if (!selectedChar) return null
    let totalW = 0, totalL = 0
    for (const [, rec] of Object.entries(records)) {
      totalW += rec.w || 0
      totalL += rec.l || 0
    }
    const charRec = records[selectedChar.id]
    return { totalW, totalL, charRec }
  }, [selectedChar, records])

  const pickChar = (char) => {
    setSelectedChar(char)
    setSelectedFormIdx(0)
    setSearch('')
  }

  const popular = useMemo(() => {
    const zTier = tierLists[0]?.tiers?.find(t => t.tier === 'Z')
    if (!zTier) return []
    return zTier.characters.slice(0, 6).map(id => charactersById[id]).filter(Boolean)
  }, [])

  return (
    <div className="hub">
      {!selectedChar ? (
        <div className="hub-landing">
          <div className="hub-hero">
            <h2 className="hub-hero__title">Who's your fighter?</h2>
            <p className="hub-hero__sub">Search any character to see their matchups, tier placement, and how they stack up against the meta.</p>
            <div className="hub-search-wrap">
              <input
                className="hub-search"
                type="text"
                placeholder="Search a character..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="hub-search-results">
                  {searchResults.map(c => (
                    <button key={c.id} className="hub-search-result" type="button" onClick={() => pickChar(c)}>
                      {c.forms[0]?.image ? (
                        <img className="hub-search-result__img" src={c.forms[0].image} alt="" />
                      ) : (
                        <div className="hub-search-result__ph" style={{ background: c.color }}>{c.name[0]}</div>
                      )}
                      <span className="hub-search-result__name">{c.name}</span>
                      <span className="hub-search-result__dp">{c.forms[0]?.dp} DP</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hub-popular">
            <h3 className="hub-popular__title">Top Tier Fighters</h3>
            <div className="hub-showcase">
              {popular.map((c, i) => {
                const peak = c.forms.reduce((a, f) => (f.dp > a.dp ? f : a), c.forms[0])
                return (
                  <FighterCard
                    key={c.id}
                    charId={c.id}
                    name={c.name}
                    form={peak.form}
                    dp={peak.dp}
                    image={peak.image || c.forms[0].image}
                    color={c.color}
                    traits={peak.traits}
                    rank={i + 1}
                    size="lg"
                    delay={i * 70}
                    onClick={() => pickChar(c)}
                  />
                )
              })}
            </div>
          </div>

          <div className="hub-quick-links">
            <button className="hub-quick-link" type="button" onClick={() => onNavigate('rankings')}>
              <span className="hub-quick-link__icon">S</span>
              <span>Tier Lists</span>
            </button>
            <button className="hub-quick-link" type="button" onClick={() => onNavigate('builder')}>
              <span className="hub-quick-link__icon">+</span>
              <span>Team Builder</span>
            </button>
            <button className="hub-quick-link" type="button" onClick={() => onNavigate('guide')}>
              <span className="hub-quick-link__icon">?</span>
              <span>Counter Guide</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="hub-profile">
          <div className="hub-profile__top">
            <button className="hub-back" type="button" onClick={() => setSelectedChar(null)}>
              &larr; Back
            </button>
            <div className="hub-profile__header">
              <div className="hub-profile__portrait">
                {selectedForm?.image ? (
                  <img className="hub-profile__img" src={selectedForm.image} alt={selectedChar.name} />
                ) : (
                  <div className="hub-profile__ph" style={{ background: selectedChar.color }}>{selectedChar.name[0]}</div>
                )}
              </div>
              <div className="hub-profile__info">
                <h2 className="hub-profile__name">{selectedChar.name}</h2>
                {selectedChar.forms.length > 1 && (
                  <div className="hub-profile__forms">
                    {selectedChar.forms.map((f, i) => (
                      <button
                        key={f.form}
                        className={'hub-form-btn' + (i === selectedFormIdx ? ' hub-form-btn--active' : '')}
                        type="button"
                        onClick={() => setSelectedFormIdx(i)}
                      >
                        {f.form} ({f.dp}DP)
                      </button>
                    ))}
                  </div>
                )}
                <div className="hub-profile__tags">
                  {(selectedForm?.traits || []).map(t => (
                    <span key={t} className={'hub-trait' + (GOOD_TRAITS.includes(t) ? ' hub-trait--good' : '')}>{t}</span>
                  ))}
                </div>
                <div className="hub-profile__stats-row">
                  <span className="hub-stat">{selectedForm?.dp} DP</span>
                  <span className="hub-stat">{(selectedForm?.health || 0).toLocaleString()} HP</span>
                  <span className="hub-stat">Ki: {selectedForm?.kiBars}</span>
                  {tierInfo && <span className={'hub-tier-badge hub-tier-badge--' + tierInfo.tier.toLowerCase()}>{tierInfo.tier} Tier ({tierInfo.list})</span>}
                </div>
              </div>
            </div>
          </div>

          {summary && (
            <div className="hub-spread">
              <h3 className="hub-section-title">Meta Matchup Spread</h3>
              <div className="hub-spread__bar">
                {summary.fav > 0 && <div className="hub-spread__seg hub-spread__seg--fav" style={{ flex: summary.fav }} title={`Favoured: ${summary.fav}`}>{summary.fav}</div>}
                {summary.even > 0 && <div className="hub-spread__seg hub-spread__seg--even" style={{ flex: summary.even }} title={`Even: ${summary.even}`}>{summary.even}</div>}
                {summary.tough > 0 && <div className="hub-spread__seg hub-spread__seg--tough" style={{ flex: summary.tough }} title={`Tough: ${summary.tough}`}>{summary.tough}</div>}
                {summary.hard > 0 && <div className="hub-spread__seg hub-spread__seg--hard" style={{ flex: summary.hard }} title={`Hard: ${summary.hard}`}>{summary.hard}</div>}
              </div>
              <div className="hub-spread__legend">
                <span className="hub-spread__leg hub-fav">Favoured {summary.fav}</span>
                <span className="hub-spread__leg hub-even">Even {summary.even}</span>
                <span className="hub-spread__leg hub-tough">Tough {summary.tough}</span>
                <span className="hub-spread__leg hub-hard">Hard {summary.hard}</span>
              </div>
            </div>
          )}

          <div className="hub-matchups">
            <h3 className="hub-section-title">Hardest Matchups</h3>
            <div className="hub-matchup-list">
              {matchups.slice(0, 5).map(m => {
                const rec = records[m.char.id]
                return (
                  <button key={m.char.id} className={'hub-matchup-card ' + m.rating.cls} type="button" onClick={() => setDetailChar(m.char)}>
                    <div className="hub-matchup-card__left">
                      {m.char.forms[0]?.image ? (
                        <img className="hub-matchup-card__img" src={m.char.forms[0].image} alt="" />
                      ) : (
                        <div className="hub-matchup-card__ph" style={{ background: m.char.color }}>{m.char.name[0]}</div>
                      )}
                      <div>
                        <div className="hub-matchup-card__name">{m.char.name}</div>
                        <span className={'hub-matchup-card__tier hub-tier--' + m.tier.toLowerCase()}>{m.tier}</span>
                      </div>
                    </div>
                    <div className="hub-matchup-card__right">
                      <span className="hub-matchup-card__verdict">{m.rating.label}</span>
                      {rec && <span className="hub-matchup-card__record">{rec.w}W-{rec.l}L</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hub-matchups">
            <h3 className="hub-section-title">Best Matchups</h3>
            <div className="hub-matchup-list">
              {matchups.slice(-5).reverse().map(m => {
                const rec = records[m.char.id]
                return (
                  <button key={m.char.id} className={'hub-matchup-card ' + m.rating.cls} type="button" onClick={() => setDetailChar(m.char)}>
                    <div className="hub-matchup-card__left">
                      {m.char.forms[0]?.image ? (
                        <img className="hub-matchup-card__img" src={m.char.forms[0].image} alt="" />
                      ) : (
                        <div className="hub-matchup-card__ph" style={{ background: m.char.color }}>{m.char.name[0]}</div>
                      )}
                      <div>
                        <div className="hub-matchup-card__name">{m.char.name}</div>
                        <span className={'hub-matchup-card__tier hub-tier--' + m.tier.toLowerCase()}>{m.tier}</span>
                      </div>
                    </div>
                    <div className="hub-matchup-card__right">
                      <span className="hub-matchup-card__verdict">{m.rating.label}</span>
                      {rec && <span className="hub-matchup-card__record">{rec.w}W-{rec.l}L</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hub-cta-row">
            <button className="hub-cta" type="button" onClick={() => onNavigate('matchups')}>
              Full Matchup Analysis &rarr;
            </button>
            <button className="hub-cta hub-cta--secondary" type="button" onClick={() => onNavigate('counter')}>
              Counter Picks &rarr;
            </button>
          </div>
        </div>
      )}

      {detailChar && <CharacterDetail character={detailChar} onClose={() => setDetailChar(null)} />}
    </div>
  )
}
