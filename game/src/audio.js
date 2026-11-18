// CINDER FALLS — audio: every sound is synthesized live with
// WebAudio, so the game ships no sound files at all. Engine hum that
// follows the speed, a two-tone siren, a horn, crash thuds, cash
// chimes, gunshots — and three radio stations of procedural music
// (Desert FM rock, Neon 99 synth, Canyon Talk) that Dana switches
// with Q and R. Nothing starts until the player first interacts:
// browsers demand that.
const STATIONS = [
  { name: 'DESERT FM 99.1', genre: 'desert rock' },
  { name: 'NEON 99', genre: 'synthwave' },
  { name: 'CANYON TALK', genre: 'talk' },
];

// Note patterns per station, in semitone offsets from A2; the
// sequencer walks them one note a beat.
const RIFFS = {
  'desert rock': [0, 0, 7, 0, 10, 0, 7, 5, 0, 0, 7, 12, 10, 7, 5, 3],
  synthwave: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 10, 12, 15, 12, 10],
  talk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  let stationIndex = 0;
  let beatClock = 0;
  let noteIndex = 0;
  let musicGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
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
      ctx = null;
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noteFreq(semitones) {
    return 110 * Math.pow(2, semitones / 12);
  }

  return {
    get station() {
      return STATIONS[stationIndex].name;
    },
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setEngine(ratio, driving) {
      if (!ctx) return;
      if (driving) {
        engineOsc.frequency.value = 48 + ratio * 140;
        engineGain.gain.value = muted ? 0 : 0.05 + ratio * 0.06;
      } else {
        engineGain.gain.value = 0;
      }
    },
    // One beat of the current station's riff, called from the loop.
    updateMusic(dt) {
      if (!ctx || muted) return;
      beatClock += dt;
      const beatLen = STATIONS[stationIndex].genre === 'talk' ? 0.6 : 0.24;
      if (beatClock < beatLen) return;
      beatClock = 0;
      const station = STATIONS[stationIndex];
      const riff = RIFFS[station.genre];
      const note = riff[noteIndex % riff.length];
      noteIndex += 1;
      if (station.genre === 'talk') {
        // Talk radio: a low murmur blip every few beats, like a voice.
        if (noteIndex % 3 === 0) tone(90 + (noteIndex % 5) * 12, 0.18, 'sine', 0.12);
        return;
      }
      if (station.genre === 'desert rock') {
        tone(noteFreq(note), 0.22, 'square', 0.14);
        if (noteIndex % 4 === 0) tone(noteFreq(note - 12), 0.3, 'triangle', 0.2);
      } else {
        tone(noteFreq(note + 12), 0.2, 'sawtooth', 0.1);
        tone(noteFreq(note), 0.2, 'sine', 0.14);
      }
    },
    nextStation() {
      stationIndex = (stationIndex + 1) % STATIONS.length;
      noteIndex = 0;
      return STATIONS[stationIndex].name;
    },
    prevStation() {
      stationIndex = (stationIndex - 1 + STATIONS.length) % STATIONS.length;
      noteIndex = 0;
      return STATIONS[stationIndex].name;
    },
    horn() {
      tone(220, 0.35, 'square', 0.16);
      tone(277, 0.35, 'square', 0.12);
    },
    siren() {
      tone(660, 0.5, 'sine', 0.1);
      tone(520, 0.5, 'sine', 0.1, 0.5);
    },
    crash() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.connect(gain);
      gain.connect(master);
      noise.start(t);
      tone(70, 0.25, 'sine', 0.3);
    },
    cash() {
      tone(880, 0.12, 'sine', 0.2);
      tone(1318, 0.25, 'sine', 0.2, 0.1);
    },
    click() {
      tone(600, 0.06, 'square', 0.1);
    },
    punch() {
      tone(160, 0.1, 'sine', 0.25);
    },
    gunshot() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(gain);
      gain.connect(master);
      noise.start(t);
      tone(120, 0.1, 'square', 0.2);
    },
    busted() {
      tone(392, 0.3, 'sine', 0.2);
      tone(311, 0.5, 'sine', 0.2, 0.3);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
