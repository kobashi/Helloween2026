// 静的オブジェクト（アイドルアニメーション付き）
//  原点=足元中央。params はエディタで編集できる追加パラメータ
(function () {
  const HW = window.HW;
  const C = HW.C;
  const { rand, chance } = HW.util;

  const defs = {};

  defs.lantern = {
    label: 'ジャック・オ・ランタン',
    w: 150,
    h: 130,
    draw(ctx, p, t) {
      const fl = 0.75 + 0.25 * Math.sin(t * 19 + p.seed * 9) * Math.sin(t * 5.3 + p.seed);
      ctx.beginPath();
      ctx.ellipse(0, -58, 74, 58, 0, 0, Math.PI * 2);
      HW.glow(ctx, C.orange, 30);
      ctx.fillStyle = C.orange;
      ctx.fill();
      HW.noGlow(ctx);
      HW.outline(ctx, '#ffb366', 3);
      ctx.strokeStyle = C.orangeDeep;
      ctx.lineWidth = 5;
      for (const rx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(rx * 26, -58, 30, 56, 0, -Math.PI / 2, Math.PI / 2, rx < 0);
        ctx.stroke();
      }
      ctx.fillStyle = '#3cff4a';
      ctx.fillRect(-8, -128, 16, 18);
      ctx.fillStyle = `rgb(255,${(190 + 60 * fl) | 0},40)`;
      HW.glow(ctx, C.yellow, 40 * fl);
      ctx.beginPath();
      ctx.moveTo(-44, -70);
      ctx.lineTo(-24, -98);
      ctx.lineTo(-8, -70);
      ctx.closePath();
      ctx.moveTo(8, -70);
      ctx.lineTo(24, -98);
      ctx.lineTo(44, -70);
      ctx.closePath();
      ctx.moveTo(-6, -58);
      ctx.lineTo(6, -58);
      ctx.lineTo(0, -48);
      ctx.closePath();
      ctx.moveTo(-50, -40);
      for (let i = 0; i <= 8; i++) ctx.lineTo(-50 + i * 12.5, i % 2 ? -28 : -40);
      ctx.quadraticCurveTo(0, 0, -50, -40);
      ctx.fill();
      HW.noGlow(ctx);
    },
  };

  defs.tombstone = {
    label: '墓石',
    w: 130,
    h: 170,
    params: { text: 'R.I.P' },
    draw(ctx, p, t) {
      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(-58, -110);
      ctx.arc(0, -110, 58, Math.PI, 0);
      ctx.lineTo(58, 0);
      ctx.closePath();
      ctx.fillStyle = '#4a4a6e';
      ctx.fill();
      HW.outline(ctx, '#c9c9ff', 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-30, -60);
      ctx.lineTo(-18, -40);
      ctx.lineTo(-24, -20);
      ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.font = 'bold 30px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((p.params && p.params.text) || '', 0, -110);
      ctx.fillStyle = '#2bd94a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 80, 10, 0, Math.PI, 0);
      ctx.fill();
    },
  };

  defs.candle = {
    label: 'ろうそく',
    w: 40,
    h: 130,
    draw(ctx, p, t) {
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(-14, -90, 28, 90);
      HW.outline(ctx, C.white, 2);
      ctx.beginPath();
      ctx.moveTo(-14, -90);
      ctx.quadraticCurveTo(-18, -70, -12, -60);
      ctx.lineTo(-10, -88);
      ctx.fill();
      const fl = Math.sin(t * 17 + p.seed * 7) * 0.15 + Math.sin(t * 31) * 0.08;
      ctx.save();
      ctx.translate(0, -94);
      ctx.scale(1 + fl * 0.5, 1 + fl);
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.quadraticCurveTo(14, -10, 0, 2);
      ctx.quadraticCurveTo(-14, -10, 0, -36);
      HW.glow(ctx, C.orange, 45);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -6, 4, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.white;
      ctx.fill();
      HW.noGlow(ctx);
      ctx.restore();
    },
  };

  defs.cauldron = {
    label: '魔女の大釜',
    w: 180,
    h: 160,
    update(p, w, dt) {
      if (chance(dt * 6)) w.particle(p.x + rand(-50, 50) * p.scale, p.y - 120 * p.scale, 'bubble', p.scale);
      if (chance(dt * 0.6)) w.sfx(p, 'bubble', { gain: 0.5 });
    },
    draw(ctx, p, t) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-50, -30);
      ctx.lineTo(-62, 0);
      ctx.moveTo(50, -30);
      ctx.lineTo(62, 0);
      ctx.stroke();
      // 液面の光
      ctx.beginPath();
      ctx.ellipse(0, -118, 70, 16, 0, 0, Math.PI * 2);
      HW.glow(ctx, C.green, 50);
      ctx.fillStyle = C.green;
      ctx.fill();
      HW.noGlow(ctx);
      for (let i = 0; i < 4; i++) {
        const bx = Math.sin(t * 1.3 + i * 2) * 45;
        const r = 8 + 5 * Math.sin(t * 4 + i);
        ctx.beginPath();
        ctx.arc(bx, -122, Math.abs(r), Math.PI, 0);
        ctx.fillStyle = '#b6ff9a';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-80, -112);
      ctx.bezierCurveTo(-110, -40, -60, -10, 0, -10);
      ctx.bezierCurveTo(60, -10, 110, -40, 80, -112);
      ctx.quadraticCurveTo(0, -95, -80, -112);
      ctx.fillStyle = '#1a1a26';
      ctx.fill();
      HW.outline(ctx, C.purple, 4);
      ctx.beginPath();
      ctx.ellipse(0, -114, 84, 14, 0, 0, Math.PI);
      ctx.strokeStyle = '#555577';
      ctx.lineWidth = 8;
      ctx.stroke();
      // 火
      for (let i = -2; i <= 2; i++) {
        const fh = 26 + Math.sin(t * 12 + i * 3) * 8;
        ctx.beginPath();
        ctx.moveTo(i * 20 - 10, 0);
        ctx.quadraticCurveTo(i * 20, -fh * 1.4, i * 20 + 10, 0);
        HW.glow(ctx, C.orange, 20);
        ctx.fillStyle = i % 2 ? C.yellow : C.orange;
        ctx.fill();
      }
      HW.noGlow(ctx);
    },
  };

  defs.web = {
    label: 'クモの巣',
    w: 220,
    h: 220,
    draw(ctx, p, t) {
      ctx.translate(0, -110);
      ctx.rotate(Math.sin(t * 0.8 + p.seed * 3) * 0.02);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.2;
      HW.glow(ctx, '#ffffff', 6);
      const N = 10;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 108, Math.sin(a) * 108);
      }
      for (let r = 18; r <= 108; r += 18) {
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2;
          const a0 = ((i - 1) / N) * Math.PI * 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.quadraticCurveTo(Math.cos((a + a0) / 2) * r * 0.85, Math.sin((a + a0) / 2) * r * 0.85, x, y);
        }
      }
      ctx.stroke();
      HW.noGlow(ctx);
    },
  };

  defs.tree = {
    label: '枯れ木',
    bg: true,
    w: 280,
    h: 400,
    params: { fill: '#140820', rim: '#a24bff', shape: 1 },
    draw(ctx, p, t) {
      const P = p.params || {};
      const shape = Number(P.shape) || 1;
      const sway = Math.sin(t * 0.7 + p.seed * 5) * 0.03;
      const branch = (len, ang, wd, depth) => {
        ctx.save();
        ctx.rotate(ang + sway * (4 - depth));
        ctx.beginPath();
        ctx.moveTo(-wd / 2, 0);
        ctx.quadraticCurveTo(-wd * 0.2, -len * 0.5, -wd * 0.1, -len);
        ctx.lineTo(wd * 0.1, -len);
        ctx.quadraticCurveTo(wd * 0.3, -len * 0.5, wd / 2, 0);
        ctx.closePath();
        ctx.fillStyle = P.fill || '#140820';
        ctx.fill();
        HW.outline(ctx, P.rim || C.purple, 2.5);
        if (depth > 0) {
          ctx.translate(0, -len);
          const k = HW.util.hash(depth * 13 + shape * 100 + len);
          branch(len * 0.68, -0.5 - k * 0.3, wd * 0.6, depth - 1);
          branch(len * 0.6, 0.45 + k * 0.35, wd * 0.55, depth - 1);
        }
        ctx.restore();
      };
      branch(170, 0, 46, 4);
    },
  };

  defs.skull = {
    label: 'ドクロ',
    w: 80,
    h: 70,
    draw(ctx, p, t) {
      ctx.fillStyle = C.bone;
      HW.glow(ctx, '#b8fbff', 14);
      ctx.beginPath();
      ctx.arc(0, -40, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-17, -20, 34, 18);
      HW.noGlow(ctx);
      ctx.fillStyle = C.black;
      ctx.beginPath();
      ctx.ellipse(-11, -42, 9, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(11, -42, 9, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(-5, -24);
      ctx.lineTo(5, -24);
      ctx.fill();
      ctx.fillRect(-12, -14, 3, 12);
      ctx.fillRect(-4, -14, 3, 12);
      ctx.fillRect(4, -14, 3, 12);
      const g = 0.5 + 0.5 * Math.sin(t * 2 + p.seed * 6);
      HW.glow(ctx, C.green, 12);
      ctx.fillStyle = `rgba(93,255,58,${0.4 + 0.6 * g})`;
      ctx.beginPath();
      ctx.arc(-11, -42, 3.5, 0, Math.PI * 2);
      ctx.arc(11, -42, 3.5, 0, Math.PI * 2);
      ctx.fill();
      HW.noGlow(ctx);
    },
  };

  defs.eyes = {
    label: '暗闇の目',
    w: 90,
    h: 40,
    params: { color: '#ffe14d' },
    draw(ctx, p, t) {
      const cyc = (t + p.seed * 13) % 5;
      const open = cyc < 0.15 ? 0.1 : cyc > 4 ? 0 : 1; // 時々消える
      if (open <= 0) return;
      const col = (p.params && p.params.color) || C.yellow;
      const look = Math.sin(t * 0.7 + p.seed * 4) * 6;
      HW.glow(ctx, col, 20);
      ctx.fillStyle = col;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * 26 - 18, -20);
        ctx.quadraticCurveTo(sd * 26, -20 - 14 * open, sd * 26 + 18, -20);
        ctx.quadraticCurveTo(sd * 26, -20 + 10 * open, sd * 26 - 18, -20);
        ctx.fill();
      }
      HW.noGlow(ctx);
      ctx.fillStyle = C.black;
      ctx.fillRect(-28 + look, -20 - 8 * open, 4, 16 * open);
      ctx.fillRect(24 + look, -20 - 8 * open, 4, 16 * open);
    },
  };

  defs.moon = {
    label: '月',
    bg: true,
    w: 280,
    h: 280,
    params: { color: '#fff6c8' },
    draw(ctx, p, t) {
      const col = (p.params && p.params.color) || '#fff6c8';
      ctx.beginPath();
      ctx.arc(0, -140, 130, 0, Math.PI * 2);
      HW.glow(ctx, col, 80);
      ctx.fillStyle = col;
      ctx.fill();
      HW.noGlow(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      [
        [-40, -170, 28],
        [30, -110, 20],
        [45, -190, 14],
        [-20, -90, 12],
      ].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    },
  };

  defs.banner = {
    label: 'テキスト（看板）',
    w: 900,
    h: 160,
    params: { text: 'HAPPY HALLOWEEN', color: '#ff7a00' },
    draw(ctx, p, t) {
      const col = (p.params && p.params.color) || C.orange;
      const text = (p.params && p.params.text) || '';
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.5);
      ctx.font = '900 110px "Creepster", "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const chars = [...text];
      let total = ctx.measureText(text).width;
      let x = -total / 2;
      for (let i = 0; i < chars.length; i++) {
        const cw = ctx.measureText(chars[i]).width;
        const y = -40 + Math.sin(t * 3 + i * 0.5) * 8;
        HW.glow(ctx, col, 35 * pulse);
        ctx.fillStyle = col;
        ctx.textAlign = 'left';
        ctx.fillText(chars[i], x, y);
        HW.noGlow(ctx);
        if (HW.renderOpts.outline) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = C.white;
          ctx.strokeText(chars[i], x, y);
        }
        x += cw;
      }
    },
  };

  defs.candycorn = {
    label: 'キャンディ',
    w: 60,
    h: 80,
    draw(ctx, p, t) {
      ctx.rotate(Math.sin(t * 2 + p.seed * 5) * 0.1);
      const band = (y0, y1, col) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-40, y1, 80, y0 - y1);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(-26, -6);
        ctx.quadraticCurveTo(0, 6, 26, -6);
        ctx.lineTo(4, -76);
        ctx.quadraticCurveTo(0, -80, -4, -76);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.restore();
      };
      HW.glow(ctx, C.orange, 14);
      band(10, -28, C.yellow);
      band(-28, -54, C.orange);
      band(-54, -90, C.white);
      HW.noGlow(ctx);
    },
  };

  // ===================== 背景オブジェクト =====================
  //  stretch: true のものは「横幅」(sx) を伸縮しても絵が歪まず、横に描き足される
  const P = (p) => p.params || {};

  defs.hills = {
    label: '地面・丘',
    bg: true,
    stretch: true,
    w: 1920,
    h: 300,
    params: { fill: '#0b0418', rim: '#a24bff', wave: 40, shape: 1 },
    draw(ctx, p) {
      const W = this.w * (p.sx || 1);
      const amp = Number(P(p).wave) || 0;
      const sd = Number(P(p).shape) || 1;
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      for (let x = 0; x <= W + 1; x += 30) {
        const y = -(this.h - amp) - Math.sin(x / 300 + sd) * amp - Math.sin(x / 120 + sd * 2) * amp * 0.25;
        ctx.lineTo(-W / 2 + x, y);
      }
      ctx.lineTo(W / 2, 0);
      ctx.closePath();
      ctx.fillStyle = P(p).fill || '#0b0418';
      ctx.fill();
      if (P(p).rim && P(p).rim !== '#000000') {
        ctx.beginPath();
        for (let x = 0; x <= W + 1; x += 30) {
          const y = -(this.h - amp) - Math.sin(x / 300 + sd) * amp - Math.sin(x / 120 + sd * 2) * amp * 0.25;
          if (x === 0) ctx.moveTo(-W / 2 + x, y);
          else ctx.lineTo(-W / 2 + x, y);
        }
        HW.outline(ctx, P(p).rim, 3);
      }
    },
  };

  defs.graves = {
    label: '墓地（シルエット列）',
    bg: true,
    stretch: true,
    w: 1920,
    h: 160,
    params: { fill: '#14082a', rim: '#9a7dff', count: 9 },
    draw(ctx, p) {
      const W = this.w * (p.sx || 1);
      const n = Math.max(1, Math.round((Number(P(p).count) || 9) * (p.sx || 1)));
      const hs = HW.util.hash;
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + (i + 0.5) * (W / n) + (hs(i + 2) - 0.5) * 60;
        const h = 60 + hs(i * 2 + 2) * 60;
        const w = 40 + hs(i * 3 + 2) * 30;
        const y = -hs(i * 5 + 2) * 30;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((hs(i * 7 + 2) - 0.5) * 0.25);
        ctx.beginPath();
        if (hs(i * 11 + 2) > 0.7) {
          ctx.rect(-6, -h, 12, h);
          ctx.rect(-w / 2, -h * 0.75, w, 12);
        } else {
          ctx.moveTo(-w / 2, 0);
          ctx.lineTo(-w / 2, -h + w / 2);
          ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0);
          ctx.lineTo(w / 2, 0);
          ctx.closePath();
        }
        ctx.fillStyle = P(p).fill || '#14082a';
        ctx.fill();
        HW.outline(ctx, P(p).rim || '#9a7dff', 2);
        ctx.restore();
      }
    },
  };

  const MANSION_WINDOWS = (() => {
    const w = [];
    const add = (x, y, ww, hh) => w.push({ x, y, w: ww, h: hh });
    for (let i = 0; i < 3; i++) add(-270 + i * 50, -180, 28, 44);
    for (let i = 0; i < 3; i++) add(-90 + i * 70, -300, 34, 54);
    for (let i = 0; i < 3; i++) add(-90 + i * 70, -180, 34, 54);
    add(-18, -420, 36, 46);
    add(220, -380, 30, 50);
    add(220, -280, 30, 50);
    for (let i = 0; i < 2; i++) add(140 + i * 60, -140, 30, 46);
    return w;
  })();

  defs.mansion = {
    label: '幽霊屋敷',
    bg: true,
    w: 700,
    h: 560,
    params: { fill: '#070012', rim: '#ff2bd6', light: '#ffb020' },
    draw(ctx, p, t) {
      const pr = P(p);
      ctx.beginPath();
      const pts = [
        [-300, 0], [-300, -220], [-340, -220], [-250, -330], [-160, -220], [-120, -220], [-120, -340], [-150, -340],
        [0, -500], [150, -340], [120, -340], [120, -260], [200, -260], [200, -420], [180, -420], [240, -540],
        [300, -420], [280, -420], [280, -180], [320, -180], [320, 0],
      ];
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = pr.fill || '#070012';
      ctx.fill();
      HW.outline(ctx, pr.rim || C.magenta, 3);
      // 窓（ちらつき・時々消灯）
      const light = pr.light || '#ffb020';
      MANSION_WINDOWS.forEach((w, i) => {
        const ph = HW.util.hash(i * 3.7 + p.seed * 10) * 10;
        if (Math.sin(t * 0.13 + ph * 2) < -0.75) return;
        const f = 0.7 + 0.3 * Math.sin(t * 13 + ph) * Math.sin(t * 3.1 + ph);
        ctx.save();
        ctx.globalAlpha = 0.75 + 0.25 * f;
        HW.glow(ctx, light, 25);
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y + w.h);
        ctx.lineTo(w.x, w.y + w.w / 2);
        ctx.arc(w.x + w.w / 2, w.y + w.w / 2, w.w / 2, Math.PI, 0);
        ctx.lineTo(w.x + w.w, w.y + w.h);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = pr.fill || '#070012';
        ctx.fillRect(w.x + w.w / 2 - 2, w.y + 4, 4, w.h - 4);
        ctx.fillRect(w.x, w.y + w.h * 0.55, w.w, 4);
      });
    },
  };

  defs.castle = {
    label: '城壁（シルエット列）',
    bg: true,
    stretch: true,
    w: 1920,
    h: 510,
    params: { fill: '#000000', rim: '#ff1744' },
    draw(ctx, p) {
      const W = this.w * (p.sx || 1);
      const hs = HW.util.hash;
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      ctx.lineTo(-W / 2, -238);
      for (let x = 0; x < W; x += 80) {
        const tall = hs(x + 0.5) > 0.75;
        const top = tall ? -432 : -238;
        const X = -W / 2 + x;
        const xe = Math.min(W, x + 80) - x;
        ctx.lineTo(X, top);
        if (tall) {
          ctx.lineTo(X + xe / 2, top - 70);
          ctx.lineTo(X + xe, top);
          ctx.lineTo(X + xe, -238);
        } else {
          ctx.lineTo(X + 20, top);
          ctx.lineTo(X + 20, top - 20);
          ctx.lineTo(X + 40, top - 20);
          ctx.lineTo(X + 40, top);
          ctx.lineTo(X + xe, top);
        }
      }
      ctx.lineTo(W / 2, 0);
      ctx.closePath();
      ctx.fillStyle = P(p).fill || '#000';
      ctx.fill();
      HW.outline(ctx, P(p).rim || C.red, 3);
    },
  };

  defs.pumpkinfield = {
    label: 'かぼちゃ畑（列）',
    bg: true,
    stretch: true,
    w: 1920,
    h: 130,
    params: { vine: '#1fd13a', count: 16 },
    draw(ctx, p, t) {
      const W = this.w * (p.sx || 1);
      const hs = HW.util.hash;
      ctx.strokeStyle = P(p).vine || '#1fd13a';
      ctx.lineWidth = 3;
      const nv = Math.round(14 * (p.sx || 1));
      for (let i = 0; i < nv; i++) {
        const x = -W / 2 + hs(i * 4.4) * W;
        const y = -hs(i * 2.2) * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 1; k <= 6; k++) ctx.quadraticCurveTo(x + k * 30 - 15, y - 20 * (k % 2 ? 1 : -1), x + k * 30, y);
        ctx.stroke();
      }
      const n = Math.max(1, Math.round((Number(P(p).count) || 16) * (p.sx || 1)));
      const list = [];
      for (let i = 0; i < n; i++) list.push({ x: -W / 2 + hs(i * 5.1) * W, y: -40 - hs(i * 3.3) * 70, r: 9 + hs(i * 1.7) * 11, ph: hs(i) * 10 });
      list.sort((a, b) => a.y - b.y);
      for (const q of list) {
        const f = 0.7 + 0.3 * Math.sin(t * 9 + q.ph);
        HW.glow(ctx, C.orange, 18);
        ctx.fillStyle = C.orange;
        ctx.beginPath();
        ctx.ellipse(q.x, q.y, q.r * 1.25, q.r, 0, 0, Math.PI * 2);
        ctx.fill();
        HW.noGlow(ctx);
        ctx.fillStyle = `rgba(255,230,80,${f})`;
        ctx.beginPath();
        ctx.moveTo(q.x - q.r * 0.6, q.y - q.r * 0.1);
        ctx.lineTo(q.x - q.r * 0.3, q.y - q.r * 0.55);
        ctx.lineTo(q.x - q.r * 0.05, q.y - q.r * 0.1);
        ctx.moveTo(q.x + q.r * 0.05, q.y - q.r * 0.1);
        ctx.lineTo(q.x + q.r * 0.3, q.y - q.r * 0.55);
        ctx.lineTo(q.x + q.r * 0.6, q.y - q.r * 0.1);
        ctx.moveTo(q.x - q.r * 0.7, q.y + q.r * 0.2);
        ctx.quadraticCurveTo(q.x, q.y + q.r * 0.9, q.x + q.r * 0.7, q.y + q.r * 0.2);
        ctx.fill();
        ctx.fillStyle = '#3cff4a';
        ctx.fillRect(q.x - 3, q.y - q.r - 8, 6, 10);
      }
    },
  };

  HW.props = defs;
})();
