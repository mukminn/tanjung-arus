// Synthesised WebAudio sounds: engine hum, two-tone siren, crash, gunshot, chime, ambience. No audio files.
export function createAudio() {
  let ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, sirenLfo = null, sirenLfoGain = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(ctx.destination); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(ctx.destination); sirenOsc.start();
      // Two-tone wail: a slow LFO sweeps the siren carrier ±170 Hz around 700 Hz.
      sirenLfo = ctx.createOscillator(); sirenLfo.type = 'sine'; sirenLfo.frequency.value = 0.7;
      sirenLfoGain = ctx.createGain(); sirenLfoGain.gain.value = 170;
      sirenLfo.connect(sirenLfoGain).connect(sirenOsc.frequency); sirenLfo.start();
    } catch { ctx = null; }
    return !!ctx;
  }
  function blip(freq, dur, type = 'sine', vol = 0.15, slide = 0) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol = 0.2) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g).connect(ctx.destination); s.start();
  }
  return {
    unlock: ensure,
    setEngine(speedRatio, driving) {
      if (!ctx) return;
      engineGain.gain.value = driving ? 0.03 + Math.abs(speedRatio) * 0.05 : 0;
      engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 120;
    },
    setSiren(on) { if (ctx) sirenGain.gain.value = on ? 0.018 : 0; },
    crash() { noise(0.25, 0.3); blip(90, 0.2, 'square', 0.12, -40); },
    shot() { noise(0.08, 0.35); blip(220, 0.07, 'square', 0.1, -160); },
    punch() { noise(0.06, 0.15); },
    chime() { blip(880, 0.15, 'sine', 0.12); setTimeout(() => blip(1320, 0.25, 'sine', 0.12), 110); },
    hurt() { blip(160, 0.15, 'sawtooth', 0.1, -60); },
  };
}
