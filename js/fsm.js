// 小さな有限状態機械
(function () {
  class FSM {
    constructor(entity, states, world, initial) {
      this.e = entity;
      this.states = states;
      this.world = world;
      this.name = '';
      this.prev = '';
      this.cur = null;
      this.set(initial);
    }
    set(name, arg) {
      const s = this.states[name];
      if (!s) return;
      if (this.cur && this.cur.exit) this.cur.exit(this.e, this.world);
      this.prev = this.name;
      this.name = name;
      this.cur = s;
      this.e.stateT = 0;
      this.e.stateDur = 0;
      if (s.enter) s.enter(this.e, this.world, arg);
    }
    update(dt) {
      this.e.stateT += dt;
      if (this.cur.update) this.cur.update(this.e, this.world, dt);
    }
    is(name) {
      return this.name === name;
    }
  }
  window.HW.FSM = FSM;
})();
