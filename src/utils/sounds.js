let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function play(freq, type, duration, vol = 0.15) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration)
  } catch {}
}

export function playAdd() {
  play(880, 'sine', 0.12, 0.12)
  setTimeout(() => play(1320, 'sine', 0.1, 0.1), 60)
}

export function playRemove() {
  play(660, 'sine', 0.1, 0.1)
  setTimeout(() => play(440, 'sine', 0.12, 0.08), 50)
}

export function playSave() {
  play(660, 'sine', 0.1, 0.1)
  setTimeout(() => play(880, 'sine', 0.1, 0.1), 80)
  setTimeout(() => play(1100, 'sine', 0.15, 0.12), 160)
}

export function playBadge() {
  play(523, 'sine', 0.15, 0.12)
  setTimeout(() => play(659, 'sine', 0.15, 0.12), 120)
  setTimeout(() => play(784, 'sine', 0.15, 0.12), 240)
  setTimeout(() => play(1047, 'sine', 0.25, 0.15), 360)
}

export function playWin() {
  play(392, 'sawtooth', 0.08, 0.06)
  setTimeout(() => play(587, 'square', 0.1, 0.07), 70)
  setTimeout(() => play(784, 'sine', 0.3, 0.13), 150)
}

export function playLoss() {
  play(330, 'triangle', 0.18, 0.1)
  setTimeout(() => play(247, 'triangle', 0.3, 0.09), 140)
}

export function playRandom() {
  for (let i = 0; i < 6; i++) {
    const freq = 400 + Math.random() * 800
    setTimeout(() => play(freq, 'square', 0.05, 0.06), i * 40)
  }
  setTimeout(() => play(1200, 'sine', 0.15, 0.12), 280)
}

export function playPreset() {
  play(440, 'triangle', 0.1, 0.1)
  setTimeout(() => play(660, 'triangle', 0.1, 0.1), 80)
  setTimeout(() => play(880, 'triangle', 0.15, 0.12), 160)
}
