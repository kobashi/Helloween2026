// 動くキャラクター定義（FSM + 手続き描画）
//  各キャラは原点=足元中央、右向き(facing=1)で描画する
(function () {
  const HW = window.HW;
  const C = HW.C;
  const { rand, randi, pick, clamp, smooth, chance } = HW.util;

  // ---------- 共通ヘルパー ----------
  function wpick(weights) {
    let sum = 0;
    for (const k in weights) sum += Math.max(0, weights[k]);
    let r = Math.random() * sum;
    for (const k in weights) {
      r -= Math.max(0, weights[k]);
      if (r <= 0) return k;
    }
    return Object.keys(weights)[0];
  }

  function otherZone(e, w) {
    const ph = w.physics;
    const cur = ph.zoneAt(e);
    const zs = ph.zones.filter(
      (z) => (z.kind === 'any' || z.kind === e.cat) && z.travel !== false && z !== cur && z.w > e.w + 8 && z.h > e.h + 8
    );
    return zs.length ? pick(zs) : null;
  }

  function hasOtherZone(e, w) {
    return otherZone(e, w) ? 1 : 0;
  }

  function canJump(e, w, height) {
    const ph = w.physics;
    return ph.isFree(e, e.x, e.y - height) && ph.isFree(e, e.x + e.facing * (e.w * 0.5 + 12), e.y - height);
  }

  function steer(e, tx, ty, speed, accel, dt) {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const s = Math.min(speed, d * 2);
    e.vx += clamp((dx / d) * s - e.vx, -accel * dt, accel * dt);
    e.vy += clamp((dy / d) * s - e.vy, -accel * dt, accel * dt);
    return d;
  }

  function spotIn(e, w) {
    const z = w.physics.zoneAt(e) || w.physics.nearestZone(e);
    return w.physics.findFreeSpot(e, z) || { x: e.x, y: e.y };
  }

  // ---------- 共通ステート ----------
  const S = {
    // その場で振り向く
    turn(next, dur = 0.4) {
      return {
        enter(e) {
          e.facing *= -1;
          e.turnFrom = e.vx;
        },
        update(e, w, dt) {
          e.vx = e.gravity ? e.vx * Math.pow(0.001, dt) : e.vx * Math.pow(0.02, dt);
          if (!e.gravity) e.vy *= Math.pow(0.05, dt);
          if (e.stateT > dur) e.fsm.set(next);
        },
      };
    },
    // 地上キャラ：別領域へ放物線ジャンプ
    leap(next) {
      return {
        enter(e, w) {
          const z = otherZone(e, w);
          const tgt = z && w.physics.findLanding(e, z);
          if (!tgt) {
            e.leap = null;
            return;
          }
          const g = w.physics.gravity;
          const sy = e.y;
          const apex = Math.min(sy, tgt.y) - e.h * 0.5 - 120 - Math.abs(tgt.x - e.x) * 0.12;
          const vy0 = -Math.sqrt(2 * g * Math.max(10, sy - apex));
          const T = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * (tgt.y - sy))) / g;
          e.leap = { sx: e.x, sy, tx: tgt.x, ty: tgt.y, vx: (tgt.x - e.x) / T, vy0, T, g };
          e.facing = tgt.x >= e.x ? 1 : -1;
          e.prep = 0.25; // 溜め
          w.sfx(e, 'boing');
        },
        update(e, w, dt) {
          const L = e.leap;
          if (!L) return e.fsm.set(next);
          if (e.stateT < e.prep) {
            e.vx = 0;
            e.sq = 0.3 * (e.stateT / e.prep);
            return;
          }
          e.transit = true;
          e.sq = -0.2;
          const t = e.stateT - e.prep;
          if (t >= L.T) {
            e.x = L.tx;
            e.y = L.ty;
            e.vx = e.vy = 0;
            e.transit = false;
            e.onGround = true;
            e.sq = 0.4;
            w.sfx(e, 'land');
            e.fsm.set(next);
            return;
          }
          e.x = L.sx + L.vx * t;
          e.y = L.sy + L.vy0 * t + 0.5 * L.g * t * t;
          e.vx = L.vx;
          e.vy = L.vy0 + L.g * t;
          e.rot = (e.spinOnLeap ? (t / L.T) * Math.PI * 2 : 0) * e.facing;
        },
        exit(e) {
          e.transit = false;
          e.rot = 0;
        },
      };
    },
    // 空中キャラ：別領域へ曲線移動
    travel(next) {
      return {
        enter(e, w) {
          const z = otherZone(e, w);
          const tgt = z && w.physics.findFreeSpot(e, z);
          if (!tgt) {
            e.trav = null;
            return;
          }
          const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
          e.trav = {
            sx: e.x,
            sy: e.y,
            tx: tgt.x,
            ty: tgt.y,
            cx: (e.x + tgt.x) / 2,
            cy: Math.min(e.y, tgt.y) - 120 - d * 0.2,
            T: clamp(d / 380, 1.4, 5),
          };
          e.facing = tgt.x >= e.x ? 1 : -1;
          e.transit = true;
        },
        update(e, w) {
          const T = e.trav;
          if (!T) return e.fsm.set(next);
          const u = smooth(Math.min(1, e.stateT / T.T));
          const a = (1 - u) * (1 - u);
          const b = 2 * (1 - u) * u;
          const c = u * u;
          const nx = a * T.sx + b * T.cx + c * T.tx;
          const ny = a * T.sy + b * T.cy + c * T.ty;
          e.vx = (nx - e.x) * 60;
          e.vy = (ny - e.y) * 60;
          e.x = nx;
          e.y = ny;
          if (e.stateT >= T.T) {
            e.transit = false;
            e.vx = e.vy = 0;
            e.fsm.set(next);
          }
        },
        exit(e) {
          e.transit = false;
        },
      };
    },
  };

  // 地上キャラが壁/障害物に当たった時：跳べるならジャンプ、無理なら振り向き
  function wallReact(e, w, jumpState, height) {
    if (e.hitWall && e.hitWall === e.facing && e.onGround) {
      if (jumpState && canJump(e, w, height) && chance(0.75)) e.fsm.set(jumpState);
      else e.fsm.set('turn');
      return true;
    }
    return false;
  }

  const defs = {};

  // =====================================================================
  // おばけ（浮遊）
  // =====================================================================
  defs.ghost = {
    label: 'おばけ',
    cat: 'air',
    gravity: false,
    w: 140,
    h: 170,
    box: [0.8, 0.85],
    initial: 'drift',
    states: {
      drift: {
        enter(e, w) {
          e.target = spotIn(e, w);
          e.stateDur = rand(3, 6);
        },
        update(e, w, dt) {
          const d = steer(e, e.target.x, e.target.y, 120 * e.speed, 200, dt);
          if (d < 20 || e.hitWall || e.hitCeil || e.hitFloor) e.target = spotIn(e, w);
          if (Math.abs(e.vx) > 15) e.facing = Math.sign(e.vx);
          if (e.stateT > e.stateDur)
            e.fsm.set(wpick({ drift: 2, boo: 2, fade: 1.5, travel: 1.5 * hasOtherZone(e, w) }));
        },
      },
      boo: {
        enter(e, w) {
          w.sfx(e, 'boo');
        },
        update(e, w, dt) {
          e.vx *= Math.pow(0.02, dt);
          e.vy *= Math.pow(0.02, dt);
          if (e.stateT > 1.5) e.fsm.set('drift');
        },
      },
      fade: {
        update(e, w, dt) {
          const t = e.stateT;
          e.alpha = t < 1 ? 1 - 0.85 * t : t < 1.8 ? 0.15 : Math.min(1, 0.15 + 0.85 * (t - 1.8));
          e.vx *= Math.pow(0.3, dt);
          e.vy *= Math.pow(0.3, dt);
          if (t > 2.8) {
            e.alpha = 1;
            e.fsm.set('drift');
          }
        },
        exit(e) {
          e.alpha = 1;
        },
      },
      travel: S.travel('boo'),
    },
    draw(ctx, e, t) {
      const st = e.fsm.name;
      const bob = Math.sin(t * 2.2 + e.seed * 6) * 8;
      ctx.translate(0, bob - 6);
      ctx.rotate(clamp(Math.abs(e.vx) / 700, 0, 0.2));
      let s = 1;
      if (st === 'boo') s = 1 + 0.3 * Math.sin(Math.min(e.stateT, 1.4) / 1.4 * Math.PI);
      ctx.scale(s, s);
      ctx.globalAlpha *= e.alpha;
      // 体
      ctx.beginPath();
      ctx.moveTo(-60, -100);
      ctx.arc(0, -100, 60, Math.PI, 0);
      ctx.lineTo(60, -18);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x0 = 60 - (120 / n) * i;
        const x1 = x0 - 120 / n;
        const amp = 14 * Math.sin(t * 6 + i * 1.3);
        ctx.quadraticCurveTo((x0 + x1) / 2, -18 + amp, x1, -18);
      }
      ctx.closePath();
      HW.glow(ctx, C.cyan, 35);
      ctx.fillStyle = C.white;
      ctx.fill();
      HW.noGlow(ctx);
      HW.outline(ctx, '#9ffcff', 3);
      // 腕
      const arm = st === 'boo' ? -30 : Math.sin(t * 3) * 6;
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.ellipse(-62, -78 + arm * 0.5, 14, 9, -0.6 + arm * 0.02, 0, Math.PI * 2);
      ctx.ellipse(62, -78 + arm * 0.5, 14, 9, 0.6 - arm * 0.02, 0, Math.PI * 2);
      ctx.fill();
      // 顔
      ctx.fillStyle = C.black;
      const big = st === 'boo' ? 1.35 : 1;
      ctx.beginPath();
      ctx.ellipse(-16, -112, 9 * big, 14 * big, 0, 0, Math.PI * 2);
      ctx.ellipse(24, -112, 9 * big, 14 * big, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, -78, st === 'boo' ? 16 : 9, st === 'boo' ? 22 : 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,90,200,0.75)';
      ctx.beginPath();
      ctx.arc(-34, -90, 7, 0, Math.PI * 2);
      ctx.arc(42, -90, 7, 0, Math.PI * 2);
      ctx.fill();
    },
  };

  // =====================================================================
  // コウモリ（飛行）
  // =====================================================================
  defs.bat = {
    label: 'コウモリ',
    cat: 'air',
    gravity: false,
    w: 130,
    h: 80,
    box: [0.7, 0.8],
    initial: 'flutter',
    states: {
      flutter: {
        enter(e, w) {
          e.target = spotIn(e, w);
          e.stateDur = rand(3, 6);
          e.retarget = rand(0.5, 1.2);
          e.hanging = false;
        },
        update(e, w, dt) {
          e.retarget -= dt;
          const d = steer(e, e.target.x, e.target.y, 280 * e.speed, 900, dt);
          e.vx += rand(-1, 1) * 900 * dt;
          e.vy += rand(-1, 1) * 900 * dt;
          if (d < 25 || e.retarget < 0 || e.hitWall || e.hitCeil || e.hitFloor) {
            e.target = spotIn(e, w);
            e.retarget = rand(0.5, 1.2);
          }
          if (Math.abs(e.vx) > 30) e.facing = Math.sign(e.vx);
          if (chance(dt * 0.4)) w.sfx(e, 'squeak', { gain: 0.6 });
          if (e.stateT > e.stateDur)
            e.fsm.set(wpick({ flutter: 2, swoop: 2, hang: 1.2, travel: 1.2 * hasOtherZone(e, w) }));
        },
      },
      swoop: {
        enter(e, w) {
          e.vx = e.facing * 460 * e.speed;
          e.vy = 520;
          w.sfx(e, 'squeak');
        },
        update(e, w, dt) {
          e.vy -= 1500 * dt;
          if (e.hitFloor) e.vy = -Math.abs(e.vy);
          if (e.hitWall) {
            e.facing *= -1;
            e.vx = e.facing * Math.abs(e.vx);
          }
          if (e.stateT > 1.1) e.fsm.set('flutter');
        },
      },
      hang: {
        enter(e) {
          e.hanging = false;
          e.vx = 0;
        },
        update(e, w, dt) {
          if (!e.hanging) {
            e.vy = -320;
            e.vx *= Math.pow(0.05, dt);
            if (e.hitCeil) {
              e.hanging = true;
              e.stateT = 0;
              e.stateDur = rand(2, 4);
            } else if (e.stateT > 2.5) e.fsm.set('flutter');
          } else {
            e.vx = 0;
            e.vy = -10;
            if (e.stateT > e.stateDur) {
              e.vy = 200;
              w.sfx(e, 'squeak');
              e.fsm.set('flutter');
            }
          }
        },
        exit(e) {
          e.hanging = false;
        },
      },
      travel: S.travel('flutter'),
    },
    draw(ctx, e, t) {
      const hang = e.fsm.name === 'hang' && e.hanging;
      ctx.translate(0, -40);
      if (hang) ctx.rotate(Math.PI + Math.sin(t * 2) * 0.08);
      const flap = hang ? -0.6 : Math.sin(t * 20 + e.seed * 10);
      // 翼
      ctx.fillStyle = '#2a0050';
      for (const sd of [-1, 1]) {
        const tipY = -18 - 34 * flap;
        const span = hang ? 26 : 66;
        ctx.beginPath();
        ctx.moveTo(sd * 10, -10);
        ctx.quadraticCurveTo(sd * span * 0.5, tipY - 18, sd * span, tipY);
        ctx.quadraticCurveTo(sd * span * 0.82, tipY * 0.3 + 12, sd * span * 0.66, 8 + tipY * 0.2);
        ctx.quadraticCurveTo(sd * span * 0.5, tipY * 0.2 + 2, sd * span * 0.36, 12);
        ctx.quadraticCurveTo(sd * span * 0.22, 4, sd * 10, 10);
        ctx.closePath();
        HW.glow(ctx, C.purple, 18);
        ctx.fill();
        HW.noGlow(ctx);
        HW.outline(ctx, '#c77dff', 3);
      }
      // 体
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3a0070';
      ctx.fill();
      HW.outline(ctx, '#d9a0ff', 3);
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.lineTo(-9, -32);
      ctx.lineTo(-2, -18);
      ctx.moveTo(12, -14);
      ctx.lineTo(9, -32);
      ctx.lineTo(2, -18);
      ctx.fillStyle = '#3a0070';
      ctx.fill();
      HW.outline(ctx, '#d9a0ff', 2);
      // 目と牙
      HW.glow(ctx, C.red, 14);
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.arc(-5, -6, 4, 0, Math.PI * 2);
      ctx.arc(8, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      HW.noGlow(ctx);
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.moveTo(-3, 6);
      ctx.lineTo(-1, 12);
      ctx.lineTo(1, 6);
      ctx.moveTo(4, 6);
      ctx.lineTo(6, 12);
      ctx.lineTo(8, 6);
      ctx.fill();
    },
  };

  // =====================================================================
  // 黒猫（地上）
  // =====================================================================
  defs.cat = {
    label: '黒猫',
    cat: 'ground',
    gravity: true,
    w: 160,
    h: 110,
    box: [0.75, 0.8],
    initial: 'sit',
    states: {
      sit: {
        enter(e, w) {
          e.stateDur = rand(1.5, 4);
          if (chance(0.4)) w.sfx(e, 'meow');
        },
        update(e, w, dt) {
          e.vx = 0;
          if (e.stateT > e.stateDur)
            e.fsm.set(wpick({ walk: 3, run: 1, hiss: 0.5, turn: 0.6, leap: 1.2 * hasOtherZone(e, w) }));
        },
      },
      walk: {
        enter(e) {
          e.stateDur = rand(2, 5);
        },
        update(e, w) {
          if (e.onGround) e.vx = e.facing * 110 * e.speed;
          if (wallReact(e, w, 'jump', 150)) return;
          if (e.stateT > e.stateDur) e.fsm.set(wpick({ sit: 2, walk: 1, run: 1, turn: 1 }));
        },
      },
      run: {
        enter(e) {
          e.stateDur = rand(1, 2.5);
        },
        update(e, w) {
          if (e.onGround) e.vx = e.facing * 330 * e.speed;
          if (wallReact(e, w, 'jump', 150)) return;
          if (e.stateT > e.stateDur) e.fsm.set(wpick({ walk: 1, sit: 1, leap: 0.6 * hasOtherZone(e, w) }));
        },
      },
      jump: {
        enter(e, w) {
          e.vy = -950;
          e.vx = e.facing * 220 * e.speed;
          e.sq = -0.25;
          w.sfx(e, 'boing', { gain: 0.4 });
        },
        update(e) {
          if (e.stateT > 0.1 && e.onGround) e.fsm.set('walk');
          if (e.hitWall) e.vx = 0;
        },
      },
      hiss: {
        enter(e, w) {
          e.vx = 0;
          w.sfx(e, 'hiss');
        },
        update(e) {
          if (e.stateT > 1.2) {
            e.facing *= -1;
            e.fsm.set('run');
          }
        },
      },
      turn: S.turn('walk'),
      leap: S.leap('sit'),
    },
    draw(ctx, e, t) {
      const st = e.fsm.name;
      const sit = st === 'sit';
      const hiss = st === 'hiss';
      const air = !e.onGround && !sit;
      const ph = e.walkPh;
      const BODY = '#1d0033';
      const OL = '#ff8c1a';
      const sq = e.sq || 0;
      ctx.scale(1 + sq * 0.4, 1 - sq * 0.4);
      // 尻尾
      ctx.beginPath();
      const tw = Math.sin(t * (sit ? 2 : 5)) * 18;
      if (sit) {
        ctx.moveTo(-25, -10);
        ctx.quadraticCurveTo(-70, -5, -62 + tw * 0.4, -55);
      } else {
        ctx.moveTo(-52, -55);
        ctx.quadraticCurveTo(-95, -60 + (hiss ? -50 : 0), -92 + tw * 0.3, -100 + tw);
      }
      ctx.strokeStyle = OL;
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      if (HW.renderOpts.outline) ctx.stroke();
      ctx.strokeStyle = BODY;
      ctx.lineWidth = 8;
      ctx.stroke();
      // 脚
      if (!sit) {
        const legs = [
          [-40, 0],
          [-26, Math.PI],
          [26, Math.PI * 0.5],
          [40, Math.PI * 1.5],
        ];
        for (const [lx, off] of legs) {
          const sw = air ? (lx < 0 ? -18 : 18) : Math.sin(ph + off) * 14;
          const lift = air ? -12 : Math.max(0, Math.cos(ph + off)) * -8;
          ctx.beginPath();
          ctx.moveTo(lx, hiss ? -45 : -40);
          ctx.lineTo(lx + sw, lift);
          ctx.strokeStyle = OL;
          ctx.lineWidth = 14;
          if (HW.renderOpts.outline) ctx.stroke();
          ctx.strokeStyle = BODY;
          ctx.lineWidth = 9;
          ctx.stroke();
        }
      }
      // 胴体
      ctx.beginPath();
      if (sit) ctx.ellipse(-5, -42, 34, 42, 0, 0, Math.PI * 2);
      else if (hiss) {
        ctx.moveTo(-55, -45);
        ctx.quadraticCurveTo(-5, -125, 52, -45);
        ctx.quadraticCurveTo(0, -30, -55, -45);
      } else ctx.ellipse(-5, -52, 56, 26, 0, 0, Math.PI * 2);
      ctx.fillStyle = BODY;
      ctx.fill();
      HW.outline(ctx, OL, 4);
      if (hiss) {
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (i / 8) * Math.PI;
          const bx = -2 + Math.cos(a) * 48;
          const by = -60 + Math.sin(a) * 38;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(a) * 14, by + Math.sin(a) * 14);
        }
        ctx.strokeStyle = OL;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // 頭
      const hx = sit ? 18 : hiss ? 58 : 55;
      const hy = sit ? -92 : hiss ? -50 : -74;
      ctx.beginPath();
      ctx.moveTo(hx - 20, hy - 12);
      ctx.lineTo(hx - 16, hy - 40);
      ctx.lineTo(hx - 3, hy - 22);
      ctx.lineTo(hx + 8, hy - 24);
      ctx.lineTo(hx + 19, hy - 40);
      ctx.lineTo(hx + 22, hy - 10);
      ctx.closePath();
      ctx.fillStyle = BODY;
      ctx.fill();
      HW.outline(ctx, OL, 4);
      ctx.beginPath();
      ctx.arc(hx, hy, 25, 0, Math.PI * 2);
      ctx.fillStyle = BODY;
      ctx.fill();
      HW.outline(ctx, OL, 4);
      // 目（瞬き付き）
      const blink = (t + e.seed * 7) % 4 < 0.15 ? 0.15 : 1;
      HW.glow(ctx, C.green, 16);
      ctx.fillStyle = C.green;
      ctx.beginPath();
      ctx.ellipse(hx - 5, hy - 4, 6, 8 * blink, 0, 0, Math.PI * 2);
      ctx.ellipse(hx + 13, hy - 4, 6, 8 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      HW.noGlow(ctx);
      ctx.fillStyle = C.black;
      ctx.fillRect(hx - 6.5, hy - 10 * blink, 3, 14 * blink);
      ctx.fillRect(hx + 11.5, hy - 10 * blink, 3, 14 * blink);
      // 鼻・ひげ
      ctx.fillStyle = '#ff7ad9';
      ctx.beginPath();
      ctx.arc(hx + 6, hy + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx + 10, hy + 8);
      ctx.lineTo(hx + 36, hy + 4);
      ctx.moveTo(hx + 10, hy + 10);
      ctx.lineTo(hx + 35, hy + 13);
      ctx.moveTo(hx + 2, hy + 8);
      ctx.lineTo(hx - 22, hy + 4);
      ctx.stroke();
    },
  };

  // =====================================================================
  // ジャック・オ・ランタン（跳ねる）
  // =====================================================================
  defs.jack = {
    label: 'ジャック（かぼちゃ）',
    cat: 'ground',
    gravity: true,
    w: 120,
    h: 110,
    box: [0.85, 0.9],
    initial: 'idle',
    init(e) {
      e.spinOnLeap = true;
    },
    states: {
      idle: {
        enter(e) {
          e.stateDur = rand(1, 2.5);
        },
        update(e, w) {
          e.vx = 0;
          if (e.stateT > e.stateDur)
            e.fsm.set(wpick({ hop: 4, bigjump: 1, turn: 1, leap: 1.4 * hasOtherZone(e, w) }));
        },
      },
      hop: {
        enter(e) {
          e.hops = randi(3, 6);
        },
        update(e, w) {
          if (e.onGround && e.stateT > 0.05) {
            if (e.hitWall === e.facing || !w.physics.isFree(e, e.x + e.facing * 20, e.y - 2)) {
              if (canJump(e, w, 230)) {
                e.fsm.set('bigjump');
                return;
              }
              e.fsm.set('turn');
              return;
            }
            if (e.hops-- <= 0) {
              e.fsm.set('idle');
              return;
            }
            e.vy = -640;
            e.vx = e.facing * 180 * e.speed;
            e.sq = -0.3;
            e.stateT = 0.0;
            w.sfx(e, 'boing', { gain: 0.45, cooldown: 0.1 });
          }
        },
      },
      bigjump: {
        enter(e, w) {
          e.vy = -1250;
          e.vx = e.facing * 160 * e.speed;
          e.sq = -0.4;
          w.sfx(e, 'boing');
        },
        update(e) {
          e.rot = Math.min(1, e.stateT / 0.9) * Math.PI * 2 * e.facing;
          if (e.stateT > 0.1 && e.onGround) {
            e.rot = 0;
            e.fsm.set('idle');
          }
        },
        exit(e) {
          e.rot = 0;
        },
      },
      turn: S.turn('hop', 0.35),
      leap: S.leap('idle'),
    },
    draw(ctx, e, t) {
      const sq = e.sq || 0;
      const wob = e.fsm.name === 'idle' ? Math.sin(t * 5) * 0.06 : 0;
      ctx.scale(1 + sq * 0.6, 1 - sq * 0.6);
      ctx.translate(0, -52);
      ctx.rotate((e.rot || 0) + wob);
      ctx.translate(0, 52);
      // 本体
      ctx.beginPath();
      ctx.ellipse(0, -52, 58, 50, 0, 0, Math.PI * 2);
      HW.glow(ctx, C.orange, 30);
      ctx.fillStyle = C.orange;
      ctx.fill();
      HW.noGlow(ctx);
      HW.outline(ctx, '#ffb366', 3);
      ctx.strokeStyle = C.orangeDeep;
      ctx.lineWidth = 4;
      for (const rx of [-30, 0, 30]) {
        ctx.beginPath();
        ctx.ellipse(rx * 0.7, -52, 22, 48, 0, -Math.PI / 2, Math.PI / 2, rx < 0);
        ctx.stroke();
      }
      // ヘタ
      ctx.fillStyle = '#3cff4a';
      ctx.beginPath();
      ctx.moveTo(-6, -98);
      ctx.quadraticCurveTo(-4, -116, 8, -120);
      ctx.lineTo(10, -114);
      ctx.quadraticCurveTo(4, -110, 6, -98);
      ctx.fill();
      // 顔（ゆらぐ炎の光）
      const fl = 0.7 + 0.3 * Math.sin(t * 23 + e.seed * 9) * Math.sin(t * 7);
      ctx.fillStyle = `rgba(255,${200 + 40 * fl | 0},40,1)`;
      HW.glow(ctx, C.yellow, 25 * fl);
      ctx.beginPath();
      ctx.moveTo(-28, -60);
      ctx.lineTo(-14, -82);
      ctx.lineTo(-2, -60);
      ctx.moveTo(10, -60);
      ctx.lineTo(24, -82);
      ctx.lineTo(36, -60);
      ctx.moveTo(-34, -40);
      ctx.lineTo(-22, -42);
      ctx.lineTo(-16, -32);
      ctx.lineTo(-6, -42);
      ctx.lineTo(6, -42);
      ctx.lineTo(14, -32);
      ctx.lineTo(22, -42);
      ctx.lineTo(40, -40);
      ctx.quadraticCurveTo(6, -6, -34, -40);
      ctx.fill();
      HW.noGlow(ctx);
    },
  };

  // =====================================================================
  // ガイコツ（地上）
  // =====================================================================
  defs.skeleton = {
    label: 'ガイコツ',
    cat: 'ground',
    gravity: true,
    w: 110,
    h: 220,
    box: [0.6, 0.95],
    initial: 'idle',
    init(e) {
      e.rnd = Array.from({ length: 8 }, () => Math.random());
      e.collapse = 0;
    },
    states: {
      idle: {
        enter(e) {
          e.stateDur = rand(0.8, 2);
        },
        update(e, w) {
          e.vx = 0;
          if (e.stateT > e.stateDur)
            e.fsm.set(wpick({ walk: 4, dance: 1.5, collapse: 0.8, turn: 0.6, leap: 1 * hasOtherZone(e, w) }));
        },
      },
      walk: {
        enter(e) {
          e.stateDur = rand(3, 6);
        },
        update(e, w) {
          if (e.onGround) e.vx = e.facing * 85 * e.speed;
          if (wallReact(e, w, 'jump', 130)) return;
          if (e.stateT > e.stateDur) e.fsm.set(wpick({ idle: 2, dance: 1, walk: 1 }));
        },
      },
      dance: {
        enter(e, w) {
          e.stateDur = rand(2, 3.2);
          w.sfx(e, 'rattle');
        },
        update(e, w) {
          e.vx = 0;
          if (e.stateT > 1.2 && e.stateT - 0.016 < 1.2) w.sfx(e, 'rattle');
          if (e.stateT > e.stateDur) e.fsm.set('walk');
        },
      },
      collapse: {
        enter(e, w) {
          e.vx = 0;
          e.rnd = e.rnd.map(() => Math.random());
          w.sfx(e, 'rattle');
          e.rose = false;
        },
        update(e, w) {
          const t = e.stateT;
          e.vx = 0;
          e.collapse = t < 0.45 ? smooth(t / 0.45) : t < 1.8 ? 1 : 1 - smooth(Math.min(1, (t - 1.8) / 0.8));
          if (t > 1.8 && !e.rose) {
            e.rose = true;
            w.sfx(e, 'rattle');
          }
          if (t > 2.7) {
            e.collapse = 0;
            e.fsm.set('dance');
          }
        },
        exit(e) {
          e.collapse = 0;
        },
      },
      jump: {
        enter(e, w) {
          e.vy = -850;
          e.vx = e.facing * 150 * e.speed;
          w.sfx(e, 'rattle', { gain: 0.6 });
        },
        update(e) {
          if (e.stateT > 0.1 && e.onGround) e.fsm.set('walk');
        },
      },
      turn: S.turn('walk', 0.5),
      leap: S.leap('dance'),
    },
    draw(ctx, e, t) {
      const st = e.fsm.name;
      const c = e.collapse || 0;
      const dance = st === 'dance';
      const ph = e.walkPh;
      const air = !e.onGround;
      const r = e.rnd;
      const part = (i, baseY, fn) => {
        ctx.save();
        if (c > 0) {
          ctx.translate((r[i] - 0.5) * 90 * c, -baseY * c * 0.92);
          ctx.translate(0, baseY);
          ctx.rotate((r[i] - 0.5) * 3.5 * c);
          ctx.translate(0, -baseY);
        }
        fn();
        ctx.restore();
      };
      const bob = dance ? Math.abs(Math.sin(t * 8)) * -10 : 0;
      ctx.translate(0, bob);
      ctx.strokeStyle = C.bone;
      ctx.fillStyle = C.bone;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      HW.glow(ctx, '#b8fbff', 14);
      ctx.lineWidth = 8;
      // 脚
      const legSw = dance ? Math.sin(t * 8) * 0.5 : air ? 0.4 : Math.sin(ph) * 0.45;
      for (const [i, sd] of [
        [0, 1],
        [1, -1],
      ]) {
        part(i, 50, () => {
          const a = legSw * sd;
          const kx = Math.sin(a) * 50 + sd * 8;
          const ky = -100 + Math.cos(a) * 50;
          const fx = kx + Math.sin(a * 0.4) * 50;
          const fy = Math.min(0, ky + 50);
          ctx.beginPath();
          ctx.moveTo(sd * 10, -100);
          ctx.lineTo(kx, ky);
          ctx.lineTo(fx, fy);
          ctx.lineTo(fx + 16, fy);
          ctx.stroke();
        });
      }
      // 骨盤・背骨・肋骨
      part(2, 110, () => {
        ctx.beginPath();
        ctx.ellipse(0, -104, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      part(3, 140, () => {
        ctx.beginPath();
        ctx.moveTo(0, -110);
        ctx.lineTo(0, -172);
        ctx.stroke();
        ctx.lineWidth = 6;
        for (let k = 0; k < 4; k++) {
          const y = -162 + k * 12;
          const wd = 28 - k * 3;
          ctx.beginPath();
          ctx.moveTo(-wd, y + 6);
          ctx.quadraticCurveTo(0, y - 10, wd, y + 6);
          ctx.stroke();
        }
      });
      // 腕
      ctx.lineWidth = 7;
      for (const [i, sd] of [
        [4, 1],
        [5, -1],
      ]) {
        part(i, 140, () => {
          let a1;
          let a2;
          if (dance) {
            a1 = -2.2 + Math.sin(t * 8 + sd) * 0.6;
            a2 = Math.sin(t * 10 + sd * 2) * 0.9;
          } else {
            a1 = -0.15 + Math.sin(ph + (sd > 0 ? Math.PI : 0)) * 0.4;
            a2 = 0.3;
          }
          const ex = sd * 26 + Math.sin(a1) * 34 * sd * (dance ? -1 : 1);
          const ey = -168 + Math.cos(a1) * 34;
          const hx = ex + Math.sin(a1 + a2) * 32 * sd * (dance ? -1 : 1);
          const hy = ey + Math.cos(a1 + a2) * 32;
          ctx.beginPath();
          ctx.moveTo(sd * 24, -168);
          ctx.lineTo(ex, ey);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(hx, hy, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // 頭蓋骨
      part(6, 190, () => {
        const tilt = dance ? Math.sin(t * 8) * 0.25 : 0;
        ctx.translate(0, -195);
        ctx.rotate(tilt);
        ctx.beginPath();
        ctx.arc(0, -4, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-12, 10, 24, 12);
        HW.noGlow(ctx);
        ctx.fillStyle = C.black;
        ctx.beginPath();
        ctx.ellipse(-4, -6, 7, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(13, -6, 7, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 2);
        ctx.lineTo(1, 9);
        ctx.lineTo(7, 9);
        ctx.fill();
        ctx.strokeStyle = C.black;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = -8; k <= 8; k += 4) {
          ctx.moveTo(k, 12);
          ctx.lineTo(k, 21);
        }
        ctx.stroke();
        // 目の奥の光
        HW.glow(ctx, C.red, 10);
        ctx.fillStyle = C.red;
        ctx.beginPath();
        ctx.arc(-3, -5, 2.2, 0, Math.PI * 2);
        ctx.arc(14, -5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      HW.noGlow(ctx);
    },
  };

  // =====================================================================
  // 魔女（ほうきで飛行）
  // =====================================================================
  defs.witch = {
    label: '魔女',
    cat: 'air',
    gravity: false,
    w: 220,
    h: 170,
    box: [0.8, 0.75],
    initial: 'cruise',
    states: {
      cruise: {
        enter(e) {
          e.stateDur = rand(4, 7);
        },
        update(e, w, dt) {
          e.vx += (e.facing * 300 * e.speed - e.vx) * Math.min(1, dt * 2);
          e.vy = Math.sin(e.t * 2 + e.seed * 5) * 70;
          if (e.hitWall && e.hitWall === e.facing) return e.fsm.set('turn');
          if (chance(dt * 30)) w.particle(e.x - e.facing * e.w * 0.55, e.y - e.h * 0.25, 'spark');
          if (e.stateT > e.stateDur)
            e.fsm.set(wpick({ cruise: 1.5, loop: 1.5, cackle: 1.5, travel: 1.4 * hasOtherZone(e, w) }));
        },
      },
      loop: {
        enter(e, w) {
          e.loopT = 1.7;
          w.sfx(e, 'sparkle');
        },
        update(e, w, dt) {
          const th = (Math.min(e.stateT, e.loopT) / e.loopT) * Math.PI * 2;
          const v = (2 * Math.PI * 100) / e.loopT;
          e.vx = e.facing * Math.cos(th) * v;
          e.vy = -Math.sin(th) * v;
          e.rot = -th;
          if (chance(dt * 40)) w.particle(e.x, e.y - e.h * 0.3, 'spark');
          if (e.stateT > e.loopT) {
            e.rot = 0;
            e.fsm.set('cruise');
          }
        },
        exit(e) {
          e.rot = 0;
        },
      },
      cackle: {
        enter(e, w) {
          w.sfx(e, 'cackle');
          for (let i = 0; i < 14; i++) w.particle(e.x, e.y - e.h * 0.6, 'spark');
        },
        update(e, w, dt) {
          e.vx *= Math.pow(0.05, dt);
          e.vy = Math.sin(e.t * 3) * 40;
          if (e.stateT > 1.6) e.fsm.set('cruise');
        },
      },
      turn: S.turn('cruise', 0.6),
      travel: S.travel('cackle'),
    },
    draw(ctx, e, t) {
      const st = e.fsm.name;
      ctx.translate(0, -60);
      ctx.rotate((e.rot || 0) + clamp(e.vy / 900, -0.25, 0.25));
      ctx.translate(0, 60);
      // ほうき
      ctx.strokeStyle = '#d98a3a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-90, -46);
      ctx.lineTo(100, -56);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-86, -46);
      ctx.lineTo(-145, -20 + Math.sin(t * 9) * 4);
      ctx.lineTo(-150, -48);
      ctx.lineTo(-145, -75 + Math.sin(t * 9 + 1) * 4);
      ctx.closePath();
      HW.glow(ctx, C.orange, 18);
      ctx.fillStyle = '#ffb300';
      ctx.fill();
      HW.noGlow(ctx);
      HW.outline(ctx, C.orange, 3);
      // マント
      ctx.beginPath();
      ctx.moveTo(-2, -108);
      ctx.quadraticCurveTo(-60, -110 + Math.sin(t * 7) * 10, -95, -78 + Math.sin(t * 8) * 14);
      ctx.quadraticCurveTo(-55, -70, -15, -55);
      ctx.closePath();
      ctx.fillStyle = '#5a00b0';
      ctx.fill();
      HW.outline(ctx, C.magenta, 3);
      // 脚（しましま）
      ctx.lineWidth = 8;
      ctx.strokeStyle = C.orange;
      ctx.beginPath();
      ctx.moveTo(8, -54);
      ctx.lineTo(40, -32);
      ctx.stroke();
      ctx.fillStyle = C.magenta;
      ctx.beginPath();
      ctx.ellipse(46, -30, 11, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // ドレス
      ctx.beginPath();
      ctx.moveTo(-28, -50);
      ctx.lineTo(28, -52);
      ctx.lineTo(10, -112);
      ctx.lineTo(-12, -110);
      ctx.closePath();
      ctx.fillStyle = '#8a2be2';
      HW.glow(ctx, C.purple, 18);
      ctx.fill();
      HW.noGlow(ctx);
      HW.outline(ctx, '#e6b8ff', 3);
      // 腕
      ctx.strokeStyle = '#8a2be2';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(2, -100);
      ctx.lineTo(36, -60);
      ctx.stroke();
      ctx.fillStyle = C.green;
      ctx.beginPath();
      ctx.arc(38, -58, 6, 0, Math.PI * 2);
      ctx.fill();
      // 髪
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 4;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(-6, -126 + k * 3);
        ctx.quadraticCurveTo(-30, -120 + k * 6, -38 + Math.sin(t * 8 + k) * 6, -100 + k * 6);
        ctx.stroke();
      }
      // 顔
      ctx.beginPath();
      ctx.arc(6, -122, 15, 0, Math.PI * 2);
      ctx.fillStyle = C.green;
      HW.glow(ctx, C.green, 14);
      ctx.fill();
      HW.noGlow(ctx);
      ctx.beginPath();
      ctx.moveTo(18, -124);
      ctx.lineTo(32, -114);
      ctx.lineTo(18, -116);
      ctx.fill();
      ctx.fillStyle = C.black;
      ctx.beginPath();
      ctx.arc(11, -126, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (st === 'cackle') {
        ctx.beginPath();
        ctx.ellipse(10, -112, 5, 3 + Math.abs(Math.sin(t * 20)) * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // 帽子
      ctx.fillStyle = '#4b0090';
      ctx.beginPath();
      ctx.ellipse(4, -135, 34, 7, -0.08, 0, Math.PI * 2);
      ctx.fill();
      HW.outline(ctx, C.magenta, 2.5);
      ctx.beginPath();
      ctx.moveTo(-16, -137);
      ctx.lineTo(22, -139);
      ctx.quadraticCurveTo(4, -170, -28 + Math.sin(t * 4) * 3, -196);
      ctx.quadraticCurveTo(-14, -168, -16, -137);
      ctx.fill();
      HW.outline(ctx, C.magenta, 2.5);
      ctx.fillStyle = C.orange;
      ctx.beginPath();
      ctx.moveTo(-16, -138);
      ctx.lineTo(21, -140);
      ctx.lineTo(18, -148);
      ctx.lineTo(-14, -146);
      ctx.fill();
    },
  };

  // =====================================================================
  // クモ（糸でぶら下がる）
  // =====================================================================
  defs.spider = {
    label: 'クモ',
    cat: 'air',
    gravity: false,
    w: 90,
    h: 80,
    box: [0.7, 0.8],
    initial: 'hang',
    init(e, w) {
      e.anchorY = null;
      e.threadOn = true;
    },
    states: {
      hang: {
        enter(e, w) {
          e.vx = e.vy = 0;
          e.stateDur = rand(1.5, 3.5);
          if (e.anchorY === null) {
            const z = w.physics.zoneAt(e) || w.physics.nearestZone(e);
            e.anchorY = z ? z.y : 0;
          }
          e.threadOn = true;
        },
        update(e, w) {
          e.vx = 0;
          e.vy = 0;
          if (e.stateT > e.stateDur) {
            const short = e.y - e.h - e.anchorY < 30;
            e.fsm.set(
              wpick({ drop: short ? 3 : 1.5, climb: short ? 0 : 2, scuttle: short ? 2 : 0, travel: (short ? 1 : 0) * hasOtherZone(e, w) })
            );
          }
        },
      },
      drop: {
        enter(e, w) {
          e.maxLen = rand(150, 600);
          w.sfx(e, 'drop');
        },
        update(e, w) {
          e.vy = 520 * e.speed;
          if (e.hitFloor || e.y - e.anchorY > e.maxLen) {
            e.vy = 0;
            e.fsm.set('hang');
          }
        },
      },
      climb: {
        update(e) {
          e.vy = -110 * e.speed;
          if (e.hitCeil || e.y - e.h - e.anchorY < 12) {
            e.vy = 0;
            e.fsm.set(wpick({ hang: 1, scuttle: 1 }));
          }
        },
      },
      scuttle: {
        enter(e) {
          e.stateDur = rand(1.2, 3);
          if (chance(0.5)) e.facing *= -1;
        },
        update(e) {
          e.vx = e.facing * 140 * e.speed;
          e.vy = 0;
          if (e.hitWall) e.facing *= -1;
          if (e.stateT > e.stateDur) {
            e.vx = 0;
            e.fsm.set('hang');
          }
        },
      },
      travel: {
        enter(e, w) {
          e.threadOn = false;
          S.travel('hang').enter(e, w);
        },
        update(e, w, dt) {
          if (!e.trav) return e.fsm.set('hang');
          S._travelUpdate(e, w, dt);
          if (!e.transit) {
            const z = w.physics.zoneAt(e) || w.physics.nearestZone(e);
            e.anchorY = z ? z.y : 0;
            e.y = Math.max(e.y, e.anchorY + e.h + 2);
            e.fsm.set('hang');
          }
        },
        exit(e) {
          e.transit = false;
          e.threadOn = true;
        },
      },
    },
    drawWorld(ctx, e) {
      // 糸（ワールド座標）
      if (!e.threadOn || e.anchorY === null) return;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x, e.anchorY);
      ctx.lineTo(e.x, e.y - e.dh * 0.7);
      ctx.stroke();
    },
    draw(ctx, e, t) {
      const moving = Math.abs(e.vx) + Math.abs(e.vy) > 5;
      const sw = e.fsm.name === 'hang' ? Math.sin(t * 1.5 + e.seed * 4) * 0.08 : 0;
      ctx.translate(0, -80);
      ctx.rotate(sw);
      ctx.translate(0, 80);
      ctx.strokeStyle = '#e0a0ff';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const wig = Math.sin(t * (moving ? 16 : 3) + i * 1.7 + (sd > 0 ? 1 : 0)) * (moving ? 6 : 2);
          const by = -46 + (i - 1.5) * 7;
          ctx.beginPath();
          ctx.moveTo(sd * 10, by);
          ctx.lineTo(sd * (30 + i * 2), by - 18 + i * 6 + wig);
          ctx.lineTo(sd * (40 + i * 1.5), by + 6 + i * 9 - wig);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.ellipse(0, -52, 22, 25, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2b0040';
      HW.glow(ctx, C.magenta, 16);
      ctx.fill();
      HW.noGlow(ctx);
      HW.outline(ctx, C.magenta, 3);
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.moveTo(-6, -64);
      ctx.lineTo(6, -64);
      ctx.lineTo(0, -54);
      ctx.lineTo(6, -44);
      ctx.lineTo(-6, -44);
      ctx.lineTo(0, -54);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -22, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#2b0040';
      ctx.fill();
      HW.outline(ctx, C.magenta, 3);
      HW.glow(ctx, C.red, 10);
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.arc(-5, -20, 3, 0, Math.PI * 2);
      ctx.arc(5, -20, 3, 0, Math.PI * 2);
      ctx.arc(-9, -26, 2, 0, Math.PI * 2);
      ctx.arc(9, -26, 2, 0, Math.PI * 2);
      ctx.fill();
      HW.noGlow(ctx);
    },
  };

  // travel ステートの update を他から再利用できるよう公開
  S._travelUpdate = S.travel('').update;

  HW.characters = defs;
})();
