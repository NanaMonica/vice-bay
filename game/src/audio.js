// Vice Bay sound: everything is synthesized with WebAudio, no audio files.
// Engine hum follows the car's speed, a two-tone siren answers the wanted
// level, the Kestrel's rotor thumps overhead at 3 stars, and three radio
// stations loop their own bass lines under the city. M toggles mute, R
// cycles the stations.
import { RADIO_STATIONS } from './districts.js';

export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let rotorOsc = null;
  let rotorGain = null;
  let musicTimer = null;
  let beat = 0;
  let station = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      return false;
    }
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 50;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'square';
    sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(ctx.destination);
    sirenOsc.start();
    // The Kestrel's rotor: a low thump that only sounds while it hunts.
    rotorOsc = ctx.createOscillator();
    rotorOsc.type = 'square';
    rotorOsc.frequency.value = 42;
    rotorGain = ctx.createGain();
    rotorGain.gain.value = 0;
    rotorOsc.connect(rotorGain).connect(ctx.destination);
    rotorOsc.start();
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const bass = RADIO_STATIONS[station % RADIO_STATIONS.length].bass;
      const note = bass[beat % bass.length];
      beat += 1;
      if (!note) return;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = note;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }, 240);
    return true;
  }

  function blip(freq, dur, type, vol) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  return {
    /** Call from a user gesture so the browser lets audio start. */
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    /** Cycle to the next radio station; returns its name. */
    nextStation() {
      station = (station + 1) % RADIO_STATIONS.length;
      beat = 0;
      return RADIO_STATIONS[station].name;
    },
    /** Per-frame: speed 0..580, wanted 0..5, time in seconds, heli hunting. */
    update(speed, wanted, time, heli) {
      if (!ctx || muted) return;
      engineGain.gain.value = speed > 20 ? 0.03 + Math.abs(speed) / 580 * 0.05 : 0;
      engineOsc.frequency.value = 50 + Math.abs(speed) * 0.16;
      if (wanted >= 2) {
        sirenGain.gain.value = 0.02;
        sirenOsc.frequency.value = Math.floor(time * 2) % 2 === 0 ? 700 : 950;
      } else {
        sirenGain.gain.value = 0;
      }
      rotorGain.gain.value = heli ? 0.02 + 0.008 * Math.sin(time * 25) : 0;
    },
    cash() { blip(880, 0.12, 'sine', 0.14); window.setTimeout(() => blip(1318, 0.18, 'sine', 0.14), 90); },
    punch() { blip(140, 0.1, 'square', 0.12); },
    shoot() { noise(0.09, 0.22); blip(190, 0.08, 'square', 0.1); },
    steal() { blip(220, 0.15, 'sawtooth', 0.1); },
    mission() { [523, 659, 784].forEach((f, i) => window.setTimeout(() => blip(f, 0.2, 'triangle', 0.14), i * 110)); },
    busted() { [392, 330, 262].forEach((f, i) => window.setTimeout(() => blip(f, 0.3, 'sawtooth', 0.1), i * 160)); },
  };
}
