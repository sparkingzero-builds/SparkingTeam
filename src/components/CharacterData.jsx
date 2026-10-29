import { useMemo, useState } from 'react'
import { characters, allTags, allEpisodes } from '../data/characters.js'
import CharacterDetail from './CharacterDetail.jsx'
import FighterCard from './FighterCard.jsx'

const allForms = characters.flatMap((c) =>
  c.forms.map((f) => ({
    id: c.id + '|' + f.form,
    charId: c.id,
    character: c,
    name: c.name,
    form: f.form,
    dp: f.dp,
    health: f.health,
    kiBars: f.kiBars,
    skillPoints: f.skillPoints,
    traits: f.traits,
    tags: f.tags || [],
    episodes: f.episodes || [],
    image: f.image,
    color: c.color,
  }))
)

export default function CharacterData() {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [episode, setEpisode] = useState('')
  const [selectedChar, setSelectedChar] = useState(null)
  const [selectedFormIndex, setSelectedFormIndex] = useState(0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allForms.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.form.toLowerCase().includes(q)) return false
      if (tag && !r.tags.includes(tag)) return false
      if (episode && !r.episodes.includes(episode)) return false
      return true
    })
  }, [search, tag, episode])

  const openDetail = (row) => {
    const formIdx = row.character.forms.findIndex((f) => f.form === row.form)
    setSelectedChar(row.character)
    setSelectedFormIndex(formIdx >= 0 ? formIdx : 0)
  }

  return (
    <div className="cd-page">
      <div className="cd-toolbar">
        <div className="cd-search-wrap">
          <input
            className="cd-search"
            type="search"
            placeholder="Search by name or form..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search characters"
          />
        </div>
        <div className="cd-filters">
          <select
            className="cd-select"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="cd-select"
            value={episode}
            onChange={(e) => setEpisode(e.target.value)}
            aria-label="Filter by episode"
          >
            <option value="">All episodes</option>
            {allEpisodes.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <span className="cd-count">👥 {filtered.length} of <strong>{allForms.length}</strong> fighters</span>
      </div>

      <div className="cd-grid">
        {filtered.map((row, i) => (
          <FighterCard
            key={row.id}
            charId={row.charId}
            name={row.name}
            form={row.form}
            dp={row.dp}
            image={row.image}
            color={row.color}
            health={row.health}
            kiBars={row.kiBars}
            traits={row.traits}
            delay={Math.min(i, 16) * 30}
            onClick={() => openDetail(row)}
          />
        ))}
      </div>

      {selectedChar && (
        <CharacterDetail
          character={selectedChar}
          initialFormIndex={selectedFormIndex}
          onClose={() => setSelectedChar(null)}
        />
      )}
    </div>
  )
}
