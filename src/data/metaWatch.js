// Character balance changes from the latest patch (Update Notice, July 29 2026).
export const META_PATCH = {
  name: 'July 29, 2026 update',
  date: '2026-07-29',
  link: 'https://en.bandainamcoent.eu/dragon-ball/news/dragon-ball-sparking-zero-update-notice-july-29-2026',
}

const CHANGES = [
  {
    type: 'buff',
    note: 'Attack power rises as health drops',
    ids: ['goku-z-early', 'goku-teen', 'majin-vegeta', 'future-trunks', 'goku-black', 'shallot', 'gohan-future', 'bardock-dlc'],
  },
  {
    type: 'buff',
    note: 'Faster Ki recovery while stunned',
    ids: ['goku-teen', 'majin-vegeta', 'gohan-future', 'master-roshi', 'frieza-z', 'majin-buu', 'mr-satan', 'bardock-dlc', 'nappa', 'super-zarbon', 'dodoria', 'recoome', 'king-cold', 'broly-z', 'broly-super', 'super-garlic-jr', 'lord-slug', 'cooler', 'bojack', 'full-power-bojack', 'syn-shenron', 'spopovich', 'fused-zamasu', 'ribrianne', 'majin-duu', 'third-eye-gomah', 'shallot'],
  },
  {
    type: 'mixed',
    note: 'Rush Ki Blasts cost less Ki but hit softer',
    ids: ['vegeta-z-scouter', 'vegeta-z-early', 'vegeta-z-end', 'majin-vegeta', 'vegeta-gt', 'vegeta-super', 'baby-vegeta', 'vegeta-mini', 'vegeta-daima'],
  },
  { type: 'buff', note: 'SSGSS "Limits?! I Break Them!" costs fewer Skill Stocks', ids: ['vegeta-super'] },
  { type: 'buff', note: 'SSJ3 Super Perception reflects blasts back at the opponent', ids: ['goku-z-end'] },
  { type: 'nerf', note: 'Rush Blast can no longer be Super Perception-countered', ids: ['majin-duu', 'ribrianne', 'kakunsa', 'vegeta-mini'] },
]

export const META_BY_ID = new Map()
for (const c of CHANGES) {
  for (const id of c.ids) {
    const e = META_BY_ID.get(id) || { notes: [], types: new Set() }
    e.notes.push({ type: c.type, note: c.note })
    e.types.add(c.type)
    META_BY_ID.set(id, e)
  }
}
for (const e of META_BY_ID.values()) {
  e.verdict = e.types.size > 1 ? 'mixed' : [...e.types][0]
}
