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

  // 背景オブジェクトの初期配置（W=論理幅, H=1080）
  //  [type, x, y(足元), scale, params, sx]
  const bgItem = (type, x, y, scale, params, sx) => ({ type, x, y, scale, params, sx });

  const T = {};

  T.graveyard = {
    label: '墓場の月夜',
    build(ctx, W, H) {
      grad(ctx, W, H, [
        [0, '#03000f'],
        [0.6, '#1c0648'],
        [1, '#3a0a5e'],
      ]);
    },
    preset: (W, H) => [
      bgItem('moon', W * 0.78, H * 0.22 + 129, 0.92, { color: '#fff6c8' }),
      bgItem('hills', W / 2, H, 0.8, { fill: '#0b0418', rim: '#a24bff', wave: 40, shape: 1.3 }, W / 1920),
      bgItem('tree', W * 0.12, H * 0.8, 1.1, { fill: '#0b0418', rim: '#a24bff', shape: 3 }),
      bgItem('tree', W * 0.9, H * 0.82, 0.8, { fill: '#0b0418', rim: '#a24bff', shape: 8 }),
      bgItem('graves', W / 2, H * 0.84, 1, { fill: '#14082a', rim: '#9a7dff', count: 9 }, W / 1920),
      bgItem('hills', W / 2, H, 0.3, { fill: '#05020c', rim: '#000000', wave: 15, shape: 4.1 }, W / 1920),
    ],
    init(st, W, H) {
      st.stars = makeStars(W, H, 140, 0.6);
      st.bat = null;
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
      // 遠くを横切るコウモリのシルエット
      if (!st.bat && Math.random() < 0.004) st.bat = { t: 0, y: H * 0.2 + rand(-60, 60) };
      if (st.bat) {
        st.bat.t += 1 / 60;
        const x = W * 0.55 + st.bat.t * 260;
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
    },
    drawFront(ctx, W, H, t) {
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
    },
    preset: (W, H) => [
      bgItem('hills', W / 2, H, 0.85, { fill: '#070012', rim: '#a24bff', wave: 70, shape: 0.2 }, W / 1920),
      bgItem('mansion', W * 0.5, H * 0.74, 1, { fill: '#070012', rim: '#ff2bd6', light: '#ffb020' }),
      bgItem('tree', W * 0.15, H * 0.84, 1.25, { fill: '#070012', rim: '#ff2bd6', shape: 11 }),
      bgItem('tree', W * 0.86, H * 0.86, 0.95, { fill: '#070012', rim: '#ff2bd6', shape: 21 }),
      bgItem('hills', W / 2, H, 0.3, { fill: '#030008', rim: '#000000', wave: 12, shape: 2.2 }, W / 1920),
    ],
    init(st, W, H) {
      st.stars = makeStars(W, H, 80, 0.5);
      st.flash = 0;
      st.next = rand(4, 9);
      st.bolt = null;
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
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
    },
    // 稲光は手前（背景オブジェクトの上）に重ねる
    drawFront(ctx, W, H, t, st) {
      fog(ctx, W, H, t, H * 0.86, 'rgba(255,80,220,0.08)');
      if (st.flash > 0) {
        ctx.fillStyle = `rgba(230,220,255,${st.flash * 0.6})`;
        ctx.fillRect(0, 0, W, H);
      }
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
    },
    preset: (W, H) => [
      bgItem('moon', W * 0.2, H * 0.3 + 162, 1.15, { color: '#ff9a2e' }),
      bgItem('hills', W / 2, H, 0.75, { fill: '#0a0204', rim: '#ff7a00', wave: 50, shape: 0.7 }, W / 1920),
      bgItem('hills', W / 2, H, 0.4, { fill: '#050102', rim: '#3cff4a', wave: 25, shape: 2.9 }, W / 1920),
      bgItem('pumpkinfield', W / 2, H * 0.93, 1, { vine: '#1fd13a', count: 16 }, W / 1920),
    ],
    init(st, W, H) {
      st.stars = makeStars(W, H, 60, 0.4);
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
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
    },
    preset: (W, H) => {
      const list = [];
      for (let i = 0; i < 7; i++) {
        const x = (i + 0.5) * (W / 7) + (hash(i * 9) - 0.5) * 120;
        list.push(bgItem('tree', Math.round(x), H * 0.95, 1 + hash(i) * 0.7, { fill: '#010803', rim: '#2bff6a', shape: i * 7 + 1 }));
      }
      list.push(bgItem('hills', W / 2, H, 0.3, { fill: '#000301', rim: '#2bff6a', wave: 18, shape: 5.5 }, W / 1920));
      return list;
    },
    init(st, W, H) {
      st.flies = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(H * 0.3, H * 0.95), p: rand(0, 10), s: rand(10, 40) }));
    },
    draw() {},
    drawFront(ctx, W, H, t, st) {
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
    },
    preset: (W, H) => [
      bgItem('moon', W * 0.5, H * 0.42 + 280, 2, { color: '#ff2a2a' }),
      bgItem('castle', W / 2, H, 1, { fill: '#000000', rim: '#ff1744' }, W / 1920),
    ],
    init(st, W, H) {
      st.bats = Array.from({ length: 14 }, () => ({ a: rand(0, Math.PI * 2), r: rand(200, 420), s: rand(0.2, 0.5), p: rand(0, 10) }));
    },
    draw() {},
    // コウモリの群れは月の手前を飛ぶ
    drawFront(ctx, W, H, t, st) {
      fog(ctx, W, H, t, H * 0.88, 'rgba(255,30,60,0.09)');
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
    },
    tick() {},
  };

  T.black = {
    label: '黒（実物投影用）',
    build(ctx, W, H) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    },
    preset: () => [],
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
    preset: () => [],
    init(st, W, H) {
      st.stars = makeStars(W, H, 220, 1);
    },
    draw(ctx, W, H, t, st) {
      drawStars(ctx, st.stars, t);
    },
    tick() {},
  };

  HW.themes = T;

  // テーマの背景オブジェクトを、シーンのアイテム形式で返す
  HW.themePreset = function (theme, W) {
    const th = T[theme];
    if (!th || !th.preset) return [];
    return th.preset(W, HW.LOGICAL_H).map((b) => {
      const it = { id: HW.util.uid(), kind: 'prop', type: b.type, x: Math.round(b.x), y: Math.round(b.y), scale: b.scale, flip: false, sound: true };
      if (b.params) it.params = Object.assign({}, b.params);
      // 横に伸ばす背景（地面など）は、サイズ倍率に関係なく横幅が b.sx×画面幅 になるよう補正
      const def = HW.props[b.type];
      if (def && def.stretch) it.sx = Math.round(((b.sx || 1) / b.scale) * 1000) / 1000;
      return it;
    });
  };
})();
