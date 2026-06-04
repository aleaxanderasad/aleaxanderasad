// Simple Web Audio synth for typing sound effects.
// Tasteful, low-volume blips/chimes generated on the fly — no asset files needed.

let ctx = null;
const listeners = new Set();
let muted = (typeof window !== "undefined") && localStorage.getItem("nt_muted") === "1";

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem("nt_muted", muted ? "1" : "0"); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(muted));
}
export function subscribeMute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function blip(freq, dur = 0.04, type = "square", vol = 0.04) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

function sequence(notes, gap = 90) {
  notes.forEach((n, i) => setTimeout(() => blip(n.f, n.d || 0.12, n.t || "triangle", n.v || 0.06), i * gap));
}

export const sounds = {
  keyCorrect: () => blip(660 + Math.random() * 40, 0.025, "square", 0.02),
  keyWrong: () => blip(130, 0.08, "sawtooth", 0.06),
  levelUp: () => sequence([
    { f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 1046, d: 0.22, v: 0.08 },
  ], 90),
  achievement: () => sequence([{ f: 880, d: 0.1 }, { f: 1175, d: 0.18, v: 0.07 }], 100),
  bossEngage: () => blip(98, 0.45, "sawtooth", 0.1),
  bossDefeat: () => {
    sequence([{ f: 220, d: 0.18, t: "sawtooth" }, { f: 165, d: 0.18, t: "sawtooth" }, { f: 110, d: 0.22, t: "sawtooth" }], 120);
    setTimeout(() => blip(880, 0.5, "triangle", 0.1), 420);
  },
  victory: () => sequence([{ f: 392, d: 0.12 }, { f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 880, d: 0.25, v: 0.09 }], 80),
  defeat: () => sequence([{ f: 392, d: 0.18, t: "sawtooth" }, { f: 311, d: 0.18, t: "sawtooth" }, { f: 247, d: 0.3, t: "sawtooth", v: 0.08 }], 130),
  raceStart: () => sequence([{ f: 440, d: 0.1 }, { f: 440, d: 0.1 }, { f: 880, d: 0.2, v: 0.08 }], 250),
};
