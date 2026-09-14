/**
 * Lightweight UI sounds via Web Audio API (no external files)
 */
const SOUND_KEY = "calendarSoundEnabled";

function isSoundEnabled() {
  const v = localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}

function setSoundEnabled(on) {
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}

let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone({ freq = 440, duration = 0.08, type = "sine", gain = 0.08, slideTo = null }) {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) {
      osc.frequency.linearRampToValueAtTime(slideTo, ctx.currentTime + duration);
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch (_) {}
}

const Sounds = {
  click() { playTone({ freq: 520, duration: 0.05, type: "sine", gain: 0.06 }); },
  nav() { playTone({ freq: 380, duration: 0.06, type: "triangle", gain: 0.05 }); },
  success() {
    playTone({ freq: 523, duration: 0.07, type: "sine", gain: 0.07 });
    setTimeout(() => playTone({ freq: 659, duration: 0.09, type: "sine", gain: 0.07 }), 70);
  },
  open() { playTone({ freq: 300, duration: 0.08, type: "triangle", gain: 0.05, slideTo: 480 }); },
  close() { playTone({ freq: 420, duration: 0.07, type: "triangle", gain: 0.04, slideTo: 280 }); },
  notify() {
    playTone({ freq: 880, duration: 0.1, type: "sine", gain: 0.08 });
    setTimeout(() => playTone({ freq: 1175, duration: 0.12, type: "sine", gain: 0.07 }), 100);
  },
  error() { playTone({ freq: 200, duration: 0.15, type: "sawtooth", gain: 0.04 }); },
  toggle() { playTone({ freq: 600, duration: 0.06, type: "sine", gain: 0.05, slideTo: 800 }); }
};
