const KEY = 'szAnnouncer'

export function announcerOn() {
  try { return JSON.parse(localStorage.getItem(KEY)) !== false } catch { return true }
}

export function setAnnouncer(on) {
  localStorage.setItem(KEY, JSON.stringify(on))
  if (!on) window.speechSynthesis?.cancel()
}

const pick = a => a[Math.floor(Math.random() * a.length)]

export function announce({ result, me, enemy, winStreak, lossStreak, levelUp, goalHit }) {
  if (!announcerOn() || !window.speechSynthesis) return
  let line
  if (goalHit) line = goalHit
  else if (levelUp) line = `Level up! You're now level ${levelUp}!`
  else if (result === 'w') {
    if (winStreak >= 5) line = pick([`${winStreak} in a row! ${me} is unstoppable!`, `${me} is on a rampage! ${winStreak} straight!`])
    else if (winStreak >= 3) line = pick([`Three-peat! ${me} is heating up!`, `${winStreak} wins in a row!`])
    else line = pick([`${me} wins!`, `What a finish! ${enemy} goes down!`, `Victory! ${enemy} never stood a chance!`, `${me} takes it!`])
  } else {
    if (lossStreak >= 3) line = pick(['Take a breather, warrior.', 'Even Saiyans need rest. Step away for a bit.'])
    else line = pick([`${enemy} takes this one.`, 'Shake it off. Run it back.', 'Defeat. But a Saiyan only gets stronger.'])
  }
  const u = new SpeechSynthesisUtterance(line)
  u.rate = 1.08
  u.pitch = result === 'w' ? 1.05 : 0.9
  const voices = window.speechSynthesis.getVoices()
  const v = voices.find(v => /en-GB/i.test(v.lang) && /male|george|ryan|daniel/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang))
  if (v) u.voice = v
  window.speechSynthesis.cancel()
  setTimeout(() => window.speechSynthesis.speak(u), 350)
}
