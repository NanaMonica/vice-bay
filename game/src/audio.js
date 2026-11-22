// Vice Bay — all sound is synthesized with WebAudio: no audio files.
// Engine hum, sirens, gunshots, radio jingles and a tiny step sequencer
// for the three radio stations.
import { RADIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = null;
  let radioTimer = null;
  let radioStep = 0;
  let station = 0;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // engine: a low sawtooth whose pitch follows speed
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx || !master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  // --- radio: one step of the sequencer, called on a timer ---------------
  function radioTick() {
    if (!ctx || muted) return;
    const st = RADIO[station];
    const stepDur = 60 / st.bpm / 2; // eighth notes
    const scale = st.scale;
    const root = 110;
    const freq = root * Math.pow(2, (scale[radioStep % scale.length] + 12 * (radioStep % 8 >= 4 ? 1 : 0)) / 12);
    if (radioStep % 2 === 0) tone(freq, stepDur * 0.9, 'square', 0.05);
    if (radioStep % 4 === 0) tone(root / 2, stepDur * 1.8, 'triangle', 0.09);
    radioStep += 1;
    radioTimer = setTimeout(radioTick, stepDur * 1000);
  }

  return {
    /** Call from a user gesture (start button). */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** speed 0..1, inCar: engine audible only in a car. */
    setEngine(speed01, inCar) {
      if (!ctx || !engineOsc) return;
      engineOsc.frequency.value = 55 + speed01 * 130;
      engineGain.gain.value = inCar ? 0.05 + speed01 * 0.05 : 0;
    },
    /** Two-tone siren while wanted > 0; call every frame, it self-times. */
    siren(wanted) {
      if (!ctx || muted) return;
      if (wanted <= 0) {
        if (sirenTimer !== null) {
          clearInterval(sirenTimer);
          sirenTimer = null;
        }
        return;
      }
      if (sirenTimer !== null) return;
      let high = false;
      sirenTimer = setInterval(() => {
        tone(high ? 880 : 660, 0.32, 'sine', 0.045);
        high = !high;
      }, 340);
    },
    gunshot() {
      if (!ensure()) return;
      noiseBurst(0.14, 0.5, 1800);
      tone(140, 0.1, 'square', 0.2);
    },
    punch() {
      if (!ensure()) return;
      noiseBurst(0.08, 0.3, 500);
    },
    steal() {
      if (!ensure()) return;
      tone(520, 0.09, 'square', 0.12);
      tone(780, 0.12, 'square', 0.12, 0.09);
    },
    cash() {
      if (!ensure()) return;
      tone(990, 0.08, 'sine', 0.14);
      tone(1320, 0.14, 'sine', 0.14, 0.08);
    },
    missionDone() {
      if (!ensure()) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, i * 0.11));
    },
    busted() {
      if (!ensure()) return;
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.12, i * 0.18));
    },
    win() {
      if (!ensure()) return;
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.13));
    },
    radioStation() {
      return RADIO[station];
    },
    nextStation() {
      station = (station + 1) % RADIO.length;
      radioStep = 0;
      return RADIO[station];
    },
    startRadio() {
      if (!ensure()) return;
      if (radioTimer !== null) return;
      radioTick();
    },
    stopRadio() {
      if (radioTimer !== null) {
        clearTimeout(radioTimer);
        radioTimer = null;
      }
    },
  };
}
