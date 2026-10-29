import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { characters, DP_LIMIT, MAX_TEAM } from './data/characters.js'
import { cheapestDp, remainingDp, isTeamFull } from './utils/dp.js'
import { generateSmartTeam } from './utils/teamBuilder.js'
import { buildShareUrl } from './utils/share.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useShareableTeam } from './hooks/useShareableTeam.js'
import { checkAchievements, ACHIEVEMENTS } from './data/achievements.js'
import { playAdd, playRemove, playSave, playBadge, playRandom, playPreset } from './utils/sounds.js'
import CharacterData from './components/CharacterData.jsx'
import CharacterRankings from './components/CharacterRankings.jsx'
import FighterHub from './components/FighterHub.jsx'
import TeamBar from './components/TeamBar.jsx'
import FilterBar from './components/FilterBar.jsx'
import CharacterGrid from './components/CharacterGrid.jsx'
import FormPicker from './components/FormPicker.jsx'
import ActionBar from './components/ActionBar.jsx'
import SavedTeams from './components/SavedTeams.jsx'
import MatchupChart from './components/MatchupChart.jsx'
import TeamCompare from './components/TeamCompare.jsx'
import CounterPicks from './components/CounterPicks.jsx'
import CounterGuide from './components/CounterGuide.jsx'
import HeadToHead from './components/HeadToHead.jsx'
import SinglesMeta from './components/SinglesMeta.jsx'
import FighterJournal from './components/FighterJournal.jsx'
import UltimateDatabase from './components/UltimateDatabase.jsx'
import SessionMode from './components/SessionMode.jsx'
import TrainingPlanner from './components/TrainingPlanner.jsx'
import MoveList from './components/MoveList.jsx'
import News from './components/News.jsx'
import MetaDashboard from './components/MetaDashboard.jsx'
import BadgeNotification from './components/BadgeNotification.jsx'
import CharacterSpotlight from './components/CharacterSpotlight.jsx'
import PresetTeams from './components/PresetTeams.jsx'
import QuickLog from './components/QuickLog.jsx'
import { allMatches, loadMain, masteryFor } from './utils/matchLog.js'

function PlayerCard({ onOpen }) {
  const mainId = loadMain()
  const main = mainId ? characters.find(c => c.id === mainId) : null
  const matches = allMatches()
  const w = matches.filter(m => m.result === 'w').length
  const l = matches.length - w
  const mainWins = main ? matches.filter(m => m.myId === main.id && m.result === 'w').length : 0
  const { tier } = masteryFor(mainWins)
  let streak = 0
  for (const m of matches) { if (m.result === 'w') streak++; else break }
  return (
    <button className="hud-player" type="button" onClick={onOpen}>
      <div className="hud-player__portrait" style={{ '--tier': tier.color }}>
        {main?.forms[0]?.image ? <img src={main.forms[0].image} alt="" /> : <span>?</span>}
      </div>
      <div className="hud-player__info">
        <span className="hud-player__name">{main ? main.name : 'Set your main'}</span>
        <span className="hud-player__tier" style={{ color: tier.color }}>{tier.name.toUpperCase()}</span>
        <span className="hud-player__rec">
          <b className="hud-w">{w}W</b> <b className="hud-l">{l}L</b>
          {streak >= 2 && <b className="hud-streak">🔥{streak}</b>}
        </span>
      </div>
    </button>
  )
}

const NAV_ITEMS = [
  { key: 'hub', label: 'Fighter Hub', sub: [
    { key: 'h2h', label: '1v1' },
    { key: 'smeta', label: 'Singles Meta' },
    { key: 'matchups', label: 'Matchups' },
    { key: 'rankings', label: 'Rankings' },
    { key: 'ultimates', label: 'Ultimates' },
    { key: 'moves', label: 'Move List' },
  ]},
  { key: 'journal', label: 'My Journal', sub: [
    { key: 'session', label: 'Session Mode' },
    { key: 'training', label: 'Training Planner' },
  ]},
  { key: 'builder', label: 'Team Builder', sub: [
    { key: 'counter', label: 'Counter Picks' },
    { key: 'guide', label: 'Counter Guide' },
    { key: 'compare', label: 'Compare' },
  ]},
  { key: 'teams', label: 'My Teams' },
  { key: 'data', label: 'Character Data', sub: [
    { key: 'meta', label: 'Meta' },
  ]},
  { key: 'news', label: 'News' },
]

const ALL_KEYS = NAV_ITEMS.flatMap(item => [item.key, ...(item.sub || []).map(s => s.key)])

function getViewLabel(key) {
  for (const item of NAV_ITEMS) {
    if (item.key === key) return item.label
    for (const s of item.sub || []) {
      if (s.key === key) return s.label
    }
  }
  return key
}

