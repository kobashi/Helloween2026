// プロジェクトデータ（初期値・保存・読み込み）
(function () {
  const HW = window.HW;
  const { uid } = HW.util;
  const KEY = 'hw2026.project.v1';

  const ch = (type, x, y, scale = 1, extra = {}) =>
    Object.assign({ id: uid(), kind: 'char', type, x, y, scale, flip: false, speed: 1, sound: true }, extra);
  const pr = (type, x, y, scale = 1, params) =>
    Object.assign({ id: uid(), kind: 'prop', type, x, y, scale, flip: false, sound: true }, params ? { params } : {});

  HW.defaultSettings = () => ({
    width: 1920,
    height: 1080,
    volume: 0.6,
    sound: true,
    ambient: false,
    outline: true,
    glow: 1,
    fade: 1.2,
    fullscreen: true,
    hideCursor: true,
    guidesInShow: false,
  });

  HW.defaultProject = function () {
    return {
      version: 1,
      settings: HW.defaultSettings(),
      // 移動領域・障害物はマッピング（現実の投影面）に紐づくため全シーン共通
      layout: {
        zones: [
          { id: uid(), name: '床', kind: 'any', travel: true, x: 40, y: 560, w: 1140, h: 480 },
          { id: uid(), name: '右の台', kind: 'any', travel: true, x: 1320, y: 470, w: 560, h: 570 },
          { id: uid(), name: '空', kind: 'air', travel: true, x: 40, y: 40, w: 1840, h: 520 },
        ],
        obstacles: [{ id: uid(), name: '箱', x: 560, y: 900, w: 200, h: 140 }],
      },
      scenes: [
        {
          id: uid(),
          name: 'オープニング',
          theme: 'graveyard',
          duration: 30,
          enabled: true,
          items: [
            pr('tombstone', 260, 1040, 1),
            pr('tombstone', 1060, 1040, 0.8, { text: 'BOO' }),
            pr('lantern', 1500, 1040, 1),
            pr('banner', 960, 330, 1, { text: 'HAPPY HALLOWEEN', color: '#ff7a00' }),
            ch('ghost', 420, 520, 1),
            ch('ghost', 1500, 400, 0.8, { flip: true }),
            ch('bat', 300, 200, 1),
            ch('bat', 1600, 160, 0.8),
            ch('jack', 900, 1040, 1),
          ],
        },
        {
          id: uid(),
          name: '幽霊屋敷',
          theme: 'mansion',
          duration: 30,
          enabled: true,
          items: [
            pr('candle', 1400, 1040, 1),
            pr('candle', 1800, 1040, 0.8),
            pr('web', 140, 240, 1),
            ch('skeleton', 300, 1040, 1),
            ch('cat', 900, 1040, 1, { flip: true }),
            ch('ghost', 1600, 700, 1),
            ch('bat', 600, 180, 1),
            ch('bat', 1200, 260, 0.7),
            ch('bat', 1700, 140, 0.9),
          ],
        },
        {
          id: uid(),
          name: 'かぼちゃ畑',
          theme: 'pumpkin',
          duration: 30,
          enabled: true,
          items: [
            pr('lantern', 200, 1040, 1.2),
            pr('candycorn', 1100, 1040, 1),
            ch('jack', 400, 1040, 1),
            ch('jack', 800, 1040, 0.7, { flip: true }),
            ch('jack', 1600, 1040, 0.9),
            ch('cat', 1000, 1040, 0.9),
            ch('witch', 600, 300, 1),
          ],
        },
        {
          id: uid(),
          name: '魔女の森',
          theme: 'forest',
          duration: 30,
          enabled: true,
          items: [
            pr('cauldron', 1600, 1040, 1.3),
            pr('eyes', 240, 700, 1),
            pr('eyes', 1000, 640, 0.7, { color: '#5dff3a' }),
            ch('witch', 900, 350, 1.1),
            ch('spider', 300, 360, 1),
            ch('spider', 1500, 400, 0.8),
            ch('cat', 700, 1040, 1),
          ],
        },
        {
          id: uid(),
          name: '赤い月',
          theme: 'bloodmoon',
          duration: 30,
          enabled: true,
          items: [
            pr('skull', 1180, 1040, 1),
            pr('skull', 1700, 1040, 0.8),
            ch('skeleton', 400, 1040, 1),
            ch('skeleton', 1500, 1040, 0.9, { flip: true }),
            ch('bat', 400, 200, 1),
            ch('bat', 800, 300, 0.8),
            ch('bat', 1300, 150, 1),
            ch('bat', 1700, 250, 0.7),
            ch('spider', 1000, 300, 1),
          ],
        },
      ],
    };
  };

  // 欠けたフィールドを補完（古いデータや手書き JSON 対策）
  HW.normalizeProject = function (p) {
    if (!p || !Array.isArray(p.scenes)) throw new Error('scenes がありません');
    p.settings = Object.assign(HW.defaultSettings(), p.settings || {});
    p.layout = p.layout || {};
    p.layout.zones = (p.layout.zones || []).map((z) => Object.assign({ id: uid(), name: '領域', kind: 'any', travel: true }, z));
    p.layout.obstacles = (p.layout.obstacles || []).map((o) => Object.assign({ id: uid(), name: '障害物' }, o));
    p.scenes.forEach((s) => {
      s.id = s.id || uid();
      s.items = (s.items || []).map((it) =>
        Object.assign({ id: uid(), scale: 1, flip: false, speed: 1, sound: true }, it, {
          kind: HW.characters[it.type] ? 'char' : 'prop',
        })
      );
      if (s.duration === undefined) s.duration = 30;
      if (s.enabled === undefined) s.enabled = true;
      if (!s.theme) s.theme = 'black';
    });
    if (!p.scenes.length) p.scenes.push({ id: uid(), name: 'シーン1', theme: 'black', duration: 30, enabled: true, items: [] });
    return p;
  };

  HW.store = {
    load() {
      try {
        const s = localStorage.getItem(KEY);
        if (s) return HW.normalizeProject(JSON.parse(s));
      } catch (e) {
        console.warn('保存データの読み込みに失敗', e);
      }
      return HW.defaultProject();
    },
    save(p) {
      try {
        localStorage.setItem(KEY, JSON.stringify(p));
      } catch (e) {
        console.warn('保存に失敗', e);
      }
    },
  };
})();
