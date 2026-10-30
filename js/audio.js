// WebAudio による軽量 SE 合成（外部音源ファイル不要）
(function () {
  const HW = window.HW;
  const { rand } = HW.util;

  const A = (HW.audio = {
    ctx: null,
    master: null,
    enabled: true,
    volume: 0.6,
    ambient: false,
    _last: {},
    _voices: 0,
    _noise: null,
    _amb: null,
  });

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain();
    A.master.gain.value = A.volume;
    // 軽いコンプで音割れ防止
    const comp = A.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    A.master.connect(comp).connect(A.ctx.destination);
    const len = A.ctx.sampleRate * 2;
    A._noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A._noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (A.ambient) A.setAmbient(true);
  };

  A.setVolume = function (v) {
    A.volume = v;
    if (A.master) A.master.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05);
  };

  function out(pan) {
    let node = A.master;
    if (pan !== undefined && A.ctx.createStereoPanner) {
      const p = A.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(A.master);
      node = p;
    }
    return node;
  }

  function env(g, t0, attack, dur, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function tone(dest, type, f0, f1, t0, dur, peak, attack = 0.01) {
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    env(g, t0, attack, dur, peak);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }

  function noise(dest, filterType, f0, f1, q, t0, dur, peak, attack = 0.005) {
    const s = A.ctx.createBufferSource();
    s.buffer = A._noise;
    const f = A.ctx.createBiquadFilter();
    f.type = filterType;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = A.ctx.createGain();
    env(g, t0, attack, dur, peak);
    s.connect(f).connect(g).connect(dest);
    s.start(t0, Math.random());
    s.stop(t0 + dur + 0.05);
  }

  const SFX = {
    boing(d, t) {
      tone(d, 'sine', 180, 620, t, 0.2, 0.5);
      tone(d, 'triangle', 360, 900, t, 0.12, 0.15);
    },
    land(d, t) {
      noise(d, 'lowpass', 500, 120, 1, t, 0.14, 0.5);
      tone(d, 'sine', 120, 50, t, 0.12, 0.4);
    },
    boo(d, t) {
      const o = tone(d, 'sine', 330, 200, t, 1.1, 0.35, 0.15);
      const lfo = A.ctx.createOscillator();
      const lg = A.ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = 18;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + 1.2);
      tone(d, 'triangle', 332, 202, t, 1.1, 0.12, 0.15);
    },
    squeak(d, t) {
      for (let i = 0; i < 3; i++) tone(d, 'sine', 3200, 4400, t + i * 0.07, 0.045, 0.18);
    },
    meow(d, t) {
      const o = A.ctx.createOscillator();
      const f = A.ctx.createBiquadFilter();
      const g = A.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(480, t);
      o.frequency.linearRampToValueAtTime(820, t + 0.18);
      o.frequency.linearRampToValueAtTime(430, t + 0.55);
      f.type = 'bandpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(900, t);
      f.frequency.linearRampToValueAtTime(2000, t + 0.2);
      f.frequency.linearRampToValueAtTime(800, t + 0.55);
      env(g, t, 0.05, 0.6, 0.5);
      o.connect(f).connect(g).connect(d);
      o.start(t);
      o.stop(t + 0.65);
    },
    hiss(d, t) {
      noise(d, 'highpass', 3000, 5000, 0.7, t, 0.6, 0.25, 0.05);
    },
    cackle(d, t) {
      for (let i = 0; i < 7; i++) {
        const f = i % 2 ? 900 : 700;
        const o = A.ctx.createOscillator();
        const bp = A.ctx.createBiquadFilter();
        const g = A.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t + i * 0.1);
        o.frequency.exponentialRampToValueAtTime(f * 0.8, t + i * 0.1 + 0.08);
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 3;
        env(g, t + i * 0.1, 0.01, 0.08, 0.3);
        o.connect(bp).connect(g).connect(d);
        o.start(t + i * 0.1);
        o.stop(t + i * 0.1 + 0.1);
      }
    },
    rattle(d, t) {
      for (let i = 0; i < 12; i++) noise(d, 'bandpass', 2600, 2600, 8, t + i * 0.045 + rand(0, 0.02), 0.03, 0.5);
    },
    thunder(d, t) {
      noise(d, 'lowpass', 3000, 300, 0.5, t, 0.25, 0.7);
      noise(d, 'lowpass', 220, 60, 0.8, t + 0.05, 2.8, 0.9, 0.1);
    },
    owl(d, t) {
      tone(d, 'sine', 420, 360, t, 0.35, 0.25, 0.06);
      tone(d, 'sine', 400, 340, t + 0.5, 0.6, 0.25, 0.06);
    },
    whoosh(d, t) {
      noise(d, 'bandpass', 250, 1800, 2, t, 0.5, 0.35, 0.25);
      noise(d, 'bandpass', 1800, 250, 2, t + 0.45, 0.5, 0.3, 0.02);
    },
    drop(d, t) {
      tone(d, 'sine', 900, 260, t, 0.25, 0.25);
    },
    bubble(d, t) {
      tone(d, 'sine', 260, 900, t, 0.07, 0.25);
    },
    sparkle(d, t) {
      for (let i = 0; i < 4; i++) tone(d, 'triangle', 1800 + i * 400, 2400 + i * 400, t + i * 0.06, 0.12, 0.08);
    },
    chime(d, t) {
      [523, 659, 784].forEach((f, i) => tone(d, 'sine', f, f, t + i * 0.12, 0.8, 0.15));
    },
  };
  A.names = Object.keys(SFX);

  // name: SFX 名, opts: { pan:-1..1, gain, cooldown }
  A.play = function (name, opts = {}) {
    if (!A.enabled || !A.ctx || A.ctx.state !== 'running') return;
    const fn = SFX[name];
    if (!fn) return;
    const now = A.ctx.currentTime;
    const cd = opts.cooldown !== undefined ? opts.cooldown : 0.25;
    if (A._last[name] && now - A._last[name] < cd) return;
    if (A._voices > 8) return; // 軽く：同時発音数を制限
    A._last[name] = now;
    A._voices++;
    setTimeout(() => A._voices--, 600);
    let dest = out(opts.pan);
    if (opts.gain !== undefined && opts.gain !== 1) {
      const g = A.ctx.createGain();
      g.gain.value = opts.gain;
      g.connect(dest);
      dest = g;
    }
    fn(dest, now + 0.01);
  };

  // 環境音（風）: ゆっくり揺れるバンドパスノイズ
  A.setAmbient = function (on) {
    A.ambient = on;
    if (!A.ctx) return;
    if (on && !A._amb) {
      const s = A.ctx.createBufferSource();
      s.buffer = A._noise;
      s.loop = true;
      const f = A.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 400;
      f.Q.value = 1.2;
      const lfo = A.ctx.createOscillator();
      const lg = A.ctx.createGain();
      lfo.frequency.value = 0.08;
      lg.gain.value = 250;
      lfo.connect(lg).connect(f.frequency);
      const g = A.ctx.createGain();
      g.gain.value = 0.06;
      s.connect(f).connect(g).connect(A.master);
      s.start();
      lfo.start();
      A._amb = { s, lfo };
    } else if (!on && A._amb) {
      A._amb.s.stop();
      A._amb.lfo.stop();
      A._amb = null;
    }
  };
})();
