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
    w: 280,
    h: 400,
    draw(ctx, p, t) {
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
        ctx.fillStyle = '#140820';
        ctx.fill();
        HW.outline(ctx, C.purple, 2.5);
        if (depth > 0) {
          ctx.translate(0, -len);
          const k = HW.util.hash(depth * 13 + p.seed * 100 + len);
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
    label: '満月',
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

  HW.props = defs;
})();
