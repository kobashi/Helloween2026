// アプリ本体：メインループ、編集モード / ショーモード、シーン送り
(function () {
  const HW = window.HW;

  const App = (HW.app = {
    project: null,
    mode: 'edit', // 'edit' | 'show'
    sceneIndex: 0,
    playing: false, // 編集モードでのプレビュー再生
    stage: new HW.Stage(),
    show: { index: 0, t: 0, phase: 'in', fadeT: 0, paused: false, guides: false },
    undoStack: [],
  });

  App.scene = () => App.project.scenes[App.sceneIndex];
  App.LW = () => Math.round((HW.LOGICAL_H * App.project.settings.width) / App.project.settings.height);

  App.renderOpts = () => ({ outline: App.project.settings.outline, glow: App.project.settings.glow });

  // ---------- 変更・保存・Undo ----------
  let saveTimer = 0;
  App.changed = function (opts = {}) {
    if (opts.rebuild) App.rebuild();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => HW.store.save(App.project), 400);
    if (HW.editor) HW.editor.refresh(opts);
  };
  App.snapshot = function () {
    App.undoStack.push(JSON.stringify(App.project));
    if (App.undoStack.length > 60) App.undoStack.shift();
  };
  App.undo = function () {
    const s = App.undoStack.pop();
    if (!s) return;
    App.project = JSON.parse(s);
    App.sceneIndex = Math.min(App.sceneIndex, App.project.scenes.length - 1);
    if (HW.editor) HW.editor.select(null);
    App.applySettings();
    App.changed({ rebuild: true, all: true });
  };

  App.rebuild = function () {
    const sc = App.mode === 'show' ? App.project.scenes[App.show.index] : App.scene();
    App.stage.load(App.project, sc);
  };

  App.applySettings = function () {
    const st = App.project.settings;
    App.canvas.width = st.width;
    App.canvas.height = st.height;
    HW.audio.enabled = st.sound;
    HW.audio.setVolume(st.volume);
    HW.audio.setAmbient(st.ambient);
    App.layout();
  };

  // ---------- 画面フィット ----------
  App.layout = function () {
    const wrap = document.getElementById('stageWrap');
    const r = wrap.getBoundingClientRect();
    const st = App.project.settings;
    const ar = st.width / st.height;
    let w = r.width;
    let h = w / ar;
    if (h > r.height) {
      h = r.height;
      w = h * ar;
    }
    App.canvas.style.width = Math.floor(w) + 'px';
    App.canvas.style.height = Math.floor(h) + 'px';
  };

  // ---------- ショーモード ----------
  function enabledScenes() {
    const list = [];
    App.project.scenes.forEach((s, i) => s.enabled !== false && list.push(i));
    return list.length ? list : [0];
  }

  App.enterShow = function (fromCurrent) {
    HW.audio.init();
    const st = App.project.settings;
    App.mode = 'show';
    App.playing = false;
    document.body.classList.add('show');
    document.body.classList.toggle('hidecursor', st.hideCursor);
    if (st.fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    const list = enabledScenes();
    App.show.index = fromCurrent && list.includes(App.sceneIndex) ? App.sceneIndex : list[0];
    App.show.guides = st.guidesInShow;
    App.show.paused = false;
    startShowScene();
    App.stage.audible = true;
    setTimeout(App.layout, 50);
    if (HW.editor) HW.editor.refresh({ all: true });
  };

  App.exitShow = function () {
    App.mode = 'edit';
    document.body.classList.remove('show', 'hidecursor');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    App.stage.audible = false;
    App.rebuild();
    setTimeout(App.layout, 50);
    if (HW.editor) HW.editor.refresh({ all: true });
  };

  function startShowScene() {
    App.show.t = 0;
    App.show.phase = 'in';
    App.show.fadeT = 0;
    App.stage.load(App.project, App.project.scenes[App.show.index]);
  }

  App.showStep = function (dir) {
    const list = enabledScenes();
    let k = list.indexOf(App.show.index);
    if (k < 0) k = 0;
    App.show.index = list[(k + dir + list.length) % list.length];
    startShowScene();
    App.stage.sfx(null, 'whoosh', { cooldown: 0 });
  };

  function updateShow(dt) {
    const S = App.show;
    if (S.paused) return;
    const sc = App.project.scenes[S.index];
    const fade = Math.max(0, App.project.settings.fade);
    App.stage.update(dt, true);
    S.t += dt;
    S.fadeT += dt;
    if (S.phase === 'in' && S.fadeT >= fade) S.phase = 'play';
    if (S.phase !== 'out' && S.t >= Math.max(1, sc.duration) - fade) {
      S.phase = 'out';
      S.fadeT = 0;
    }
    if (S.phase === 'out' && S.fadeT >= fade) App.showStep(1);
  }

  function fadeAlpha() {
    const S = App.show;
    const fade = App.project.settings.fade;
    if (!fade) return 0;
    if (S.phase === 'in') return 1 - Math.min(1, S.fadeT / fade);
    if (S.phase === 'out') return Math.min(1, S.fadeT / fade);
    return 0;
  }

  // ---------- メインループ ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (App.mode === 'show') {
      updateShow(dt);
    } else {
      App.stage.update(dt, App.playing);
      if (App.playing && App.stage.time >= App.scene().duration) App.rebuild(); // プレビューはシーン単体でループ
    }
    const ctx = App.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    App.stage.render(ctx, App.renderOpts());
    const s = App.canvas.height / HW.LOGICAL_H;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    if (App.mode === 'show') {
      const a = fadeAlpha();
      if (a > 0) {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, App.LW(), HW.LOGICAL_H);
      }
      if (App.show.guides && HW.editor) HW.editor.drawGuides(ctx, true);
    } else if (HW.editor) {
      HW.editor.drawOverlay(ctx);
    }
    requestAnimationFrame(frame);
  }

  // ---------- キー操作（ショー中） ----------
  let hintTimer = 0;
  function showHint() {
    const h = document.getElementById('showHint');
    h.classList.add('on');
    document.body.classList.remove('hidecursor');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      h.classList.remove('on');
      if (App.mode === 'show' && App.project.settings.hideCursor) document.body.classList.add('hidecursor');
    }, 2500);
  }

  window.addEventListener('keydown', (ev) => {
    HW.audio.init();
    if (App.mode !== 'show') return;
    const k = ev.key;
    if (k === 'Escape' || k === 'e' || k === 'E') App.exitShow();
    else if (k === 'ArrowRight') App.showStep(1);
    else if (k === 'ArrowLeft') App.showStep(-1);
    else if (k === ' ') App.show.paused = !App.show.paused;
    else if (k === 'g' || k === 'G') App.show.guides = !App.show.guides;
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    } else if (k === 'm' || k === 'M') {
      App.project.settings.sound = !App.project.settings.sound;
      HW.audio.enabled = App.project.settings.sound;
    } else return;
    ev.preventDefault();
  });
  window.addEventListener('pointerdown', () => HW.audio.init());
  window.addEventListener('mousemove', () => App.mode === 'show' && showHint());
  window.addEventListener('resize', () => App.layout());
  document.addEventListener('fullscreenchange', () => setTimeout(App.layout, 50));

  // ---------- 起動 ----------
  window.addEventListener('DOMContentLoaded', () => {
    App.canvas = document.getElementById('stage');
    App.ctx = App.canvas.getContext('2d');
    App.project = HW.store.load();
    App.applySettings();
    App.rebuild();
    if (HW.editor) HW.editor.init();
    const q = new URLSearchParams(location.search);
    if (q.has('show')) {
      const n = parseInt(q.get('scene'), 10);
      if (!isNaN(n)) App.sceneIndex = Math.max(0, Math.min(App.project.scenes.length - 1, n - 1));
      App.enterShow(!isNaN(n));
    }
    requestAnimationFrame(frame);
  });
})();
