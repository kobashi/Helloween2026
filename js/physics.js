// 軽量 AABB 物理エンジン
//  - 移動領域(zone)の「和集合」の内側だけを移動可能空間とする
//  - 障害物(obstacle)は固体の透明ボックス（上に乗れる / 横から当たると壁）
//  - ボディ座標は (x=中心, y=足元)、サイズ w,h
(function () {
  const HW = window.HW;
  const { clamp, rand, overlap, inRect } = HW.util;

  const SAMPLE = 10; // 領域内判定のサンプリング間隔(px)
  const MAX_STEP = 6; // サブステップ最大移動量(px)

  class Physics {
    constructor() {
      this.zones = [];
      this.obstacles = [];
      this.W = 1920;
      this.H = 1080;
      this.gravity = 2600;
      this._stage = { x: 0, y: 0, w: 1920, h: 1080, kind: 'any', travel: true, id: '_stage' };
    }

    setLayout(layout, W, H) {
      this.zones = layout.zones;
      this.obstacles = layout.obstacles;
      this.W = W;
      this.H = H;
      this._stage.w = W;
      this._stage.h = H;
    }

    // ボディのカテゴリ (ground / air) が使える領域
    zonesFor(body) {
      const z = this.zones.filter((zn) => zn.kind === 'any' || zn.kind === body.cat);
      return z.length ? z : [this._stage];
    }

    rectOf(b, x = b.x, y = b.y) {
      return { x: x - b.w / 2, y: y - b.h, w: b.w, h: b.h };
    }

    pointIn(px, py, zones) {
      for (let i = 0; i < zones.length; i++) if (inRect(px, py, zones[i])) return true;
      return false;
    }

    rectInZones(r, zones) {
      const x2 = r.x + r.w;
      const y2 = r.y + r.h;
      const nx = Math.max(1, Math.ceil(r.w / SAMPLE));
      const ny = Math.max(1, Math.ceil(r.h / SAMPLE));
      for (let i = 0; i <= nx; i++) {
        const px = r.x + (r.w * i) / nx;
        if (!this.pointIn(px, r.y, zones) || !this.pointIn(px, y2, zones)) return false;
      }
      for (let j = 1; j < ny; j++) {
        const py = r.y + (r.h * j) / ny;
        if (!this.pointIn(r.x, py, zones) || !this.pointIn(x2, py, zones)) return false;
      }
      return true;
    }

    hitsObstacle(r) {
      for (let i = 0; i < this.obstacles.length; i++) if (overlap(r, this.obstacles[i])) return this.obstacles[i];
      return null;
    }

    isFreeRect(body, r) {
      return this.rectInZones(r, this.zonesFor(body)) && !this.hitsObstacle(r);
    }

    isFree(body, x = body.x, y = body.y) {
      return this.isFreeRect(body, this.rectOf(body, x, y));
    }

    zoneAt(body, x = body.x, y = body.y - body.h / 2) {
      const zs = this.zonesFor(body);
      for (const z of zs) if (inRect(x, y, z)) return z;
      return null;
    }

    // 1軸移動。ブロックされたら二分探索で接触位置まで寄せる
    _moveAxis(body, d, axis) {
      if (d === 0) return false;
      const nx = axis === 'x' ? body.x + d : body.x;
      const ny = axis === 'y' ? body.y + d : body.y;
      if (this.isFree(body, nx, ny)) {
        body.x = nx;
        body.y = ny;
        return false;
      }
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 4; i++) {
        const m = (lo + hi) / 2;
        const tx = axis === 'x' ? body.x + d * m : body.x;
        const ty = axis === 'y' ? body.y + d * m : body.y;
        if (this.isFree(body, tx, ty)) lo = m;
        else hi = m;
      }
      if (axis === 'x') body.x += d * lo;
      else body.y += d * lo;
      return true;
    }

    step(body, dt) {
      body.hitWall = 0;
      body.hitCeil = false;
      body.hitFloor = false;
      if (body.transit) return; // 領域間移動中は FSM 側で解析的に位置制御

      if (!this.isFree(body)) {
        this._rescue(body, dt);
        return;
      }
      body.stuckT = 0;

      if (body.gravity) body.vy = Math.min(body.vy + this.gravity * dt, 2200);
      const dx = body.vx * dt;
      const dy = body.vy * dt;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP));
      const sx = dx / n;
      const sy = dy / n;
      let bx = false;
      let by = false;
      for (let i = 0; i < n; i++) {
        if (!bx && this._moveAxis(body, sx, 'x')) bx = true;
        if (!by && this._moveAxis(body, sy, 'y')) by = true;
      }
      body.onGround = false;
      if (bx) body.hitWall = Math.sign(dx);
      if (by) {
        if (dy > 0) {
          body.hitFloor = true;
          if (body.gravity) body.onGround = true;
        } else body.hitCeil = true;
        body.vy = 0;
      }
      if (body.gravity && !body.onGround && body.vy >= 0 && !this.isFree(body, body.x, body.y + 1)) {
        body.onGround = true;
        body.vy = 0;
      }
    }

    // 領域外や障害物にめり込んだ時の救済（配置ミスや編集で領域を動かした場合など）
    _rescue(body, dt) {
      body.stuckT = (body.stuckT || 0) + dt;
      body.onGround = false;
      const tryAt = (x, y) => {
        if (this.isFree(body, x, y)) {
          body.x = x;
          body.y = y;
          body.vx = body.vy = 0;
          body.stuckT = 0;
          return true;
        }
        return false;
      };
      // 1) 障害物にめり込んでいたら上に乗せる / 左右に押し出す
      const ob = this.hitsObstacle(this.rectOf(body));
      if (ob) {
        if (tryAt(body.x, ob.y - 0.5)) return;
        if (tryAt(ob.x - body.w / 2 - 0.5, body.y)) return;
        if (tryAt(ob.x + ob.w + body.w / 2 + 0.5, body.y)) return;
      }
      // 2) 最寄り領域の内側へクランプ
      const z = this.nearestZone(body);
      if (z) {
        const x = clamp(body.x, z.x + body.w / 2 + 0.5, z.x + z.w - body.w / 2 - 0.5);
        const y = clamp(body.y, z.y + body.h + 0.5, z.y + z.h - 0.5);
        if (tryAt(x, y)) return;
      }
      // 3) それでも駄目ならしばらく待ってランダムな空き位置へ
      if (body.stuckT > 0.3) {
        const p = (body.gravity && z && this.findLanding(body, z)) || this.findFreeSpot(body, z) || this.findFreeSpot(body);
        if (p) tryAt(p.x, p.y);
      }
    }

    nearestZone(body) {
      let best = null;
      let bd = Infinity;
      for (const z of this.zonesFor(body)) {
        const px = clamp(body.x, z.x, z.x + z.w);
        const py = clamp(body.y - body.h / 2, z.y, z.y + z.h);
        const d = (px - body.x) ** 2 + (py - body.y + body.h / 2) ** 2;
        if (d < bd) {
          bd = d;
          best = z;
        }
      }
      return best;
    }

    // 領域内の空きスポット（空中用）
    findFreeSpot(body, zone) {
      const zs = zone ? [zone] : this.zonesFor(body);
      for (let i = 0; i < 40; i++) {
        const z = zs[Math.floor(Math.random() * zs.length)];
        const x = rand(z.x + body.w / 2, z.x + z.w - body.w / 2);
        const y = rand(z.y + body.h, z.y + z.h);
        if (this.isFree(body, x, y)) return { x, y };
      }
      return null;
    }

    // 着地点（地上用）: ランダムな x から下方向にスキャンして床/障害物の上を探す
    findLanding(body, zone) {
      for (let i = 0; i < 30; i++) {
        const x = rand(zone.x + body.w / 2 + 2, zone.x + zone.w - body.w / 2 - 2);
        let y = zone.y + body.h + 2;
        if (!this.isFree(body, x, y)) continue;
        let guard = 0;
        while (this.isFree(body, x, y + 4) && guard++ < 600) y += 4;
        while (this.isFree(body, x, y + 1) && guard++ < 610) y += 1;
        return { x, y };
      }
      return null;
    }
  }

  HW.Physics = Physics;
})();
