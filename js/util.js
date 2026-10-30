// 共通ユーティリティ / 名前空間
(function () {
  const HW = (window.HW = window.HW || {});

  // 論理座標系: 高さ 1080 固定、幅はアスペクト比から算出
  HW.LOGICAL_H = 1080;

  // プロジェクター向けハイコントラスト・パレット
  HW.C = {
    orange: '#ff7a00',
    orangeDeep: '#d94e00',
    yellow: '#ffe14d',
    purple: '#a24bff',
    purpleDeep: '#2a0050',
    green: '#5dff3a',
    white: '#ffffff',
    bone: '#f4f1e8',
    red: '#ff1744',
    cyan: '#3df2ff',
    magenta: '#ff2bd6',
    black: '#000000',
  };

  HW.util = {
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    smooth: (t) => t * t * (3 - 2 * t),
    uid: () => Math.random().toString(36).slice(2, 10),
    approach(v, target, step) {
      if (v < target) return Math.min(v + step, target);
      return Math.max(v - step, target);
    },
    overlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },
    inRect(px, py, r) {
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    },
    // 疑似乱数（エンティティごとに安定した値が欲しい時用）
    hash(n) {
      const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    },
    deepCopy: (o) => JSON.parse(JSON.stringify(o)),
  };

  // 発光（shadowBlur）ヘルパー。settings.glow が 0 なら何もしない
  HW.glow = function (ctx, color, amount) {
    const g = HW.renderOpts ? HW.renderOpts.glow : 1;
    if (!g) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = amount * g;
  };
  HW.noGlow = function (ctx) {
    ctx.shadowBlur = 0;
  };
  // 輪郭線（投影時のメリハリ用）
  HW.outline = function (ctx, color, width) {
    if (HW.renderOpts && !HW.renderOpts.outline) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  };
})();
