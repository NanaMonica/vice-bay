// Vice Bay sound: everything is synthesized with WebAudio, no audio files.
// Engine hum follows the car's speed, a two-tone siren answers the wanted
// level, the Kestrel's rotor thumps overhead at 3 stars, and three radio
// stations loop their own bass lines under the city. M toggles mute, R
// cycles the stations.
import { STATIONS } from './districts.js';

export function makeSound() {
  let ctx = null;
  let muted = false;
  let station = 0;
  let step = 0;
  let engine = null;
  let siren = null;
  let rotor = null;

  /** Build the context and the three always-on voices on first use. */
  function startContext() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      return false;
    }
    engine = voice('sawtooth', 50, 0);
    siren = voice('square', 700, 0);
    rotor = voice('square', 42, 0);
    window.setInterval(() => {
      if (muted || !ctx) return;
      const line = STATIONS[station % STATIONS.length].bass;
      const note = line[step % line.length];
      step += 1;
      if (note) tone(note, 0.22, 'triangle', 0.05);
    }, 240);
    return true;
  }

  /** One always-on oscillator + gain, already connected and started. */
  function voice(type, freq, level) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = level;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    return { osc, gain };
  }

  /** A short note that fades out. */
  function tone(freq, dur, type, vol) {
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

  /** A short burst of filtered noise (the gunshot). */
  function hiss(dur, vol) {
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

  /** A little arpeggio, one note every `gap` ms. */
  function arp(freqs, gap, dur, type, vol) {
    freqs.forEach((f, i) => window.setTimeout(() => tone(f, dur, type, vol), i * gap));
  }

  return {
    /** Call from a user gesture so the browser lets audio start. */
    unlock() { if (startContext() && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    /** Cycle to the next radio station; returns its name. */
    nextStation() {
      station = (station + 1) % STATIONS.length;
      step = 0;
      return STATIONS[station].name;
    },
    /** Per-frame: speed 0..580, wanted 0..5, time in seconds, heli hunting. */
    update(speed, wanted, time, heli) {
      if (!ctx || muted) return;
      const moving = Math.abs(speed);
      engine.gain.gain.value = moving > 20 ? 0.03 + (moving / 580) * 0.05 : 0;
      engine.osc.frequency.value = 50 + moving * 0.16;
      if (wanted >= 2) {
        siren.gain.gain.value = 0.02;
        siren.osc.frequency.value = Math.floor(time * 2) % 2 === 0 ? 700 : 950;
      } else {
        siren.gain.gain.value = 0;
      }
      rotor.gain.gain.value = heli ? 0.02 + 0.008 * Math.sin(time * 25) : 0;
    },
    cash() { tone(880, 0.12, 'sine', 0.14); window.setTimeout(() => tone(1318, 0.18, 'sine', 0.14), 90); },
    punch() { tone(140, 0.1, 'square', 0.12); },
    shoot() { hiss(0.09, 0.22); tone(190, 0.08, 'square', 0.1); },
    steal() { tone(220, 0.15, 'sawtooth', 0.1); },
    job() { arp([523, 659, 784], 110, 0.2, 'triangle', 0.14); },
    busted() { arp([392, 330, 262], 160, 0.3, 'sawtooth', 0.1); },
  };
}
