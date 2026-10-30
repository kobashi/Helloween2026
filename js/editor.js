// 編集モード UI：シーン管理、配置、領域/障害物の設定
(function () {
  const HW = window.HW;
  const App = HW.app;
  const { uid, clamp, deepCopy } = HW.util;
  const $ = (id) => document.getElementById(id);

  const ZONE_COLORS = { any: '#3cff6a', ground: '#ffae00', air: '#3df2ff' };
  const ZONE_KIND_LABEL = { any: '共通', ground: '地上', air: '空中' };
  const HANDLE = 16;

  const E = (HW.editor = {
    sel: null, // { type:'item'|'zone'|'obstacle', ref }
    drag: null,
    guides: true,
    grid: false,
    snap: false,
    lockLayout: false,
  });

  // ================= 初期化 =================
  E.init = function () {
    buildPalette();
    $('btnPlay').onclick = togglePlay;
    $('btnReset').onclick = () => App.rebuild();
    $('btnShow').onclick = () => App.enterShow(false);
    $('btnFs').onclick = () => App.toggleFullscreen();
    $('btnHideUI').onclick = () => App.toggleUI(false);
    $('btnShowHere').onclick = () => App.enterShow(true);
    $('btnUndo').onclick = () => App.undo();
    $('btnExport').onclick = exportJSON;
    $('btnImport').onclick = () => $('fileImport').click();
    $('fileImport').onchange = importJSON;
    $('btnNew').onclick = () => {
      if (!confirm('サンプル初期状態に戻します。現在の内容は失われます（先に書き出し推奨）。よろしいですか？')) return;
      App.snapshot();
      App.project = HW.defaultProject();
      App.sceneIndex = 0;
      E.select(null);
      App.applySettings();
      App.changed({ rebuild: true, all: true });
    };
    $('chkGuides').onchange = (e) => (E.guides = e.target.checked);
    $('chkGrid').onchange = (e) => (E.grid = e.target.checked);
    $('chkSnap').onchange = (e) => (E.snap = e.target.checked);
    $('chkLock').onchange = (e) => (E.lockLayout = e.target.checked);

    $('scAdd').onclick = () => {
      App.snapshot();
      App.project.scenes.splice(App.sceneIndex + 1, 0, {
        id: uid(),
        name: 'シーン' + (App.project.scenes.length + 1),
        theme: 'graveyard',
        duration: 30,
        enabled: true,
        items: [],
      });
      selectScene(App.sceneIndex + 1);
    };
    $('scDup').onclick = () => {
      App.snapshot();
      const c = deepCopy(App.scene());
      c.id = uid();
      c.name += ' (コピー)';
      c.items.forEach((it) => (it.id = uid()));
      App.project.scenes.splice(App.sceneIndex + 1, 0, c);
      selectScene(App.sceneIndex + 1);
    };
    $('scDel').onclick = () => {
      if (App.project.scenes.length <= 1) return;
      if (!confirm(`シーン「${App.scene().name}」を削除しますか？`)) return;
      App.snapshot();
      App.project.scenes.splice(App.sceneIndex, 1);
      selectScene(Math.min(App.sceneIndex, App.project.scenes.length - 1));
    };
    $('scUp').onclick = () => moveScene(-1);
    $('scDown').onclick = () => moveScene(1);

    const cv = App.canvas;
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('dblclick', () => togglePlay());
    window.addEventListener('keydown', onKey);
    E.refresh({ all: true });
  };

  function togglePlay() {
    HW.audio.init();
    App.playing = !App.playing;
    App.stage.audible = App.playing;
    App.rebuild();
    E.refresh({});
  }

  function selectScene(i) {
    App.sceneIndex = i;
    E.select(null);
    App.changed({ rebuild: true, all: true });
  }

  function moveScene(d) {
    const s = App.project.scenes;
    const j = App.sceneIndex + d;
    if (j < 0 || j >= s.length) return;
    App.snapshot();
    [s[App.sceneIndex], s[j]] = [s[j], s[App.sceneIndex]];
    App.sceneIndex = j;
    App.changed({ all: true });
  }

  // ================= パレット =================
  function buildPalette() {
    const pc = $('palChars');
    for (const k in HW.characters) {
      const b = document.createElement('button');
      b.textContent = HW.characters[k].label;
      b.onclick = () => addItem('char', k);
      pc.appendChild(b);
    }
    const pp = $('palProps');
    for (const k in HW.props) {
      const b = document.createElement('button');
      b.textContent = HW.props[k].label;
      b.onclick = () => addItem('prop', k);
      pp.appendChild(b);
    }
    document.querySelectorAll('[data-add]').forEach((b) => {
      b.onclick = () => {
        const [t, kind] = b.dataset.add.split(':');
        addLayout(t, kind);
      };
    });
  }

  function addItem(kind, type) {
    App.snapshot();
    const LW = App.LW();
    const def = kind === 'char' ? HW.characters[type] : HW.props[type];
    let x = LW / 2 + (Math.random() - 0.5) * 300;
    let y = HW.LOGICAL_H * 0.9;
    if (kind === 'char') {
      const zs = App.project.layout.zones.filter((z) => z.kind === 'any' || z.kind === def.cat);
      const z = zs[Math.floor(Math.random() * zs.length)];
      if (z) {
        x = clamp(z.x + z.w / 2 + (Math.random() - 0.5) * z.w * 0.5, z.x + def.w / 2, z.x + z.w - def.w / 2);
        y = def.gravity ? z.y + z.h - 1 : z.y + z.h / 2 + def.h / 2;
        if (type === 'spider') y = z.y + def.h + 120;
      }
    }
    const item = { id: uid(), kind, type, x: Math.round(x), y: Math.round(y), scale: 1, flip: false, sound: true };
    if (kind === 'char') item.speed = 1;
    if (def.params) item.params = deepCopy(def.params);
    App.scene().items.push(item);
    E.select({ type: 'item', ref: item });
    App.changed({ rebuild: true, all: true });
  }

  function addLayout(t, kind) {
    App.snapshot();
    const LW = App.LW();
    if (t === 'zone') {
      const z = { id: uid(), name: ZONE_KIND_LABEL[kind] + '領域', kind, travel: true, x: LW / 2 - 300, y: 300, w: 600, h: 400 };
      App.project.layout.zones.push(z);
      E.select({ type: 'zone', ref: z });
    } else {
      const o = { id: uid(), name: '障害物', x: LW / 2 - 100, y: 800, w: 200, h: 200 };
      App.project.layout.obstacles.push(o);
      E.select({ type: 'obstacle', ref: o });
    }
    App.changed({ all: true });
  }

  // ================= 選択・ヒットテスト =================
  E.select = function (s) {
    E.sel = s;
    E.refresh({ sel: true });
  };

  function itemBox(item) {
    const def = item.kind === 'char' ? HW.characters[item.type] : HW.props[item.type];
    if (!def) return { x: item.x, y: item.y, w: 1, h: 1 };
    const ent = App.playing ? App.stage.entityById(item.id) : null;
    const x = ent ? ent.x : item.x;
    const y = ent ? ent.y : item.y;
    const w = def.w * (item.scale || 1);
    const h = def.h * (item.scale || 1);
    return { x: x - w / 2, y: y - h, w, h };
  }

  function selBox() {
    const s = E.sel;
    if (!s) return null;
    return s.type === 'item' ? itemBox(s.ref) : s.ref;
  }

  function handles(box, type) {
    if (type === 'item') return [{ id: 'scale', x: box.x + box.w, y: box.y }];
    return [
      { id: 'nw', x: box.x, y: box.y },
      { id: 'ne', x: box.x + box.w, y: box.y },
      { id: 'sw', x: box.x, y: box.y + box.h },
      { id: 'se', x: box.x + box.w, y: box.y + box.h },
    ];
  }

  function hitTest(p) {
    const items = App.scene().items;
    for (let i = items.length - 1; i >= 0; i--) {
      if (HW.util.inRect(p.x, p.y, itemBox(items[i]))) return { type: 'item', ref: items[i] };
    }
    if (E.lockLayout || !E.guides) return null;
    const L = App.project.layout;
    for (let i = L.obstacles.length - 1; i >= 0; i--) if (HW.util.inRect(p.x, p.y, L.obstacles[i])) return { type: 'obstacle', ref: L.obstacles[i] };
    // 小さい領域を優先
    const zs = L.zones.filter((z) => HW.util.inRect(p.x, p.y, z)).sort((a, b) => a.w * a.h - b.w * b.h);
    return zs.length ? { type: 'zone', ref: zs[0] } : null;
  }

  function toLogical(ev) {
    const r = App.canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * App.LW(), y: ((ev.clientY - r.top) / r.height) * HW.LOGICAL_H };
  }

  const snapV = (v) => (E.snap ? Math.round(v / 20) * 20 : Math.round(v));

  // ================= ポインター操作 =================
  function onDown(ev) {
    if (App.mode !== 'edit') return;
    const p = toLogical(ev);
    const tol = HANDLE / (App.canvas.getBoundingClientRect().width / App.LW());
    const box = selBox();
    if (box) {
      for (const h of handles(box, E.sel.type)) {
        if (Math.abs(p.x - h.x) < tol && Math.abs(p.y - h.y) < tol) {
          App.snapshot();
          E.drag = { mode: h.id, start: p, orig: deepCopy(E.sel.ref) };
          App.canvas.setPointerCapture(ev.pointerId);
          return;
        }
      }
    }
    const hit = hitTest(p);
    E.select(hit);
    if (hit) {
      App.snapshot();
      E.drag = { mode: 'move', start: p, orig: deepCopy(hit.ref) };
      App.canvas.setPointerCapture(ev.pointerId);
    }
  }

  function onMove(ev) {
    if (!E.drag || !E.sel) return;
    const p = toLogical(ev);
    const d = E.drag;
    const o = d.orig;
    const r = E.sel.ref;
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (d.mode === 'move') {
      r.x = snapV(o.x + dx);
      r.y = snapV(o.y + dy);
    } else if (d.mode === 'scale') {
      const d0 = Math.hypot(d.start.x - o.x, d.start.y - o.y) || 1;
      const d1 = Math.hypot(p.x - o.x, p.y - o.y);
      r.scale = Math.round(clamp((o.scale || 1) * (d1 / d0), 0.1, 8) * 100) / 100;
    } else {
      const MIN = 20;
      let x1 = o.x;
      let y1 = o.y;
      let x2 = o.x + o.w;
      let y2 = o.y + o.h;
      if (d.mode.includes('w')) x1 = Math.min(snapV(o.x + dx), x2 - MIN);
      if (d.mode.includes('e')) x2 = Math.max(snapV(o.x + o.w + dx), x1 + MIN);
      if (d.mode.includes('n')) y1 = Math.min(snapV(o.y + dy), y2 - MIN);
      if (d.mode.includes('s')) y2 = Math.max(snapV(o.y + o.h + dy), y1 + MIN);
      Object.assign(r, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    }
    if (E.sel.type === 'item') App.stage.resetEntity(r);
    E.refresh({ sel: true, light: true });
  }

  function onUp() {
    if (E.drag) {
      E.drag = null;
      App.changed({ sel: true });
    }
  }

  function onWheel(ev) {
    if (!E.sel || E.sel.type !== 'item') return;
    ev.preventDefault();
    App.snapshot();
    const r = E.sel.ref;
    r.scale = Math.round(clamp((r.scale || 1) * (ev.deltaY < 0 ? 1.06 : 1 / 1.06), 0.1, 8) * 100) / 100;
    App.stage.resetEntity(r);
    App.changed({ sel: true });
  }

  function onKey(ev) {
    if (App.mode !== 'edit') return;
    const tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    const k = ev.key;
    if ((ev.ctrlKey || ev.metaKey) && (k === 'z' || k === 'Z')) {
      App.undo();
      ev.preventDefault();
      return;
    }
    if (k === ' ') {
      togglePlay();
      ev.preventDefault();
      return;
    }
    if (k === 'Tab') {
      App.toggleUI();
      ev.preventDefault();
      return;
    }
    if ((k === 'f' || k === 'F') && ev.shiftKey) {
      App.toggleFullscreen();
      ev.preventDefault();
      return;
    }
    if (!E.sel) return;
    const r = E.sel.ref;
    const step = ev.shiftKey ? 10 : 1;
    if (k === 'Delete' || k === 'Backspace') deleteSel();
    else if ((ev.ctrlKey || ev.metaKey) && (k === 'd' || k === 'D')) duplicateSel();
    else if (k.startsWith('Arrow')) {
      App.snapshot();
      if (k === 'ArrowLeft') r.x -= step;
      if (k === 'ArrowRight') r.x += step;
      if (k === 'ArrowUp') r.y -= step;
      if (k === 'ArrowDown') r.y += step;
      if (E.sel.type === 'item') App.stage.resetEntity(r);
      App.changed({ sel: true });
    } else if ((k === 'f' || k === 'F') && E.sel.type === 'item') {
      App.snapshot();
      r.flip = !r.flip;
      App.changed({ rebuild: true, sel: true });
    } else return;
    ev.preventDefault();
  }

  function deleteSel() {
    if (!E.sel) return;
    App.snapshot();
    const r = E.sel.ref;
    const L = App.project.layout;
    const arr = E.sel.type === 'item' ? App.scene().items : E.sel.type === 'zone' ? L.zones : L.obstacles;
    const i = arr.indexOf(r);
    if (i >= 0) arr.splice(i, 1);
    E.select(null);
    App.changed({ rebuild: true, all: true });
  }

  function duplicateSel() {
    if (!E.sel) return;
    App.snapshot();
    const c = deepCopy(E.sel.ref);
    c.id = uid();
    c.x += 40;
    const L = App.project.layout;
    const arr = E.sel.type === 'item' ? App.scene().items : E.sel.type === 'zone' ? L.zones : L.obstacles;
    arr.push(c);
    E.select({ type: E.sel.type, ref: c });
    App.changed({ rebuild: true, all: true });
  }

  function reorder(dir) {
    const items = App.scene().items;
    const i = items.indexOf(E.sel.ref);
    const j = dir === 'front' ? items.length - 1 : 0;
    if (i < 0 || i === j) return;
    App.snapshot();
    items.splice(i, 1);
    if (dir === 'front') items.push(E.sel.ref);
    else items.unshift(E.sel.ref);
    App.changed({ rebuild: true, sel: true });
  }

  // ================= オーバーレイ描画 =================
  E.drawGuides = function (ctx, inShow) {
    const L = App.project.layout;
    ctx.save();
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    for (const z of L.zones) {
      const c = ZONE_COLORS[z.kind] || '#fff';
      ctx.fillStyle = c + '22';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.setLineDash([14, 8]);
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.setLineDash([]);
      ctx.fillStyle = c;
      ctx.fillText(`${z.name}［${ZONE_KIND_LABEL[z.kind]}${z.travel === false ? '・移動不可' : ''}］`, z.x + 8, z.y + 6);
    }
    for (const o of L.obstacles) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(o.x, o.y, o.w, o.h);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,23,68,0.18)';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = 'rgba(255,23,68,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = -o.h; k < o.w; k += 18) {
        ctx.moveTo(o.x + k, o.y + o.h);
        ctx.lineTo(o.x + k + o.h, o.y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 3;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#ff6b8a';
      ctx.fillText(o.name, o.x + 6, o.y + 6);
    }
    if (inShow) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, App.LW() - 4, HW.LOGICAL_H - 4);
    }
    ctx.restore();
  };

  E.drawOverlay = function (ctx) {
    const LW = App.LW();
    const H = HW.LOGICAL_H;
    if (E.grid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= LW; x += 60) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = 0; y <= H; y += 60) {
        ctx.moveTo(0, y);
        ctx.lineTo(LW, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(LW / 2, 0);
      ctx.lineTo(LW / 2, H);
      ctx.moveTo(0, H / 2);
      ctx.lineTo(LW, H / 2);
      ctx.stroke();
      ctx.restore();
    }
    if (E.guides) E.drawGuides(ctx, false);
    // アイテムの外枠（薄く）
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    for (const it of App.scene().items) {
      const b = itemBox(it);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    ctx.restore();
    const b = selBox();
    if (b) {
      ctx.save();
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#ffe14d';
      const hs = HANDLE / (App.canvas.getBoundingClientRect().width / LW);
      for (const h of handles(b, E.sel.type)) ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
      if (E.sel.type === 'item') {
        ctx.beginPath();
        ctx.arc(E.sel.ref.x, E.sel.ref.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // ================= パネル（プロパティ） =================
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e[k] = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    children.forEach((c) => c && e.appendChild(c));
    return e;
  }

  // obj[key] を編集するフィールド
  function field(label, obj, key, type, opts = {}) {
    let input;
    const commit = (v) => {
      App.snapshot();
      obj[key] = v;
      if (opts.after) opts.after(v);
      App.changed({ rebuild: opts.rebuild !== false, sel: true, keepForm: !opts.refreshAll, all: !!opts.refreshAll });
    };
    if (type === 'select') {
      input = el('select');
      for (const [v, t] of opts.options) {
        const o = el('option', { value: v, text: t });
        if (String(obj[key]) === String(v)) o.selected = true;
        input.appendChild(o);
      }
      input.onchange = () => commit(opts.number ? Number(input.value) : input.value);
    } else if (type === 'check') {
      input = el('input', { type: 'checkbox' });
      input.checked = obj[key] !== false && !!obj[key];
      input.onchange = () => commit(input.checked);
    } else if (type === 'range') {
      input = el('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step });
      input.value = obj[key];
      const out = el('span', { class: 'val', text: obj[key] });
      input.oninput = () => (out.textContent = input.value);
      input.onchange = () => commit(Number(input.value));
      return el('label', { class: 'f' }, [el('span', { text: label }), input, out]);
    } else {
      input = el('input', { type: type === 'number' ? 'number' : type === 'color' ? 'color' : 'text' });
      if (opts.step) input.step = opts.step;
      if (opts.min !== undefined) input.min = opts.min;
      input.value = obj[key] === undefined ? '' : obj[key];
      input.onchange = () => {
        let v = input.value;
        if (type === 'number') {
          v = Number(v);
          if (isNaN(v)) return;
          if (opts.min !== undefined) v = Math.max(opts.min, v);
        }
        commit(v);
      };
    }
    input.dataset.key = key;
    return el('label', { class: 'f' }, [el('span', { text: label }), input]);
  }

  function btn(text, fn, cls) {
    return el('button', { text, onclick: fn, class: cls || '' });
  }

  function renderSceneList() {
    const box = $('sceneList');
    box.innerHTML = '';
    let total = 0;
    App.project.scenes.forEach((s, i) => {
      if (s.enabled !== false) total += Number(s.duration) || 0;
      const row = el('div', { class: 'scene' + (i === App.sceneIndex ? ' cur' : '') + (s.enabled === false ? ' off' : '') });
      const chk = el('input', { type: 'checkbox', title: 'ショーで再生する' });
      chk.checked = s.enabled !== false;
      chk.onclick = (ev) => ev.stopPropagation();
      chk.onchange = () => {
        App.snapshot();
        s.enabled = chk.checked;
        App.changed({ all: true });
      };
      row.appendChild(chk);
      row.appendChild(el('span', { class: 'nm', text: `${i + 1}. ${s.name}` }));
      row.appendChild(el('span', { class: 'du', text: `${s.duration}s` }));
      row.onclick = () => selectScene(i);
      box.appendChild(row);
    });
    $('showTotal').textContent = `ショー1周: ${Math.floor(total / 60)}分${total % 60}秒（ループ再生）`;
  }

  function renderSceneProps() {
    const s = App.scene();
    const box = $('sceneProps');
    box.innerHTML = '';
    box.appendChild(field('名前', s, 'name', 'text', { rebuild: false }));
    box.appendChild(field('再生時間(秒)', s, 'duration', 'number', { min: 1, rebuild: false }));
    box.appendChild(
      field('背景テーマ', s, 'theme', 'select', {
        options: Object.keys(HW.themes).map((k) => [k, HW.themes[k].label]),
      })
    );
  }

  function renderProjectProps() {
    const st = App.project.settings;
    const box = $('projProps');
    box.innerHTML = '';
    const res = { r: `${st.width}x${st.height}` };
    const presets = ['1920x1080', '1280x720', '3840x2160', '1920x1200', '1280x800', '1024x768', '1400x1050'];
    if (!presets.includes(res.r)) presets.push(res.r);
    box.appendChild(
      field('出力解像度', res, 'r', 'select', {
        options: presets.map((p) => [p, p.replace('x', '×')]),
        refreshAll: true,
        after: (v) => {
          const [w, h] = v.split('x').map(Number);
          st.width = w;
          st.height = h;
          App.applySettings();
        },
      })
    );
    box.appendChild(field('幅(px)', st, 'width', 'number', { min: 320, refreshAll: true, after: () => App.applySettings() }));
    box.appendChild(field('高さ(px)', st, 'height', 'number', { min: 240, refreshAll: true, after: () => App.applySettings() }));
    box.appendChild(field('音量', st, 'volume', 'range', { min: 0, max: 1, step: 0.05, rebuild: false, after: (v) => HW.audio.setVolume(v) }));
    box.appendChild(field('SE を鳴らす', st, 'sound', 'check', { rebuild: false, after: (v) => (HW.audio.enabled = v) }));
    box.appendChild(field('環境音（風）', st, 'ambient', 'check', { rebuild: false, after: (v) => { HW.audio.init(); HW.audio.setAmbient(v); } }));
    box.appendChild(field('輪郭線（メリハリ）', st, 'outline', 'check', { rebuild: false }));
    box.appendChild(field('発光の強さ', st, 'glow', 'range', { min: 0, max: 2, step: 0.1, rebuild: false }));
    box.appendChild(field('フェード(秒)', st, 'fade', 'number', { min: 0, step: 0.1, rebuild: false }));
    box.appendChild(field('ショー時に全画面', st, 'fullscreen', 'check', { rebuild: false }));
    box.appendChild(field('ショー時にカーソル非表示', st, 'hideCursor', 'check', { rebuild: false }));
    box.appendChild(field('ショー時も領域を表示', st, 'guidesInShow', 'check', { rebuild: false }));
  }

  function renderSelProps() {
    const box = $('selProps');
    box.innerHTML = '';
    const s = E.sel;
    if (!s) {
      box.appendChild(el('div', { class: 'muted', text: 'キャンバス上のオブジェクト / 領域 / 障害物をクリックして選択' }));
      return;
    }
    const r = s.ref;
    const syncItem = () => App.stage.resetEntity(r);
    if (s.type === 'item') {
      const def = r.kind === 'char' ? HW.characters[r.type] : HW.props[r.type];
      box.appendChild(el('div', { class: 'title', text: (r.kind === 'char' ? 'キャラ: ' : 'オブジェクト: ') + (def ? def.label : r.type) }));
      if (r.kind === 'char')
        box.appendChild(el('div', { class: 'muted', text: def.cat === 'air' ? '空中キャラ：共通/空中領域を移動' : '地上キャラ：共通/地上領域を移動（重力あり）' }));
      box.appendChild(field('X', r, 'x', 'number', { rebuild: false, after: syncItem }));
      box.appendChild(field('Y（足元）', r, 'y', 'number', { rebuild: false, after: syncItem }));
      box.appendChild(field('サイズ倍率', r, 'scale', 'number', { step: 0.05, min: 0.1, rebuild: false, after: syncItem }));
      box.appendChild(field('左右反転', r, 'flip', 'check', { rebuild: false, after: syncItem }));
      if (r.kind === 'char') box.appendChild(field('速さ倍率', r, 'speed', 'number', { step: 0.1, min: 0.1, rebuild: false, after: syncItem }));
      box.appendChild(field('SE', r, 'sound', 'check', { rebuild: false, after: syncItem }));
      if (def && def.params) {
        r.params = r.params || deepCopy(def.params);
        for (const k in def.params) {
          const isColor = k === 'color';
          box.appendChild(field(isColor ? '色' : 'テキスト', r.params, k, isColor ? 'color' : 'text', { rebuild: false, after: syncItem }));
        }
      }
      box.appendChild(
        el('div', { class: 'row' }, [btn('最背面へ', () => reorder('back')), btn('最前面へ', () => reorder('front')), btn('複製', duplicateSel), btn('削除', deleteSel, 'danger')])
      );
      box.appendChild(
        el('div', { class: 'row' }, [
          btn('全シーンにコピー', () => {
            App.snapshot();
            App.project.scenes.forEach((sc) => {
              if (sc !== App.scene()) {
                const c = deepCopy(r);
                c.id = uid();
                sc.items.push(c);
              }
            });
            App.changed({ all: true });
          }),
        ])
      );
    } else {
      const isZone = s.type === 'zone';
      box.appendChild(el('div', { class: 'title', text: isZone ? '移動領域（全シーン共通）' : '障害物ボックス（全シーン共通・透明）' }));
      box.appendChild(field('名前', r, 'name', 'text', { rebuild: false }));
      if (isZone) {
        box.appendChild(
          field('種類', r, 'kind', 'select', {
            rebuild: false,
            options: [
              ['any', '共通（地上・空中どちらも）'],
              ['ground', '地上キャラ専用'],
              ['air', '空中キャラ専用'],
            ],
          })
        );
        box.appendChild(field('他領域からの移動先にする', r, 'travel', 'check', { rebuild: false }));
      }
      for (const k of ['x', 'y', 'w', 'h']) box.appendChild(field(k.toUpperCase(), r, k, 'number', { rebuild: false, min: k === 'w' || k === 'h' ? 10 : undefined }));
      box.appendChild(el('div', { class: 'row' }, [btn('複製', duplicateSel), btn('削除', deleteSel, 'danger')]));
    }
  }

  function updateSelValues() {
    // ドラッグ中は既存フォームの値だけ更新（再生成しない）
    if (!E.sel) return;
    $('selProps')
      .querySelectorAll('input[data-key]')
      .forEach((inp) => {
        const k = inp.dataset.key;
        if (k in E.sel.ref && document.activeElement !== inp && inp.type === 'number') inp.value = E.sel.ref[k];
      });
  }

  E.refresh = function (opts = {}) {
    if (!$('panel')) return;
    $('btnPlay').textContent = App.playing ? '■ 停止' : '▶ プレビュー';
    $('btnPlay').classList.toggle('on', App.playing);
    if (opts.light) return updateSelValues();
    if (opts.all) {
      renderSceneList();
      renderSceneProps();
      renderProjectProps();
    } else {
      renderSceneList();
    }
    if (opts.keepForm) updateSelValues();
    else renderSelProps();
  };

  // 時間表示
  setInterval(() => {
    const t = $('timeInfo');
    if (!t || App.mode !== 'edit') return;
    t.textContent = App.playing ? `${App.stage.time.toFixed(1)} / ${App.scene().duration}s` : '';
  }, 200);

  // ================= 書き出し / 読み込み =================
  function exportJSON() {
    const blob = new Blob([JSON.stringify(App.project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'halloween-show.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importJSON(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const p = HW.normalizeProject(JSON.parse(rd.result));
        App.snapshot();
        App.project = p;
        App.sceneIndex = 0;
        E.select(null);
        App.applySettings();
        App.changed({ rebuild: true, all: true });
      } catch (e) {
        alert('読み込みに失敗しました: ' + e.message);
      }
    };
    rd.readAsText(f);
    ev.target.value = '';
  }
})();