export default function App() {
  const [team, setTeam] = useShareableTeam()
  const [savedTeams, setSavedTeams] = useLocalStorage('szTeams', [])

  const [view, setView] = useState('hub')
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [episode, setEpisode] = useState('')
  const [maxDp, setMaxDp] = useState('')
  const [fitsOnly, setFitsOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [picking, setPicking] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [teamNotes, setTeamNotes] = useState('')
  const [shareLabel, setShareLabel] = useState(false)
  const [favorites, setFavorites] = useLocalStorage('szFavorites', [])
  const [seenBadges, setSeenBadges] = useLocalStorage('szSeenBadges', [])
  const [notifQueue, setNotifQueue] = useState([])
  const [showPresets, setShowPresets] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [logTick, setLogTick] = useState(0)

  const unlockedIds = useMemo(
    () => checkAchievements(team, savedTeams, favorites),
    [team, savedTeams, favorites]
  )

  const prevUnlockedRef = useRef(seenBadges)
  useEffect(() => {
    const prevSeen = new Set(prevUnlockedRef.current)
    const newBadges = []
    for (const id of unlockedIds) {
      if (!prevSeen.has(id)) newBadges.push(id)
    }
    if (newBadges.length > 0) {
      const badgeObjects = newBadges
        .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
        .filter(Boolean)
      setNotifQueue((q) => [...q, ...badgeObjects])
      setSeenBadges((prev) => [...new Set([...prev, ...newBadges])])
      prevUnlockedRef.current = [...new Set([...prevUnlockedRef.current, ...newBadges])]
      playBadge()
    }
  }, [unlockedIds, setSeenBadges])

  const dismissNotif = useCallback(() => {
    setNotifQueue((q) => q.slice(1))
  }, [])

  const resetFilters = () => {
    setSearch('')
    setTag('')
    setEpisode('')
    setMaxDp('')
    setFitsOnly(false)
  }

  const remaining = remainingDp(team)
  const full = isTeamFull(team)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dpCap = maxDp ? Number(maxDp) : Infinity
    return characters.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      if (tag && !c.forms.some((f) => f.tags?.includes(tag))) return false
      if (episode && !c.forms.some((f) => f.episodes?.includes(episode))) return false
      if (cheapestDp(c) > dpCap) return false
      if (fitsOnly && cheapestDp(c) > remaining) return false
      return true
    })
  }, [search, tag, episode, maxDp, fitsOnly, remaining])

  const isDisabled = (character) => full || cheapestDp(character) > remaining

  const addForm = (character, form) => {
    if (full || form.dp > remaining) return
    setTeam((t) => [...t, { characterId: character.id, formName: form.form }])
    setPicking(null)
    playAdd()
  }

  const removeAt = (index) => {
    setTeam((t) => t.filter((_, i) => i !== index))
    playRemove()
  }

  const reorderTeam = (fromIndex, toIndex) => {
    setTeam((t) => {
      const next = [...t]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const clearTeam = () => setTeam([])

  const saveTeam = () => {
    if (team.length === 0) return
    const name = teamName.trim() || `Squad ${savedTeams.length + 1}`
    const notes = teamNotes.trim()
    setSavedTeams((list) => [{ id: Date.now().toString(36), name, team, notes }, ...list])
    setTeamName('')
    setTeamNotes('')
    playSave()
  }

  const deleteSaved = (id) => setSavedTeams((list) => list.filter((s) => s.id !== id))

  const loadSaved = (savedTeam, name, notes) => {
    setTeam(savedTeam)
    if (name) setTeamName(name)
    if (notes) setTeamNotes(notes)
    setView('builder')
  }

  const updateSavedNotes = (id, notes) => {
    setSavedTeams((list) => list.map((s) => s.id === id ? { ...s, notes } : s))
  }

  const shareTeam = async () => {
    if (team.length === 0) return
    const url = buildShareUrl(team)
    try {
      await navigator.clipboard.writeText(url)
    } catch {}
    setShareLabel(true)
    setTimeout(() => setShareLabel(false), 2000)
  }

  const toggleFavorite = (charId) => {
    setFavorites((prev) =>
      prev.includes(charId) ? prev.filter((id) => id !== charId) : [...prev, charId]
    )
  }

  const randomTeam = () => {
    const { team: smartTeam } = generateSmartTeam()
    setTeam(smartTeam)
    playRandom()
  }

  const loadPreset = (presetTeam) => {
    setTeam(presetTeam)
    setShowPresets(false)
    playPreset()
  }

  return (
    <div className="app">
      {(view === 'builder' || view === 'teams' || view === 'compare' || view === 'counter') && (
        <TeamBar team={team} onRemove={removeAt} onReorder={reorderTeam} />
      )}

      <div className="fx-bg" aria-hidden="true">
        <div className="fx-bg__aura" />
        <div className="fx-bg__lines" />
        <div className="fx-bg__sparks" />
      </div>

      <main className="main">
        <div className="brand">
          <div className="hud-top">
            <button className="hud-logo" type="button" onClick={() => setView('hub')}>
              <span className="hud-logo__a">SPARKING!</span>
              <span className="hud-logo__b">ZERO</span>
              <span className="hud-logo__c">FIGHTER TOOLKIT</span>
            </button>
            <PlayerCard key={logTick} onOpen={() => setView('journal')} />
          </div>
          <h1 className="hud-page-title">
            <span>{view === 'hub' ? 'Fighter Hub' : getViewLabel(view)}</span>
          </h1>
          <nav className="view-tabs">
            {NAV_ITEMS.map(item => {
              const isActive = view === item.key || (item.sub || []).some(s => s.key === view)
              const hasSub = item.sub && item.sub.length > 0
              return (
                <div key={item.key} className="view-tab-wrap" onMouseLeave={() => setOpenDropdown(null)}>
                  <button
                    className={'view-tab' + (isActive ? ' view-tab--active' : '')}
                    onClick={() => { setView(item.key); setOpenDropdown(null) }}
                    onMouseEnter={() => hasSub && setOpenDropdown(item.key)}
                    type="button"
                  >
                    {item.key === 'teams' && savedTeams.length > 0 ? `${item.label} (${savedTeams.length})` : item.label}
                    {hasSub && <span className="view-tab__arrow">&#9662;</span>}
                  </button>
                  {hasSub && openDropdown === item.key && (
                    <div className="view-dropdown">
                      <div className="view-dropdown__menu">
                        {item.sub.map(s => (
                          <button
                            key={s.key}
                            className={'view-dropdown__item' + (view === s.key ? ' view-dropdown__item--active' : '')}
                            onClick={() => { setView(s.key); setOpenDropdown(null) }}
                            type="button"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        <div className="page-enter" key={view + ':' + (view === 'journal' || view === 'session' || view === 'hub' ? logTick : 0)}>
        {view === 'hub' ? (
          <FighterHub onNavigate={setView} />
        ) : view === 'builder' ? (
          <>
            <CharacterSpotlight />
            <div className="preset-toggle-row">
              <button
                className="preset-toggle-btn"
                type="button"
                onClick={() => setShowPresets((v) => !v)}
              >
                {showPresets ? 'Hide Iconic Teams' : 'Iconic Teams'}
              </button>
            </div>
            {showPresets && <PresetTeams onLoad={loadPreset} />}
            {showFilters && (
              <FilterBar
                search={search}
                onSearch={setSearch}
                tag={tag}
                onTag={setTag}
                episode={episode}
                onEpisode={setEpisode}
                maxDp={maxDp}
                onMaxDp={setMaxDp}
                fitsOnly={fitsOnly}
                onFitsOnly={setFitsOnly}
                onReset={resetFilters}
                resultCount={filtered.length}
              />
            )}
            <CharacterGrid characters={filtered} isDisabled={isDisabled} onPick={setPicking} favorites={favorites} onToggleFav={toggleFavorite} />
          </>
        ) : view === 'teams' ? (
          <SavedTeams teams={savedTeams} onLoad={loadSaved} onDelete={deleteSaved} onUpdateNotes={updateSavedNotes} fullPage />
        ) : view === 'h2h' ? (
          <HeadToHead />
        ) : view === 'smeta' ? (
          <SinglesMeta />
        ) : view === 'ultimates' ? (
          <UltimateDatabase />
        ) : view === 'moves' ? (
          <MoveList />
        ) : view === 'session' ? (
          <SessionMode />
        ) : view === 'training' ? (
          <TrainingPlanner />
        ) : view === 'journal' ? (
          <FighterJournal />
        ) : view === 'matchups' ? (
          <MatchupChart team={team} />
        ) : view === 'data' ? (
          <CharacterData />
        ) : view === 'rankings' ? (
          <CharacterRankings />
        ) : view === 'counter' ? (
          <CounterPicks team={team} />
        ) : view === 'guide' ? (
          <CounterGuide />
        ) : view === 'compare' ? (
          <TeamCompare teams={savedTeams} />
        ) : view === 'news' ? (
          <News />
        ) : (
          <MetaDashboard savedTeams={savedTeams} unlockedIds={unlockedIds} />
        )}
        </div>
      </main>

      <QuickLog onLogged={() => setLogTick(t => t + 1)} />

      <footer className="footer">
        <p>
          Fan-made toolkit for Dragon Ball: Sparking! Zero. Not affiliated with Bandai Namco.
          Matchup data and DP values are community estimates.
        </p>
      </footer>

      <ActionBar
        teamName={teamName}
        onTeamName={setTeamName}
        teamNotes={teamNotes}
        onTeamNotes={setTeamNotes}
        onRandom={randomTeam}
        onShare={shareTeam}
        onSave={saveTeam}
        onToggleFilters={() => setShowFilters((v) => !v)}
        filtersOpen={showFilters}
        canSave={team.length > 0}
        shareLabel={shareLabel}
      />

      {picking && (
        <FormPicker
          character={picking}
          remaining={remaining}
          onAdd={addForm}
          onClose={() => setPicking(null)}
        />
      )}

      {notifQueue.length > 0 && (
        <BadgeNotification key={notifQueue[0].id} badge={notifQueue[0]} onDone={dismissNotif} />
      )}
    </div>
  )
}
