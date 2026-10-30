// 背景テーマ
//  build : 静的レイヤー（オフスクリーンにキャッシュ）
//  init  : アニメーション用の状態生成
//  draw  : 毎フレームの動的レイヤー
//  tick  : 環境音などのイベント
(function () {
  const HW = window.HW;
  const C = HW.C;
  const { rand, hash } = HW.util;

  function grad(ctx, W, H, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function makeStars(W, H, n, maxY) {
    return Array.from({ length: n }, (_, i) => ({
      x: hash(i * 3.1) * W,
      y: hash(i * 7.7) * H * maxY,
      r: 0.8 + hash(i * 1.3) * 2.2,
      p: hash(i * 9.9) * 10,
    }));
  }

  function drawStars(ctx, stars, t) {
    ctx.fillStyle = C.white;
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.2 + s.p));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function moon(ctx, x, y, r, col, glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * 0.8;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    [
      [-0.3, -0.2, 0.22],
      [0.25, 0.25, 0.16],
      [0.35, -0.35, 0.1],
    ].forEach(([dx, dy, rr]) => {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function hills(ctx, W, H, baseY, amp, fill, rim, seed) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= W; x += 40) {
      const y = baseY - Math.sin(x / 300 + seed) * amp - Math.sin(x / 120 + seed * 2) * amp * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (rim) {
      ctx.strokeStyle = rim;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function deadTree(ctx, x, y, len, wd, depth, seed, fill, rim) {
    ctx.save();
    ctx.translate(x, y);
    const br = (l, a, w, d) => {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w * 0.12, -l);
      ctx.lineTo(w * 0.12, -l);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (rim) {
        ctx.strokeStyle = rim;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (d > 0) {
        ctx.translate(0, -l);
        const k = hash(seed + d * 17 + l);
        br(l * 0.7, -0.4 - k * 0.4, w * 0.6, d - 1);
        br(l * 0.62, 0.35 + k * 0.4, w * 0.55, d - 1);
        if (k > 0.6) br(l * 0.5, 0.05, w * 0.4, d - 2);
      }
      ctx.restore();
    };
    br(len, 0, wd, depth);
    ctx.restore();
  }

  function graves(ctx, W, baseY, n, fill, rim, seed) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (W / n) + (hash(i + seed) - 0.5) * 80;
      const h = 60 + hash(i * 2 + seed) * 60;
      const w = 40 + hash(i * 3 + seed) * 30;
      const y = baseY + hash(i * 5 + seed) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((hash(i * 7 + seed) - 0.5) * 0.25);
      ctx.beginPath();
      if (hash(i * 11 + seed) > 0.7) {
        ctx.rect(-6, -h, 12, h);
        ctx.rect(-w / 2, -h * 0.75, w, 12);
      } else {
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -h + w / 2);
        ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(w / 2, 0);
        ctx.closePath();
      }
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function fog(ctx, W, H, t, y0, color, n = 5) {
    for (let i = 0; i < n; i++) {
      const y = y0 + i * 30;
      const x = ((t * (20 + i * 8) + i * 400) % (W + 800)) - 400;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 420);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 420, y - 420, 840, 840);
    }
  }

  const T = {};

  T.graveyard = {
    label: '墓場の月夜',
    build(ctx, W, H) {
      grad(ctx, W, H, [
        [0, '#03000f'],
        [0.6, '#1c0648'],
        [1, '#3a0a5e'],
      ]);
      moon(ctx, W * 0.78, H * 0.22, 120, '#fff6c8', '#fff2a8');
      hills(ctx, W, H, H * 0.78, 40, '#0b0418', C.purple, 1.3);
      deadTree(ctx, W * 0.12, H * 0.78, 170, 34, 5, 3, '#0b0418', C.purple);
      deadTree(ctx, W * 0.9, H * 0.8, 120, 26, 4, 8, '#0b0418', C.purple);
      graves(ctx, W, H * 0.8, 9, '#14082a', '#9a7dff', 2);
      hills(ctx, W, H, H * 0.92, 15, '#05020c', null, 4.1);
    },
    init(st, W, H) {
      st.stars = makeStars(W, H, 140, 0.6);
      st.bat = null;
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
      // 月の前を横切るコウモリのシルエット
      if (!st.bat && Math.random() < 0.004) st.bat = { t: 0, y: H * 0.2 + rand(-60, 60) };
      if (st.bat) {
        st.bat.t += 1 / 60;
        const x = W * 0.6 + st.bat.t * 260;
        const f = Math.sin(t * 22) * 10;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(x, st.bat.y);
        ctx.lineTo(x - 18, st.bat.y - f);
        ctx.lineTo(x - 8, st.bat.y + 3);
        ctx.lineTo(x, st.bat.y + 6);
        ctx.lineTo(x + 8, st.bat.y + 3);
        ctx.lineTo(x + 18, st.bat.y - f);
        ctx.fill();
        if (x > W + 40) st.bat = null;
      }
      fog(ctx, W, H, t, H * 0.85, 'rgba(180,140,255,0.10)');
    },
    tick(st, w, dt) {
      if (Math.random() < dt * 0.05) w.sfx(null, 'owl', { gain: 0.6, pan: rand(-0.8, 0.8) });
    },
  };

  T.mansion = {
    label: '幽霊屋敷（雷）',
    build(ctx, W, H) {
      grad(ctx, W, H, [
        [0, '#05000f'],
        [0.7, '#2c0057'],
        [1, '#4b0082'],
      ]);
      hills(ctx, W, H, H * 0.8, 70, '#070012', C.purple, 0.2);
      // 屋敷のシルエット
      const cx = W * 0.5;
      const by = H * 0.74;
      ctx.fillStyle = '#070012';
      ctx.strokeStyle = C.magenta;
      ctx.lineWidth = 3;
      const shape = () => {
        ctx.beginPath();
        ctx.moveTo(cx - 300, by);
        ctx.lineTo(cx - 300, by - 220);
        ctx.lineTo(cx - 340, by - 220);
        ctx.lineTo(cx - 250, by - 330);
        ctx.lineTo(cx - 160, by - 220);
        ctx.lineTo(cx - 120, by - 220);
        ctx.lineTo(cx - 120, by - 340);
        ctx.lineTo(cx - 150, by - 340);
        ctx.lineTo(cx, by - 500);
        ctx.lineTo(cx + 150, by - 340);
        ctx.lineTo(cx + 120, by - 340);
        ctx.lineTo(cx + 120, by - 260);
        ctx.lineTo(cx + 200, by - 260);
        ctx.lineTo(cx + 200, by - 420);
        ctx.lineTo(cx + 180, by - 420);
        ctx.lineTo(cx + 240, by - 540);
        ctx.lineTo(cx + 300, by - 420);
        ctx.lineTo(cx + 280, by - 420);
        ctx.lineTo(cx + 280, by - 180);
        ctx.lineTo(cx + 320, by - 180);
        ctx.lineTo(cx + 320, by);
        ctx.closePath();
      };
      shape();
      ctx.fill();
      ctx.stroke();
      deadTree(ctx, W * 0.15, H * 0.82, 200, 40, 5, 11, '#070012', C.magenta);
      deadTree(ctx, W * 0.86, H * 0.84, 150, 30, 5, 21, '#070012', C.magenta);
      hills(ctx, W, H, H * 0.93, 12, '#030008', null, 2.2);
    },
    init(st, W, H) {
      st.stars = makeStars(W, H, 80, 0.5);
      const cx = W * 0.5;
      const by = H * 0.74;
      st.windows = [];
      const add = (x, y, w, h) => st.windows.push({ x: cx + x, y: by + y, w, h, p: Math.random() * 10, on: Math.random() > 0.3 });
      for (let i = 0; i < 3; i++) add(-270 + i * 50, -180, 28, 44);
      for (let i = 0; i < 3; i++) add(-90 + i * 70, -300, 34, 54);
      for (let i = 0; i < 3; i++) add(-90 + i * 70, -180, 34, 54);
      add(-18, -420, 36, 46);
      add(220, -380, 30, 50);
      add(220, -280, 30, 50);
      for (let i = 0; i < 2; i++) add(140 + i * 60, -140, 30, 46);
      st.flash = 0;
      st.next = rand(4, 9);
      st.bolt = null;
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
      for (const w of st.windows) {
        if (Math.random() < 0.002) w.on = !w.on;
        if (!w.on) continue;
        const f = 0.7 + 0.3 * Math.sin(t * 13 + w.p) * Math.sin(t * 3.1 + w.p);
        ctx.save();
        ctx.shadowColor = C.orange;
        ctx.shadowBlur = 25;
        ctx.fillStyle = `rgba(255,${(180 + 60 * f) | 0},40,${0.8 + 0.2 * f})`;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y + w.h);
        ctx.lineTo(w.x, w.y + w.w / 2);
        ctx.arc(w.x + w.w / 2, w.y + w.w / 2, w.w / 2, Math.PI, 0);
        ctx.lineTo(w.x + w.w, w.y + w.h);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#070012';
        ctx.fillRect(w.x + w.w / 2 - 2, w.y + 4, 4, w.h - 4);
        ctx.fillRect(w.x, w.y + w.h * 0.55, w.w, 4);
      }
      if (st.bolt && st.flash > 0.3) {
        ctx.save();
        ctx.strokeStyle = C.white;
        ctx.shadowColor = '#bfa8ff';
        ctx.shadowBlur = 30;
        ctx.lineWidth = 5;
        ctx.beginPath();
        st.bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
      }
      if (st.flash > 0) {
        ctx.fillStyle = `rgba(230,220,255,${st.flash * 0.75})`;
        ctx.fillRect(0, 0, W, H);
      }
      fog(ctx, W, H, t, H * 0.86, 'rgba(255,80,220,0.08)');
    },
    tick(st, w, dt) {
      st.flash = Math.max(0, st.flash - dt * 2.5);
      st.next -= dt;
      if (st.next <= 0) {
        st.next = rand(7, 14);
        st.flash = 1;
        let x = rand(w.LW * 0.1, w.LW * 0.9);
        let y = 0;
        st.bolt = [[x, y]];
        while (y < w.LH * 0.55) {
          x += rand(-60, 60);
          y += rand(40, 90);
          st.bolt.push([x, y]);
        }
        setTimeout(() => (st.flash = 0.8), 120);
        w.sfx(null, 'thunder', { cooldown: 1, pan: (x / w.LW) * 2 - 1 });
      }
    },
  };

  T.pumpkin = {
    label: 'かぼちゃ畑',
    build(ctx, W, H) {
      grad(ctx, W, H, [
        [0, '#05000c'],
        [0.5, '#2a0418'],
        [0.75, '#8a1d00'],
        [0.86, '#ff5a00'],
        [1, '#ff8a00'],
      ]);
      moon(ctx, W * 0.2, H * 0.3, 150, '#ff9a2e', '#ff6a00');
      hills(ctx, W, H, H * 0.8, 50, '#0a0204', '#ff7a00', 0.7);
      hills(ctx, W, H, H * 0.9, 25, '#050102', '#3cff4a', 2.9);
      // つる
      ctx.strokeStyle = '#1fd13a';
      ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const x = hash(i * 4.4) * W;
        const y = H * 0.9 + hash(i * 2.2) * H * 0.08;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 1; k <= 6; k++) ctx.quadraticCurveTo(x + k * 30 - 15, y - 20 * (k % 2 ? 1 : -1), x + k * 30, y);
        ctx.stroke();
      }
    },
    init(st, W, H) {
      st.stars = makeStars(W, H, 60, 0.4);
      st.pumps = Array.from({ length: 16 }, (_, i) => ({
        x: hash(i * 5.1) * W,
        y: H * 0.83 + hash(i * 3.3) * H * 0.06,
        r: 9 + hash(i * 1.7) * 11,
        p: hash(i) * 10,
      }));
      st.pumps.sort((a, b) => a.y - b.y);
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
      for (const p of st.pumps) {
        const f = 0.7 + 0.3 * Math.sin(t * 9 + p.p);
        ctx.save();
        ctx.shadowColor = C.orange;
        ctx.shadowBlur = 18;
        ctx.fillStyle = C.orange;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 1.25, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = `rgba(255,230,80,${f})`;
        ctx.beginPath();
        ctx.moveTo(p.x - p.r * 0.6, p.y - p.r * 0.1);
        ctx.lineTo(p.x - p.r * 0.3, p.y - p.r * 0.55);
        ctx.lineTo(p.x - p.r * 0.05, p.y - p.r * 0.1);
        ctx.moveTo(p.x + p.r * 0.05, p.y - p.r * 0.1);
        ctx.lineTo(p.x + p.r * 0.3, p.y - p.r * 0.55);
        ctx.lineTo(p.x + p.r * 0.6, p.y - p.r * 0.1);
        ctx.moveTo(p.x - p.r * 0.7, p.y + p.r * 0.2);
        ctx.quadraticCurveTo(p.x, p.y + p.r * 0.9, p.x + p.r * 0.7, p.y + p.r * 0.2);
        ctx.fill();
        ctx.fillStyle = '#3cff4a';
        ctx.fillRect(p.x - 3, p.y - p.r - 8, 6, 10);
      }
    },
    tick() {},
  };

  T.forest = {
    label: '魔女の森',
    build(ctx, W, H) {
      grad(ctx, W, H, [
        [0, '#000502'],
        [0.6, '#022010'],
        [1, '#05401c'],
      ]);
      for (let i = 0; i < 7; i++) {
        const x = (i + 0.5) * (W / 7) + (hash(i * 9) - 0.5) * 120;
        deadTree(ctx, x, H * 0.95, 160 + hash(i) * 120, 30 + hash(i * 3) * 20, 5, i * 7, '#010803', '#2bff6a');
      }
      hills(ctx, W, H, H * 0.93, 18, '#000301', '#2bff6a', 5.5);
    },
    init(st, W, H) {
      st.flies = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(H * 0.3, H * 0.95), p: rand(0, 10), s: rand(10, 40) }));
    },
    draw(ctx, W, H, t, st) {
      fog(ctx, W, H, t, H * 0.8, 'rgba(60,255,120,0.10)', 6);
      ctx.save();
      ctx.shadowColor = '#c8ff3a';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#e6ff6a';
      for (const f of st.flies) {
        const x = f.x + Math.sin(t * 0.5 + f.p) * f.s * 2;
        const y = f.y + Math.cos(t * 0.7 + f.p * 1.3) * f.s;
        ctx.globalAlpha = Math.max(0, Math.sin(t * 1.5 + f.p));
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    tick(st, w, dt) {
      if (Math.random() < dt * 0.04) w.sfx(null, 'owl', { gain: 0.5, pan: rand(-1, 1) });
    },
  };

  T.bloodmoon = {
    label: '赤い月',
    build(ctx, W, H) {
      grad(ctx, W, H, [
        [0, '#000000'],
        [0.65, '#2a0005'],
        [1, '#5a000c'],
      ]);
      moon(ctx, W * 0.5, H * 0.42, 260, '#ff2a2a', '#ff0022');
      // 城壁のシルエット
      ctx.fillStyle = '#000';
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H * 0.78);
      for (let x = 0; x < W; x += 80) {
        const tall = hash(x) > 0.75;
        const top = H * (tall ? 0.6 : 0.76);
        ctx.lineTo(x, top);
        if (tall) {
          ctx.lineTo(x + 40, top - 70);
          ctx.lineTo(x + 80, top);
        } else {
          ctx.lineTo(x + 20, top);
          ctx.lineTo(x + 20, top - 20);
          ctx.lineTo(x + 40, top - 20);
          ctx.lineTo(x + 40, top);
          ctx.lineTo(x + 80, top);
        }
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    init(st, W, H) {
      st.bats = Array.from({ length: 14 }, () => ({ a: rand(0, Math.PI * 2), r: rand(200, 420), s: rand(0.2, 0.5), p: rand(0, 10) }));
    },
    draw(ctx, W, H, t, st) {
      ctx.fillStyle = '#000';
      for (const b of st.bats) {
        const a = b.a + t * b.s;
        const x = W * 0.5 + Math.cos(a) * b.r * 1.4;
        const y = H * 0.42 + Math.sin(a) * b.r * 0.6;
        const f = Math.sin(t * 18 + b.p) * 9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 20, y - f);
        ctx.lineTo(x - 8, y + 4);
        ctx.lineTo(x, y + 7);
        ctx.lineTo(x + 8, y + 4);
        ctx.lineTo(x + 20, y - f);
        ctx.fill();
      }
      fog(ctx, W, H, t, H * 0.88, 'rgba(255,30,60,0.09)');
    },
    tick() {},
  };

  T.black = {
    label: '黒（実物投影用）',
    build(ctx, W, H) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    },
    init() {},
    draw() {},
    tick() {},
  };

  T.starry = {
    label: '星空のみ',
    build(ctx, W, H) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    },
    init(st, W, H) {
      st.stars = makeStars(W, H, 220, 1);
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
    },
    tick() {},
  };

  HW.themes = T;
})();
