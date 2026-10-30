// シーンのランタイム（エンティティ生成・更新・描画）
(function () {
  const HW = window.HW;
  const { rand, approach } = HW.util;

  class Stage {
    constructor() {
      this.physics = new HW.Physics();
      this.entities = [];
      this.drawList = [];
      this.particles = [];
      this.themeState = {};
      this.theme = HW.themes.black;
      this.time = 0;
      this.audible = false;
      this._bg = null;
      this._bgKey = '';
      const self = this;
      this.world = {
        physics: this.physics,
        LW: 1920,
        LH: 1080,
        get entities() {
          return self.entities;
        },
        sfx: (e, name, opts) => self.sfx(e, name, opts),
        particle: (x, y, type, scale) => self.addParticle(x, y, type, scale),
      };
    }

    load(project, scene) {
      const LW = Math.round((HW.LOGICAL_H * project.settings.width) / project.settings.height);
      this.LW = this.world.LW = LW;
      this.LH = this.world.LH = HW.LOGICAL_H;
      this.physics.setLayout(project.layout, LW, HW.LOGICAL_H);
      this.scene = scene;
      this.theme = HW.themes[scene.theme] || HW.themes.black;
      this.themeState = {};
      this.theme.init(this.themeState, LW, HW.LOGICAL_H);
      this.time = 0;
      this.particles = [];
      const wasAudible = this.audible;
      this.audible = false; // 初期化中に鳴らさない
      this.entities = [];
      this.drawList = [];
      for (const item of scene.items) {
        const ent = item.kind === 'char' ? this.makeChar(item) : this.makeProp(item);
        if (!ent) continue;
        if (ent.kind === 'char') this.entities.push(ent);
        this.drawList.push(ent);
      }
      this.audible = wasAudible;
    }

    makeChar(item) {
      const def = HW.characters[item.type];
      if (!def) return null;
      const sc = item.scale || 1;
      const e = {
        id: item.id,
        item,
        def,
        kind: 'char',
        type: item.type,
        x: item.x,
        y: item.y,
        vx: 0,
        vy: 0,
        scale: sc,
        dw: def.w * sc,
        dh: def.h * sc,
        w: def.w * def.box[0] * sc,
        h: def.h * def.box[1] * sc,
        cat: def.cat,
        gravity: def.gravity,
        facing: item.flip ? -1 : 1,
        speed: item.speed || 1,
        sound: item.sound !== false,
        seed: Math.random(),
        t: rand(0, 10),
        alpha: 1,
        sq: 0,
        rot: 0,
        walkPh: 0,
        onGround: false,
        stateT: 0,
      };
      e.visFacing = e.facing;
      if (def.init) def.init(e, this.world);
      e.fsm = new HW.FSM(e, def.states, this.world, def.initial);
      return e;
    }

    makeProp(item) {
      const def = HW.props[item.type];
      if (!def) return null;
      const sc = item.scale || 1;
      return {
        id: item.id,
        item,
        def,
        kind: 'prop',
        type: item.type,
        x: item.x,
        y: item.y,
        scale: sc,
        sx: def.stretch ? item.sx || 1 : 1,
        dw: def.w * sc * (def.stretch ? item.sx || 1 : 1),
        dh: def.h * sc,
        bg: !!def.bg,
        facing: item.flip ? -1 : 1,
        visFacing: item.flip ? -1 : 1,
        params: item.params || {},
        sound: item.sound !== false,
        // 位置を動かしても形が変わらないよう、ID から決める
        seed: HW.util.hash([...String(item.id)].reduce((a, c) => a + c.charCodeAt(0) * 7.13, 0)),
        t: rand(0, 10),
      };
    }

    // エディタでアイテムを動かした時に、ランタイム側を同期
    resetEntity(item) {
      const i = this.drawList.findIndex((d) => d.id === item.id);
      if (i < 0) return;
      const old = this.drawList[i];
      const ent = item.kind === 'char' ? this.makeChar(item) : this.makeProp(item);
      if (!ent) return;
      this.drawList[i] = ent;
      if (old.kind === 'char') {
        const j = this.entities.indexOf(old);
        if (j >= 0) this.entities[j] = ent;
      }
    }

    entityById(id) {
      return this.drawList.find((d) => d.id === id);
    }

    sfx(e, name, opts = {}) {
      if (!this.audible) return;
      if (e && e.sound === false) return;
      const o = Object.assign({}, opts);
      if (e && o.pan === undefined) o.pan = ((e.x / this.LW) * 2 - 1) * 0.8;
      HW.audio.play(name, o);
    }

    addParticle(x, y, type, scale = 1) {
      if (this.particles.length > 400) return;
      const p = { x, y, type, life: 0, scale };
      if (type === 'spark') {
        p.vx = rand(-60, 60);
        p.vy = rand(-80, 40);
        p.max = rand(0.6, 1.3);
        p.color = HW.util.pick(['#ffe14d', '#ff2bd6', '#3df2ff', '#ffffff', '#a24bff']);
        p.size = rand(3, 7);
      } else if (type === 'bubble') {
        p.vx = rand(-15, 15);
        p.vy = rand(-110, -60);
        p.max = rand(0.8, 1.6);
        p.color = '#7dff5a';
        p.size = rand(5, 12) * scale;
      }
      this.particles.push(p);
    }

    update(dt, simulate) {
      this.time += dt;
      const w = this.world;
      if (simulate && this.theme.tick) this.theme.tick(this.themeState, w, dt);
      for (const d of this.drawList) {
        d.t += dt;
        if (d.kind === 'prop') {
          if (simulate && d.def.update) d.def.update(d, w, dt);
          continue;
        }
        if (simulate) {
          const prevG = d.onGround;
          const vyBefore = d.vy;
          d.fsm.update(dt);
          this.physics.step(d, dt);
          if (d.gravity && !prevG && d.onGround && vyBefore > 750 && !d.transit) {
            d.sq = Math.min(0.45, vyBefore / 2800);
            this.sfx(d, 'land', { gain: Math.min(1, vyBefore / 1800) });
          }
          if (d.onGround || !d.gravity) d.walkPh += (Math.abs(d.vx) * dt) / (14 * d.scale);
        }
        d.sq = approach(d.sq || 0, 0, dt * 2.5);
        d.visFacing = approach(d.visFacing, d.facing, dt * 7);
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        if (p.life > p.max) {
          this.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'spark') p.vy += 60 * dt;
      }
    }

    _background(ctx) {
      const cw = ctx.canvas.width;
      const ch = ctx.canvas.height;
      const key = this.scene.theme + ':' + cw + 'x' + ch;
      if (key !== this._bgKey) {
        this._bgKey = key;
        this._bg = document.createElement('canvas');
        this._bg.width = cw;
        this._bg.height = ch;
        const b = this._bg.getContext('2d');
        b.scale(cw / this.LW, ch / this.LH);
        this.theme.build(b, this.LW, this.LH);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this._bg, 0, 0);
    }

    render(ctx, opts) {
      HW.renderOpts = opts;
      const s = ctx.canvas.height / this.LH;
      this._background(ctx);
      ctx.setTransform(s, 0, 0, s, 0, 0);
      this.theme.draw(ctx, this.LW, this.LH, this.time, this.themeState);
      // 背景オブジェクト → テーマの前景効果（霧・稲光）→ その他、の順に描く
      let frontDone = false;
      const front = () => {
        frontDone = true;
        if (this.theme.drawFront) this.theme.drawFront(ctx, this.LW, this.LH, this.time, this.themeState);
      };
      for (const d of this.drawList) {
        if (!frontDone && !d.bg) front();
        if (d.def.drawWorld) d.def.drawWorld(ctx, d);
        ctx.save();
        ctx.translate(d.x, d.y);
        const vf = d.visFacing;
        const fx = (vf < 0 ? -1 : 1) * Math.max(0.08, Math.abs(vf));
        ctx.scale(d.scale * fx, d.scale);
        d.def.draw(ctx, d, d.t);
        ctx.restore();
      }
      if (!frontDone) front();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        const a = 1 - p.life / p.max;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.type === 'bubble') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const r = p.size * (0.6 + 0.4 * Math.sin(p.life * 20));
          ctx.moveTo(p.x, p.y - r * 2);
          ctx.lineTo(p.x + r * 0.5, p.y - r * 0.5);
          ctx.lineTo(p.x + r * 2, p.y);
          ctx.lineTo(p.x + r * 0.5, p.y + r * 0.5);
          ctx.lineTo(p.x, p.y + r * 2);
          ctx.lineTo(p.x - r * 0.5, p.y + r * 0.5);
          ctx.lineTo(p.x - r * 2, p.y);
          ctx.lineTo(p.x - r * 0.5, p.y - r * 0.5);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  HW.Stage = Stage;
})();
