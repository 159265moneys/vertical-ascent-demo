/* ============================================================
 * 縦型登攀アクション — グレーボックス手触りデモ (endless / solo)
 * v3準拠：壁キック＋空中アクションが中核／静止足場なし／HP=ハート1/4／MP共有CT。
 * スキルは Ctrl+W/A/S/D の4枠（画面のスキルバーに常時表示＝覚えなくていい）。
 * 物理・戦闘の数字は CONFIG に外出し（比は仮・実機で詰める）。
 * ============================================================ */

const CONFIG = {
  CANVAS_W: 450, CANVAS_H: 800,
  WALL_L: 50, WALL_R: 400,   // 壁幅の基準(=1)。今後広げる時はここ＋MAX_AIR_X＋WALLKICK_VXを一緒にスケール
  PLAYER_W: 40, PLAYER_H: 64,

  GRAVITY: 2600,
  MAX_FALL: 1500,
  AIR_ACCEL: 2600, MAX_AIR_X: 400, AIR_FRICTION: 1500,

  WALLKICK_VX: 520, WALLKICK_VY: -1020,
  GROUND_JUMP_VY: -1040,
  COYOTE: 0.09, JUMP_BUFFER: 0.10,
  CLING_GRIP_TIME: 3.0,
  CLING_SLIDE_MAX: 300, CLING_SLIDE_ACCEL: 350,

  // --- 攻撃（基礎攻撃力=1.0 が原器）---
  ATK_BASE: 1.0,
  POGO_BOUNCE: -1080,
  POGO_ACTIVE: 0.22, POGO_COOLDOWN: 0.06, POGO_W: 76, POGO_H: 52, POGO_REACH: 6, POGO_MULT: 1.2,
  UPATK_ACTIVE: 0.16, UPATK_COOLDOWN: 0.18, UPATK_W: 62, UPATK_H: 48, UPATK_REACH: 4, UPATK_MULT: 1.0,
  NAIL_ACTIVE: 0.12, NAIL_COOLDOWN: 0.20, NAIL_W: 56, NAIL_H: 44, NAIL_REACH: 6, NAIL_MULT: 1.0,

  // --- HP（ハート・1/4刻み）---
  HEARTS_MAX: 3, HEARTS_CAP: 10, QPH: 4,   // 器(ハート)の進行上限=10。これ超は将来スキル分(落下ペナには非反映)
  FALL_SEC_PER_HEART: 1.0, IFRAME: 0.9,   // T12=時間型：死亡で器(ハート)数×1s落下・上限なし→空中で立て直し+HP全回復(床到達でも復帰)

  // --- MP（共有CT・自動回復）---
  MP_MAX: 100, MP_REGEN: 30,

  // --- スキル②（Ctrl+WASD の4枠）---
  KENPA_MP: 22, KENPA_MULT: 1.4, KENPA_V: 640, KENPA_CD: 0.22, KENPA_R: 9,          // A：剣波（速い弾）
  HOMURA_MP: 34, HOMURA_MULT: 1.8, HOMURA_V: 380, HOMURA_CD: 0.5, HOMURA_R: 16, HOMURA_PIERCE: 2, // D：焔（遅い大弾・貫通）
  SPIN_MP: 30, SPIN_MULT: 1.2, SPIN_R: 96, SPIN_ACTIVE: 0.18, SPIN_CD: 0.40,        // S：回転斬り（周囲AoE）
  MAYU_MP: 26, MAYU_DUR: 4.0, MAYU_REDUCE: 0.5, MAYU_CD: 6.0,                       // W：守護の繭（被ダメ減）
  RAIJIN_MP: 28, RAIJIN_MULT: 1.5, RAIJIN_TARGETS: 3, RAIJIN_CD: 0.5,               // 落雷：近い敵N体に即着弾
  TRI_MP: 30, TRI_MULT: 1.1, TRI_CD: 0.3, TRI_VY_SPREAD: 150,                       // 三連剣波：前方3発の扇
  UNLOCK_SP: 10,
  // --- チャーム ---
  NOTCH_EXPAND_GOLD: 40, WKICK_BONUS: 1.25, PARA_FALL: 0.5, DEF_REDUCE: 1,
  KAISHIN_CHANCE: 0.2, KAISHIN_MULT: 2, KIBA_MULT: 0.5,

  // --- 敵HP（ATK_BASE基準＝何発で倒れるか）---
  HP_TARGET: 2, HP_OBSTACLE: 3, HP_FLOATER: 3, HP_ATTACKER: 4, HP_CRAWLER: 2,
  CRAWL_VX: 64, CRAWL_FRAME_T: 0.12, CRAWL_RANGE: 120, CRAWL_DRAW_H: 54,   // 這う者：壁沿い速度/コマ間隔/上下パトロール範囲/描画高
  DEATH_POP: -240, DEATH_GRAV: 950,   // 死体：少し跳ねてから回転落下→画面外で削除
  HP_TURRET: 3, TURRET_FIRE_CD: 2.2, TURRET_PROJ_V: 150, TURRET_ATK_POSE: 0.3, TURRET_PULSE_T: 0.45, TURRET_DRAW_H: 58,   // 砲台：HP/発射間隔/弾速(遅)/解放表示尺/鼓動間隔/描画高
  HP_ASSASSIN: 4, ASN_WINDUP: 0.45, ASN_LEAP: 0.5, ASN_LAND: 0.3, ASN_CD: 1.6, ASN_DRAW_H: 62, DMG_ASSASSIN: 1, ASN_BOOM_H: 74, ASN_BOOM_OFF: 44,   // 暗殺者：HP/ため/跳躍/着地/CD/描画高/接触ダメ/ブーム高/前出し
  // --- 敵→自分 ダメージ（1/4ハート単位）---
  DMG_TARGET: 0, DMG_OBSTACLE: 2, DMG_FLOATER: 1, DMG_ATTACKER: 1, DMG_PROJECTILE: 1,
  // --- ドロップ（撃破報酬・恒久層へ）＋テレグラフ ---
  GOLD: { target: 1, obstacle: 2, floater: 2, attacker: 4, crawler: 1, turret: 2, assassin: 3 },
  SP: { target: 1, obstacle: 1, floater: 1, attacker: 2, crawler: 1, turret: 2, assassin: 2 },
  TELEGRAPH_LEAD: 0.5,
  // --- 横穴ハブ（鍵・器）---
  KEY_PER_KILLS: 6, KEY_STOCK: 2,
  HEART_SHARD_GOLD: 12, MP_SHARD_SP: 8, MP_PER_VESSEL: 30,   // カケラ4個で器1個

  FALLER_VY: 135, OBSTACLE_VY: 210, FLOAT_SPEED: 2.2, FLOAT_DRIFT_X: 48, FLOAT_DRIFT_Y: 26,
  ATTACKER_DRIFT_X: 30, ATTACKER_FIRE_CD: 1.9, PROJECTILE_V: 270,
  BAND_GAP: 180, ENEMY_KEEP: 18000, SHAKE_HIT: 9, SHAKE_FALL: 18,   // 保持窓=最大落下(10器=10s/パラ無≈167m)を内包(180m)＝落下後の登り直しに敵が残る
  // ボス＋一時足場(T11)。ボスは高度BOSS_EVERY毎に出現＝任意撃破(スルー可・保持される)
  BOSS_EVERY: 150, BOSS_HP: 28, BOSS_W: 108, BOSS_H: 108, DMG_BOSS: 2,
  BOSS_DRIFT_X: 60, BOSS_BOB_Y: 22, BOSS_PHASE_SPD: 1.0,
  BOSS_ATK_CD: 2.0, BOSS_WINDUP: 0.85, BOSS_VOLLEY: 5, BOSS_VOLLEY_SPREAD: 0.42,
  BOSS_GOLD: 16, BOSS_SP: 6, BOSS_KEYS_MIN: 1, BOSS_KEYS_MAX: 3,
  PLAT_W: 92, PLAT_H: 16, PLAT_LIFE: 4.5, PLAT_COUNT: 2,

  PLAYER_DRAW_H: 138, SPRITE_FEET_FRAC: 0.764, CLING_DRAW_OFF: 12, CAM_FOLLOW: 0.60, CAM_LERP: 9,   // 足基準スプライト。CLING_DRAW_OFF=しがみつき時に壁から離す量(足めり込み防止・ハサミは刺さってOK)
};

// スキルレジストリ（id → 表示名 / MP CONFIGキー / CTフィールド / CT最大CONFIGキー）。割当は meta.slots（横穴で変更）
const SKILL_META = {
  mayu: { name: '守護の繭', mp: 'MAYU_MP', cd: 'mayuCd', cdMax: 'MAYU_CD' },
  kenpa: { name: '剣波', mp: 'KENPA_MP', cd: 'kenpaCd', cdMax: 'KENPA_CD' },
  spin: { name: '回転斬り', mp: 'SPIN_MP', cd: 'spinCd', cdMax: 'SPIN_CD' },
  homura: { name: '焔', mp: 'HOMURA_MP', cd: 'homuraCd', cdMax: 'HOMURA_CD' },
  raijin: { name: '落雷', mp: 'RAIJIN_MP', cd: 'raijinCd', cdMax: 'RAIJIN_CD' },
  tri: { name: '三連剣波', mp: 'TRI_MP', cd: 'triCd', cdMax: 'TRI_CD' },
};
const SKILL_IDS = Object.keys(SKILL_META);
// チャーム（金で購入・ノッチ枠内で装着）。効果は各所が hasCharm() を参照
const CHARMS = [
  { id: 'djump', name: '二段ジャンプ', notch: 2, gold: 30 },
  { id: 'wkick', name: '壁キック延長', notch: 1, gold: 20 },
  { id: 'para', name: 'パラシュート', notch: 1, gold: 25 },
  { id: 'def', name: '防御', notch: 1, gold: 22 },
  { id: 'kaishin', name: '会心', notch: 1, gold: 28 },
  { id: 'kiba', name: '牙突', notch: 2, gold: 32 },
];
const hasCharm = id => meta.equippedCharms.includes(id);
const notchUsed = () => meta.equippedCharms.reduce((s, id) => s + ((CHARMS.find(c => c.id === id) || { notch: 0 }).notch), 0);

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cv.width = CONFIG.CANVAS_W * DPR; cv.height = CONFIG.CANVAS_H * DPR; ctx.scale(DPR, DPR);
const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;

// 壁は高度で滑らかに幅変化（連続関数＝衝突がポップしない）。両側が独立に出入り＝狭い/広い/片寄り
// authoredセグメント：固定パターン(開け/隘路/広間/左寄り/右寄り)を高度で決定論的に乱択し連結。
// 各featureは境界でenv=0に収束→壁が必ず連続(衝突・しがみつき安全)。wallL/wallRは単一真実のまま。
const SEG_H = 720;   // 1セグメント高(px) ≈0.9画面
const SEG_FEATURES = [
  { inset: 0,   sway: 0 },    // 開けた区間(ベースのみ)
  { inset: 24,  sway: 0 },    // 隘路：両壁が内へ
  { inset: -16, sway: 0 },    // 広間：両壁が外へ(基準幅が広いので控えめ)
  { inset: 0,   sway: -18 },  // 左寄り：水路が左へ
  { inset: 0,   sway: 18 },   // 右寄り：水路が右へ
];
function segFeat(i) { const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453); return SEG_FEATURES[Math.floor(r % SEG_FEATURES.length)]; }   // 決定論的乱択(同iは常に同パターン)
function segShape(y) { const d = -y, i = Math.floor(d / SEG_H), t = (d - i * SEG_H) / SEG_H, f = segFeat(i), env = Math.sin(Math.PI * t); return { inset: f.inset * env, sway: f.sway * env }; }
function wallL(y) { const s = segShape(y); return CONFIG.WALL_L + Math.sin(y * 0.0042) * 22 + Math.sin(y * 0.014 + 1.7) * 10 + s.inset + s.sway; }
function wallR(y) { const s = segShape(y); return CONFIG.WALL_R - Math.sin(y * 0.0037 + 2.3) * 22 - Math.sin(y * 0.012 + 0.5) * 10 - s.inset + s.sway; }
// 高度帯バイオーム（見た目）＝登るほど切替＝段階開示
const BIOMES = [
  { name: '麓の洞', wall: '#161c26', line: '#2a3547', bgTop: '#0b0e13', bgBottom: '#10151d' },
  { name: '苔の層', wall: '#16261b', line: '#2a4738', bgTop: '#0b130d', bgBottom: '#101d14' },
  { name: '燼の層', wall: '#2a1616', line: '#4a2626', bgTop: '#140b0b', bgBottom: '#1f1010' },
  { name: '氷の層', wall: '#16222b', line: '#2a4047', bgTop: '#0b1013', bgBottom: '#101a1d' },
];
const BIOME_H = 120;   // m毎に切替
const biomeAt = m => BIOMES[Math.floor(Math.max(0, m) / BIOME_H) % BIOMES.length];
// 高度で敵を1種ずつ導入＝難易度傾斜
function rosterAt(m) { return m < 25 ? ['target', 'crawler', 'turret'] : m < 60 ? ['target', 'crawler', 'turret', 'assassin', 'obstacle'] : m < 110 ? ['target', 'crawler', 'turret', 'assassin', 'obstacle', 'floater'] : ['target', 'obstacle', 'floater', 'crawler', 'turret', 'assassin', 'attacker', 'attacker']; }

// 操作: A/D=移動, W/S=上下(攻撃方向), Shift=ジャンプ/壁キック, Enter=攻撃(↓ポゴ/↑上/前ネイル)
//       Ctrl+W/A/S/D = スキル4枠
const keys = {};
let jumpBuffer = 0, attackEdge = false, paused = false;
let invincible = false, autoRise = false;   // デバッグ専用（本番では外す）
const skillEdge = { W: false, A: false, S: false, D: false };
const skillMod = () => keys['Space'];   // Space＝スキル修飾(親指で押しやすい) ／ 右Shift＝ジャンプ。ブラウザ安全
const PREVENT = ['ShiftLeft','ShiftRight','Enter','NumpadEnter','KeyW','KeyA','KeyS','KeyD','Space'];
addEventListener('keydown', e => {
  if (PREVENT.includes(e.code)) e.preventDefault();
  const fresh = !keys[e.code]; keys[e.code] = true;
  if (!fresh || e.repeat) return;
  if (inHideout) { hideoutKey(e.code); return; }   // 横穴中はメニュー操作
  if (skillMod() && e.code === 'KeyW') { skillEdge.W = true; return; }
  if (skillMod() && e.code === 'KeyA') { skillEdge.A = true; return; }
  if (skillMod() && e.code === 'KeyS') { skillEdge.S = true; return; }
  if (skillMod() && e.code === 'KeyD') { skillEdge.D = true; return; }
  if (e.code === 'ShiftRight') jumpBuffer = CONFIG.JUMP_BUFFER;   // ジャンプ／壁キック＝右Shift
  if (e.code === 'Enter' || e.code === 'NumpadEnter') attackEdge = true;
  if (e.code === 'KeyP') paused = !paused;
  if (e.code === 'KeyI') invincible = !invincible;   // デバッグ：永続無敵トグル
  if (e.code === 'KeyO') autoRise = !autoRise;       // デバッグ：無限上昇トグル
  if (e.code === 'KeyM') spawnBoss();                 // デバッグ：ボス即出現
  if (e.code === 'KeyR') reset();
  if (e.code === 'KeyB') damage(1, 0);   // デバッグ：1/4
  if (e.code === 'KeyN') damage(99, 0);  // デバッグ：即HP0
  if (e.code === 'KeyG') player.keys = Math.min(player.keys + 1, CONFIG.KEY_STOCK);  // デバッグ：鍵+1
  if (e.code === 'KeyH') { inHideout = true; hideoutCursor = 1; }                    // デバッグ：横穴を直接開く(鍵/しがみつき不要)
  if (e.code === 'KeyL') { const st = [1, 1.2, 1.5, 2]; slashReach = st[(st.indexOf(slashReach) + 1) % st.length]; }   // デバッグ：斬撃の射程倍率を巡回(1→1.2→1.5→2)
  if (e.code === 'KeyE' && player.state === 'cling' && player.keys > 0) { player.keys--; inHideout = true; hideoutCursor = 1; saveMeta(); }  // 横穴へ
});
addEventListener('keyup', e => { keys[e.code] = false; });
const held = {   // 左Shift中はWASDをスキルに使うので移動/攻撃方向には効かせない
  left: () => keys['KeyA'] && !skillMod(), right: () => keys['KeyD'] && !skillMod(),
  up: () => keys['KeyW'] && !skillMod(), down: () => keys['KeyS'] && !skillMod(),
};

const SPRITE_VER = 17;   // スプライト差し替え時にbump＝ブラウザ画像キャッシュ回避
const SPRITE_KEYS = ['idle','run','cling','jump','fall','atk','pogo','up'].flatMap(a => [a + '_r', a + '_l']);   // 8アクション×左右
const sprites = {};
SPRITE_KEYS.forEach(s => { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/${s}.png?v=${SPRITE_VER}`; sprites[s] = img; });
// 斬撃エフェクト：5コマのモーフ(細→開く→ピーク→細る→分裂)を「上から下へクリップで伸ばしながら」出す＝立体感＋軌道描き
const SLASH_FRAMES = 5, SLASH_H = 120, SLASH_OFF = 40;    // OFF=狙い方向への前出し量
let slashReach = 1;   // 射程倍率：攻撃方向(ローカルx)へ見た目も当たり判定も伸ばす。1=基準。Longnail等の射程UP時に上げるだけ(再生成不要)
const slashImgs = [];
for (let i = 0; i < SLASH_FRAMES; i++) { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/fx/slash_${i}.png?v=${SPRITE_VER}`; slashImgs.push(img); }
// 暗殺者の突撃斬撃：ソニックブーム5コマ(小→ピーク→減衰)。跳躍の進行で送る
const boomImgs = [];
for (let i = 1; i <= 5; i++) { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/fx/boom_${String(i).padStart(2, '0')}.png?v=${SPRITE_VER}`; boomImgs.push(img); }
// 敵スプライト：enemy_01(這う者)=6コマ(crawl1-4 / 崩れ5 / 溶け6)×左右。dir>0で右(_r)
const e01r = [], e01l = [];
for (let i = 1; i <= 6; i++) {
  const n = String(i).padStart(2, '0');
  const r = new Image(); r.ok = false; r.onload = () => r.ok = true; r.src = `assets/sprites/enemies/enemy01_r_${n}.png?v=${SPRITE_VER}`; e01r.push(r);
  const l = new Image(); l.ok = false; l.onload = () => l.ok = true; l.src = `assets/sprites/enemies/enemy01_l_${n}.png?v=${SPRITE_VER}`; e01l.push(l);
}
// enemy_06(砲台/壁固定)=8コマ(鼓動0-1 / ため2-3 / 解放4-5 / 萎れ6-7)。シンメトリーなので1方向のみ
const e06 = [];
for (let i = 1; i <= 8; i++) { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/enemies/enemy06_${String(i).padStart(2, '0')}.png?v=${SPRITE_VER}`; e06.push(img); }
// enemy_03(暗殺者ランジ)=16ポーズ→右跳び/左跳びセットに割当(ユーザー指定: 右=1,3,2,4,5,7,8 / 左=9,11,10,12,15,16)
const e03all = [];
for (let i = 1; i <= 16; i++) { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/enemies/enemy03_${String(i).padStart(2, '0')}.png?v=${SPRITE_VER}`; e03all.push(img); }
const e03r = [0, 2, 1, 3, 4, 6, 7].map(i => e03all[i]);    // 右へ跳ぶ(左壁発)：cling/ため/ため/跳/空中/攻撃/着地
const e03l = [8, 10, 9, 11, 14, 15].map(i => e03all[i]);   // 左へ跳ぶ(右壁発)：cling/ため/ため/跳/空中/着地
const e03d = [];   // 暗殺者 死亡8コマ(崩れ)。#4(idx3)を死体スプライトに使用
for (let i = 1; i <= 8; i++) { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/enemies/enemy03d_${String(i).padStart(2, '0')}.png?v=${SPRITE_VER}`; e03d.push(img); }

let player, cameraY, maxHeight, enemies, projectiles, platforms, sparks, spawnTopY, bandIndex, bossNextH, hitStop, shake, hp0flash;

// 恒久層（localStorage）：金・SP・ベスト高度は reset() で消えない＝2層セーブの恒久側
const META_KEY = 'vertical_ascent_meta';
function loadMeta() { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; } }
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
let meta = Object.assign({
  gold: 0, sp: 0, bestHeight: 0,
  heartShards: 0, mpShards: 0, heartsBonus: 0, mpBonus: 0,
  unlocked: ['mayu', 'kenpa', 'spin', 'homura'], slots: { W: 'mayu', A: 'kenpa', S: 'spin', D: 'homura' },
  ownedCharms: [], equippedCharms: [], notchMax: 3,
}, loadMeta());
meta.heartsBonus = Math.min(Math.max(0, meta.heartsBonus | 0), CONFIG.HEARTS_CAP - CONFIG.HEARTS_MAX);   // 器進行を上限(=10器)内にclamp＝旧/不正セーブも自動補正
const maxQ = () => (CONFIG.HEARTS_MAX + meta.heartsBonus) * CONFIG.QPH;   // 最大HP(クォーター)
const maxMP = () => CONFIG.MP_MAX + meta.mpBonus * CONFIG.MP_PER_VESSEL;
// 横穴(ベンチ＋店)の状態
let inHideout = false, hideoutCursor = 1;

function reset() {
  player = {
    x: (CONFIG.WALL_L + CONFIG.WALL_R) / 2, y: 0, vx: 0, vy: 0, w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H,
    state: 'air', facing: 1, grounded: true, clingWall: 0, clingHold: 0, coyote: 0, lastWall: 0, airJumps: 0,
    pogoTimer: 0, pogoCd: 0, pogoHitThisSwing: false,
    upTimer: 0, upCd: 0, upHitThisSwing: false,
    nailTimer: 0, nailCd: 0, nailHitThisSwing: false,
    spinTimer: 0, spinCd: 0, kenpaCd: 0, homuraCd: 0, mayuCd: 0, mayuTimer: 0, raijinCd: 0, triCd: 0,
    hpQ: maxQ(), mp: maxMP(), keys: 0, killCount: 0, fallStun: 0, iframe: 0,
  };
  cameraY = -H * CONFIG.CAM_FOLLOW; maxHeight = 0;
  enemies = []; projectiles = []; platforms = []; sparks = []; hitStop = 0;
  spawnTopY = -260; bandIndex = 0; bossNextH = CONFIG.BOSS_EVERY; shake = 0; hp0flash = 0; paused = false;
}

function damage(q, knockY) {
  if (invincible || player.iframe > 0 || player.state === 'fallStun' || q <= 0) return;   // 無敵=デバッグ
  if (hasCharm('def')) q = Math.max(0, q - CONFIG.DEF_REDUCE);              // 防御チャーム
  if (player.mayuTimer > 0) q = Math.floor(q * (1 - CONFIG.MAYU_REDUCE));   // 守護の繭：被ダメ減
  if (q <= 0) { player.iframe = CONFIG.IFRAME * 0.4; return; }
  player.hpQ -= q; player.iframe = CONFIG.IFRAME;
  if (knockY) player.vy = knockY;
  shake = Math.max(shake, CONFIG.SHAKE_HIT);
  if (player.hpQ <= 0) {
    player.hpQ = 0; player.state = 'fallStun'; player.clingWall = 0;
    player.fallStun = Math.min(CONFIG.HEARTS_MAX + meta.heartsBonus, CONFIG.HEARTS_CAP) * CONFIG.FALL_SEC_PER_HEART;   // 器数×1s、上限=HEARTS_CAP(10器=10s)。スキル由来の器増は落下に乗らない
    player.vx = 0; shake = CONFIG.SHAKE_FALL; hp0flash = 0.5; saveMeta();
  }
}

function spawnSparks(x, y) { for (let i = 0; i < 7; i++) { const a = Math.random() * 6.2832, s = 70 + Math.random() * 180; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.16 + Math.random() * 0.12 }); } }
function hitEnemy(e, dmg) { if (hasCharm('kaishin') && Math.random() < CONFIG.KAISHIN_CHANCE) dmg *= CONFIG.KAISHIN_MULT; e.hp -= dmg; e.flash = 0.12; hitStop = Math.max(hitStop, 0.045); shake = Math.max(shake, 5); spawnSparks(e.x, e.y); if (e.hp <= 0 && e.alive && !e.dead) { if (e.type === 'boss') e.alive = false; else { e.dead = true; e.vy = CONFIG.DEATH_POP; e.vx = (Math.random() - 0.5) * 140; e.rotV = (Math.random() - 0.5) * 11; e.rot = 0; }
  if (e.type === 'boss') { meta.gold += CONFIG.BOSS_GOLD; meta.sp += CONFIG.BOSS_SP; player.keys += CONFIG.BOSS_KEYS_MIN + Math.floor(Math.random() * (CONFIG.BOSS_KEYS_MAX - CONFIG.BOSS_KEYS_MIN + 1)); shake = CONFIG.SHAKE_FALL; saveMeta(); }   // ボス＝鍵1-3(ストック上限無視)＋金/SP
  else { meta.gold += CONFIG.GOLD[e.type] || 0; meta.sp += CONFIG.SP[e.type] || 0; saveMeta(); player.killCount++; if (player.killCount % CONFIG.KEY_PER_KILLS === 0) player.keys = Math.min(player.keys + 1, CONFIG.KEY_STOCK); } } }

// --- スキル発動（Ctrl+WASD から呼ばれる）---
function castKenpa() { const p = player; if (p.kenpaCd > 0 || p.mp < CONFIG.KENPA_MP) return; p.mp -= CONFIG.KENPA_MP; p.kenpaCd = CONFIG.KENPA_CD; projectiles.push({ x: p.x + p.facing * p.w / 2, y: p.y, vx: p.facing * CONFIG.KENPA_V, vy: 0, r: CONFIG.KENPA_R, alive: true, friendly: true, mult: CONFIG.KENPA_MULT, pierce: 0 }); }
function castHomura() { const p = player; if (p.homuraCd > 0 || p.mp < CONFIG.HOMURA_MP) return; p.mp -= CONFIG.HOMURA_MP; p.homuraCd = CONFIG.HOMURA_CD; projectiles.push({ x: p.x + p.facing * p.w / 2, y: p.y, vx: p.facing * CONFIG.HOMURA_V, vy: 0, r: CONFIG.HOMURA_R, alive: true, friendly: true, mult: CONFIG.HOMURA_MULT, pierce: CONFIG.HOMURA_PIERCE, flame: true }); }
function castSpin() { const p = player; if (p.spinCd > 0 || p.mp < CONFIG.SPIN_MP) return; p.mp -= CONFIG.SPIN_MP; p.spinCd = CONFIG.SPIN_CD; p.spinTimer = CONFIG.SPIN_ACTIVE; for (const e of enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < CONFIG.SPIN_R + e.w / 2) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.SPIN_MULT); shake = Math.max(shake, 5); }
function castMayu() { const p = player; if (p.mayuCd > 0 || p.mp < CONFIG.MAYU_MP) return; p.mp -= CONFIG.MAYU_MP; p.mayuCd = CONFIG.MAYU_CD; p.mayuTimer = CONFIG.MAYU_DUR; }
function castRaijin() { const p = player; if (p.raijinCd > 0 || p.mp < CONFIG.RAIJIN_MP) return; p.mp -= CONFIG.RAIJIN_MP; p.raijinCd = CONFIG.RAIJIN_CD;
  const near = enemies.filter(e => e.alive && e.y > cameraY - 20 && e.y < cameraY + H + 20).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, CONFIG.RAIJIN_TARGETS);
  for (const e of near) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.RAIJIN_MULT); if (near.length) shake = Math.max(shake, 6); }
function castTri() { const p = player; if (p.triCd > 0 || p.mp < CONFIG.TRI_MP) return; p.mp -= CONFIG.TRI_MP; p.triCd = CONFIG.TRI_CD;
  for (const vy of [-CONFIG.TRI_VY_SPREAD, 0, CONFIG.TRI_VY_SPREAD]) projectiles.push({ x: p.x + p.facing * p.w / 2, y: p.y, vx: p.facing * CONFIG.KENPA_V, vy, r: CONFIG.KENPA_R, alive: true, friendly: true, mult: CONFIG.TRI_MULT, pierce: 0 }); }
const CASTERS = { kenpa: castKenpa, homura: castHomura, spin: castSpin, mayu: castMayu, raijin: castRaijin, tri: castTri };

function makeEnemy(type, x, y) {
  const base = { type, x, y, baseX: x, baseY: y, alive: true, flash: 0, phase: Math.random() * 6.28, fireCd: CONFIG.ATTACKER_FIRE_CD * (0.4 + Math.random() * 0.6) };
  if (type === 'target')   return { ...base, w: 48, h: 22, hp: CONFIG.HP_TARGET };
  if (type === 'obstacle') return { ...base, w: 42, h: 42, hp: CONFIG.HP_OBSTACLE };
  if (type === 'floater')  return { ...base, w: 40, h: 40, hp: CONFIG.HP_FLOATER };
  if (type === 'crawler')  return { ...base, w: 40, h: 38, hp: CONFIG.HP_CRAWLER, side: x < (wallL(y) + wallR(y)) / 2 ? -1 : 1, dir: Math.random() < 0.5 ? 1 : -1, anim: Math.random() };   // side=壁(-1左/+1右), dir=上下(-1上/+1下)
  if (type === 'turret')   return { ...base, w: 46, h: 46, hp: CONFIG.HP_TURRET, side: x < (wallL(y) + wallR(y)) / 2 ? -1 : 1, anim: Math.random(), windup: 0, atkPose: 0, fireCd: CONFIG.TURRET_FIRE_CD * (0.4 + Math.random() * 0.6) };
  if (type === 'assassin') { const s = x < (wallL(y) + wallR(y)) / 2 ? -1 : 1; return { ...base, w: 38, h: 44, hp: CONFIG.HP_ASSASSIN, side: s, leapDir: -s, state: 'cling', t: CONFIG.ASN_CD * (0.4 + Math.random() * 0.8), anim: 0 }; }   // side=壁, leapDir=跳ぶ向き(反対壁=主人公側)
  if (type === 'boss')     return { ...base, w: CONFIG.BOSS_W, h: CONFIG.BOSS_H, hp: CONFIG.BOSS_HP, hpMax: CONFIG.BOSS_HP, windup: 0, atkCd: CONFIG.BOSS_ATK_CD, mode: 0 };
  return { ...base, w: 44, h: 44, hp: CONFIG.HP_ATTACKER, windup: 0 };
}
function spawnBand(y, idx) {
  const wl = wallL(y), wr = wallR(y), span = Math.max(20, wr - wl - 60);
  const rx = () => wl + 30 + Math.random() * span;
  const m = -y / 100, roster = rosterAt(m), pick = () => roster[Math.floor(Math.random() * roster.length)];
  const sparse = idx % 3 === 0;                        // 密度パルス：3バンドに1回は薄く
  if (sparse && m > 30 && Math.random() < 0.5) return;  // 純登攀の休符区間
  enemies.push(makeEnemy(pick(), rx(), y));
  if (!sparse && Math.random() < Math.min(0.6, 0.2 + m / 400)) enemies.push(makeEnemy(pick(), rx(), y - 64));   // 高度で2体目↑
  if (!sparse && m > 200 && Math.random() < 0.25) enemies.push(makeEnemy(pick(), rx(), y - 120));               // 高所は3体目も
}

const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
// 当たり判定も slashReach で攻撃方向に伸縮(下/上=縦H、前=横W)＝見た目と一致
const pogoBox = () => { const h = CONFIG.POGO_H * slashReach; return { x: player.x, y: player.y + player.h / 2 + CONFIG.POGO_REACH + h / 2, w: CONFIG.POGO_W, h }; };
const upBox = () => { const h = CONFIG.UPATK_H * slashReach; return { x: player.x, y: player.y - player.h / 2 - CONFIG.UPATK_REACH - h / 2, w: CONFIG.UPATK_W, h }; };
const nailBox = () => { const w = CONFIG.NAIL_W * slashReach; return { x: player.x + player.facing * (player.w / 2 + CONFIG.NAIL_REACH + w / 2), y: player.y, w, h: CONFIG.NAIL_H }; };

function update(dt) {
  if (inHideout) return;   // 横穴中はクライム停止
  const p = player;
  const wk = hasCharm('wkick') ? CONFIG.WKICK_BONUS : 1;   // 壁キック延長チャーム
  if (jumpBuffer > 0) jumpBuffer -= dt;
  if (p.iframe > 0) p.iframe -= dt;
  for (const k of ['pogoCd','upCd','nailCd','spinCd','kenpaCd','homuraCd','mayuCd','raijinCd','triCd','pogoTimer','upTimer','nailTimer','spinTimer','mayuTimer']) if (p[k] > 0) p[k] -= dt;
  if (shake > 0) shake = Math.max(0, shake - 60 * dt);
  if (hp0flash > 0) hp0flash -= dt;
  if (p.mp < maxMP()) p.mp = Math.min(maxMP(), p.mp + CONFIG.MP_REGEN * dt);

  const inX = (held.right() ? 1 : 0) - (held.left() ? 1 : 0);

  if (p.state === 'fallStun') {
    p.fallStun -= dt;
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL * 1.15 * (hasCharm('para') ? CONFIG.PARA_FALL : 1));   // パラシュート
    if (p.fallStun <= 0) { p.state = 'air'; p.hpQ = maxQ(); }
  } else if (p.state === 'cling') {
    p.vx = 0; p.lastWall = p.clingWall; p.clingHold += dt; p.airJumps = 0;
    const over = p.clingHold - CONFIG.CLING_GRIP_TIME;
    p.vy = over > 0 ? Math.min(CONFIG.CLING_SLIDE_MAX, over * CONFIG.CLING_SLIDE_ACCEL) : 0;
    const grip = (p.clingWall < 0 && keys['KeyA']) || (p.clingWall > 0 && keys['KeyD']);   // 生キー＝左Shift(スキル)中でも壁を掴み続ける
    if (jumpBuffer > 0) { const dir = -p.clingWall; p.vx = CONFIG.WALLKICK_VX * dir * wk; p.vy = CONFIG.WALLKICK_VY * wk; p.facing = dir; p.state = 'air'; p.clingWall = 0; p.coyote = 0; jumpBuffer = 0; }
    else if (!grip) { p.state = 'air'; p.coyote = CONFIG.COYOTE; p.clingWall = 0; }
  } else {
    if (p.coyote > 0) p.coyote -= dt;
    if (inX !== 0) { p.vx += inX * CONFIG.AIR_ACCEL * dt; p.facing = inX; }
    else { const s = Math.sign(p.vx); p.vx -= s * CONFIG.AIR_FRICTION * dt; if (Math.sign(p.vx) !== s) p.vx = 0; }
    p.vx = Math.max(-CONFIG.MAX_AIR_X, Math.min(CONFIG.MAX_AIR_X, p.vx));
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    if (jumpBuffer > 0) {
      if (p.grounded) { p.vy = CONFIG.GROUND_JUMP_VY; p.grounded = false; jumpBuffer = 0; }
      else if (p.coyote > 0 && p.lastWall !== 0) { const dir = -p.lastWall; p.vx = CONFIG.WALLKICK_VX * dir * wk; p.vy = CONFIG.WALLKICK_VY * wk; p.facing = dir; p.coyote = 0; jumpBuffer = 0; }
      else if (hasCharm('djump') && p.airJumps < 1) { p.vy = CONFIG.GROUND_JUMP_VY * 0.92; p.airJumps++; jumpBuffer = 0; }   // 二段ジャンプ
    }
  }

  // 攻撃＆スキル（fallStun中は不可）
  if (p.state === 'air' || p.state === 'cling') {
    if (held.down() && (attackEdge || keys['Enter'] || keys['NumpadEnter']) && p.pogoCd <= 0 && p.pogoTimer <= 0) { p.pogoTimer = CONFIG.POGO_ACTIVE; p.pogoCd = CONFIG.POGO_COOLDOWN; p.pogoHitThisSwing = false; }
    if (attackEdge && held.up() && p.upCd <= 0 && p.upTimer <= 0) { p.upTimer = CONFIG.UPATK_ACTIVE; p.upCd = CONFIG.UPATK_COOLDOWN; p.upHitThisSwing = false; }
    if (attackEdge && !held.up() && !held.down() && p.nailCd <= 0 && p.nailTimer <= 0) { p.nailTimer = CONFIG.NAIL_ACTIVE; p.nailCd = CONFIG.NAIL_COOLDOWN; p.nailHitThisSwing = false; }
    for (const dir of ['W','A','S','D']) if (skillEdge[dir]) { const id = meta.slots[dir]; if (CASTERS[id]) CASTERS[id](); }
  }
  attackEdge = false; skillEdge.W = skillEdge.A = skillEdge.S = skillEdge.D = false;

  if (autoRise) { p.state = 'air'; p.clingWall = 0; p.fallStun = 0; p.grounded = false; p.vy = -2000; p.vx = inX * 260; p.iframe = CONFIG.IFRAME; }   // デバッグ：一定速で上昇（左右は手動微調整可）
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.state === 'cling') p.x = p.clingWall < 0 ? wallL(p.y) + p.w / 2 : wallR(p.y) - p.w / 2;   // 波形壁に密着＝ズリ落ち中も浮かない

  let side = 0; const wl = wallL(p.y), wr = wallR(p.y);
  if (p.x - p.w / 2 <= wl) { p.x = wl + p.w / 2; side = -1; }
  else if (p.x + p.w / 2 >= wr) { p.x = wr - p.w / 2; side = 1; }
  if (side !== 0 && p.state === 'air') {
    const toward = (side < 0 && keys['KeyA']) || (side > 0 && keys['KeyD']);
    if (toward) { p.state = 'cling'; p.clingWall = side; p.clingHold = 0; p.vx = 0; p.vy = 0; p.facing = -side; }
    else p.vx = 0;
  }
  if (p.y >= 0) { if (p.vy > 700) shake = Math.max(shake, 6); p.y = 0; p.vy = 0; p.grounded = true; p.airJumps = 0; if (p.state === 'fallStun') { p.state = 'air'; p.hpQ = maxQ(); } }
  else p.grounded = false;
  for (const pl of platforms) { const top = pl.y - pl.h / 2; if (p.state !== 'cling' && p.vy >= 0 && p.x + p.w / 2 > pl.x - pl.w / 2 && p.x - p.w / 2 < pl.x + pl.w / 2 && p.y + p.h / 2 >= top && p.y + p.h / 2 <= top + 22 + p.vy * dt) { p.y = top - p.h / 2; p.vy = 0; p.grounded = true; p.airJumps = 0; } }   // ボスの一時足場に片面着地＝footing
  if (p.grounded && p.state === 'air') p.x += inX * 180 * dt;

  while (spawnTopY > cameraY - H) { spawnBand(spawnTopY, bandIndex++); spawnTopY -= CONFIG.BAND_GAP; }

  const pg = pogoBox(), ub = upBox(), nb = nailBox();
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.dead) { e.vy += CONFIG.DEATH_GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.rotV * dt; const dwl = wallL(e.y) + e.w / 2, dwr = wallR(e.y) - e.w / 2; if (e.x < dwl) { e.x = dwl; e.vx = Math.abs(e.vx) * 0.5; } else if (e.x > dwr) { e.x = dwr; e.vx = -Math.abs(e.vx) * 0.5; } if (e.y > cameraY + H + 140) e.alive = false; continue; }   // 死体＝回転落下。壁は絶対境界=越えずバウンド→画面外で削除
    if (e.y > cameraY + H + 80) continue;   // 画面下へ去った生存敵＝凍結保持（スルー敵は座標に残り、降りれば再会／倒すまで消えない）
    if (e.flash > 0) e.flash -= dt;
    if (e.type === 'target') e.y += CONFIG.FALLER_VY * dt;
    else if (e.type === 'obstacle') e.y += CONFIG.OBSTACLE_VY * dt;
    else if (e.type === 'floater') { e.phase += dt * CONFIG.FLOAT_SPEED; e.x = e.baseX + Math.sin(e.phase) * CONFIG.FLOAT_DRIFT_X; e.y = e.baseY + Math.cos(e.phase * 0.8) * CONFIG.FLOAT_DRIFT_Y; }
    else if (e.type === 'crawler') { e.anim += dt; e.y += e.dir * CONFIG.CRAWL_VX * dt; if (e.y < e.baseY - CONFIG.CRAWL_RANGE) e.dir = 1; else if (e.y > e.baseY + CONFIG.CRAWL_RANGE) e.dir = -1; e.x = e.side > 0 ? wallR(e.y) - e.w / 2 : wallL(e.y) + e.w / 2; }   // 壁に張り付き上下パトロール
    else if (e.type === 'turret') { e.anim += dt; e.x = e.side > 0 ? wallR(e.y) - e.w / 2 : wallL(e.y) + e.w / 2; if (e.atkPose > 0) e.atkPose -= dt; if (e.y > cameraY - 40 && e.y < cameraY + H + 40) { if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) { fireAt(e, CONFIG.TURRET_PROJ_V); e.fireCd = CONFIG.TURRET_FIRE_CD; e.atkPose = CONFIG.TURRET_ATK_POSE; } } else { e.fireCd -= dt; if (e.fireCd <= 0) e.windup = CONFIG.TELEGRAPH_LEAD; } } }   // 壁固定砲台：ため→遅い弾→解放
    else if (e.type === 'assassin') {
      e.anim += dt;
      if (e.state === 'leap') {
        const k = 1 - e.t / CONFIG.ASN_LEAP;
        e.x = e.sx + (e.ex - e.sx) * k; e.y = e.sy0 + (e.ey - e.sy0) * k - Math.sin(k * Math.PI) * 36;   // 主人公側へ突進(軽い山なり)
        e.t -= dt;
        if (e.t <= 0) { e.state = 'land'; e.t = CONFIG.ASN_LAND; e.side = -e.side; e.leapDir = -e.side; }
      } else {
        e.x = e.side > 0 ? wallR(e.y) - e.w / 2 : wallL(e.y) + e.w / 2; e.t -= dt;   // 壁に張り付き
        if (e.t <= 0) {
          if (e.state === 'cling') { if (e.y > cameraY - 40 && e.y < cameraY + H + 40) { e.state = 'windup'; e.t = CONFIG.ASN_WINDUP; } else e.t = 0.4; }
          else if (e.state === 'windup') { e.state = 'leap'; e.t = CONFIG.ASN_LEAP; e.sx = e.x; e.sy0 = e.y; e.leapDir = -e.side; e.ey = Math.max(e.y - 130, Math.min(e.y + 130, player.y)); e.ex = e.leapDir > 0 ? wallR(e.ey) - e.w / 2 : wallL(e.ey) + e.w / 2; }
          else { e.state = 'cling'; e.t = CONFIG.ASN_CD * (0.6 + Math.random() * 0.8); }
        }
      }
    }
    else if (e.type === 'boss') {
      e.phase += dt * CONFIG.BOSS_PHASE_SPD;
      e.x = e.baseX + Math.sin(e.phase) * CONFIG.BOSS_DRIFT_X; e.y = e.baseY + Math.sin(e.phase * 0.7) * CONFIG.BOSS_BOB_Y;
      const bwl = wallL(e.y), bwr = wallR(e.y); e.x = Math.max(bwl + e.w / 2, Math.min(bwr - e.w / 2, e.x));
      if (e.y > cameraY - 80 && e.y < cameraY + H + 80) { if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) { e.mode === 0 ? bossVolley(e) : bossPillars(e); e.mode ^= 1; e.atkCd = CONFIG.BOSS_ATK_CD; } } else { e.atkCd -= dt; if (e.atkCd <= 0) e.windup = CONFIG.BOSS_WINDUP; } }
    }
    else { e.phase += dt * CONFIG.FLOAT_SPEED * 0.6; e.x = e.baseX + Math.sin(e.phase) * CONFIG.ATTACKER_DRIFT_X; const onScr = e.y > cameraY - 40 && e.y < cameraY + H + 40; if (onScr) { if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) { fireAt(e); e.fireCd = CONFIG.ATTACKER_FIRE_CD; } } else { e.fireCd -= dt; if (e.fireCd <= 0) e.windup = CONFIG.TELEGRAPH_LEAD; } } }

    { const cwl = wallL(e.y) + e.w / 2, cwr = wallR(e.y) - e.w / 2; if (cwl < cwr) e.x = Math.max(cwl, Math.min(cwr, e.x)); }   // 壁=絶対境界：全敵を壁内にクランプ(落下/ドリフトでも越えさせない)
    if (p.pogoTimer > 0 && !p.pogoHitThisSwing && overlap(pg.x, pg.y, pg.w, pg.h, e.x, e.y, e.w, e.h)) { hitEnemy(e, CONFIG.ATK_BASE * CONFIG.POGO_MULT); p.vy = CONFIG.POGO_BOUNCE; p.pogoHitThisSwing = true; p.pogoTimer = 0; p.coyote = 0; shake = Math.max(shake, 4); }
    if (e.alive && p.upTimer > 0 && !p.upHitThisSwing && overlap(ub.x, ub.y, ub.w, ub.h, e.x, e.y, e.w, e.h)) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.UPATK_MULT);
    if (e.alive && p.nailTimer > 0 && !p.nailHitThisSwing && overlap(nb.x, nb.y, nb.w, nb.h, e.x, e.y, e.w, e.h)) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.NAIL_MULT);
    if (e.alive) { const dq = e.type === 'obstacle' ? CONFIG.DMG_OBSTACLE : e.type === 'floater' ? CONFIG.DMG_FLOATER : e.type === 'attacker' ? CONFIG.DMG_ATTACKER : e.type === 'assassin' ? CONFIG.DMG_ASSASSIN : e.type === 'boss' ? CONFIG.DMG_BOSS : CONFIG.DMG_TARGET; if (overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) { if (hasCharm('kiba') && e.flash <= 0) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.KIBA_MULT); if (e.alive && dq > 0) damage(dq, -480); } }
  }
  if (p.upTimer > 0) p.upHitThisSwing = true;
  if (p.nailTimer > 0) p.nailHitThisSwing = true;

  for (const pr of projectiles) {
    if (!pr.alive) continue;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.friendly) {
      for (const e of enemies) {
        if (!e.alive || (pr.hit && pr.hit.has(e))) continue;
        if (overlap(pr.x, pr.y, pr.r * 2, pr.r * 2, e.x, e.y, e.w, e.h)) {
          hitEnemy(e, CONFIG.ATK_BASE * pr.mult); (pr.hit || (pr.hit = new Set())).add(e);
          if (pr.pierce > 0) pr.pierce--; else { pr.alive = false; break; }
        }
      }
      if (pr.x < wallL(pr.y) || pr.x > wallR(pr.y)) pr.alive = false;
    } else {
      if (overlap(p.x, p.y, p.w, p.h, pr.x, pr.y, pr.r * 2, pr.r * 2)) { damage(CONFIG.DMG_PROJECTILE, -360); pr.alive = false; }
      if (pr.x < wallL(pr.y) - 20 || pr.x > wallR(pr.y) + 20) pr.alive = false;
    }
    if (pr.y > cameraY + H + 80 || pr.y < cameraY - 120) pr.alive = false;
  }

  enemies = enemies.filter(e => e.alive && e.y < cameraY + H + CONFIG.ENEMY_KEEP);   // 死んだ敵=倒したら恒久消滅／生存(スルー)敵は遥か下まで保持→降りれば再会
  projectiles = projectiles.filter(pr => pr.alive);
  for (const sp of sparks) { sp.life -= dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 700 * dt; sp.vx *= 0.92; }
  sparks = sparks.filter(sp => sp.life > 0);
  for (const pl of platforms) pl.life -= dt; platforms = platforms.filter(pl => pl.life > 0);

  const h = Math.max(0, -p.y); if (h > maxHeight) maxHeight = h; if (maxHeight > meta.bestHeight) meta.bestHeight = maxHeight;
  if (maxHeight / 100 >= bossNextH) { bossNextH += CONFIG.BOSS_EVERY; if (!enemies.some(e => e.type === 'boss' && e.alive)) spawnBoss(); }   // 高度BOSS_EVERY毎にボス(在ボス中は次の閾値まで持ち越し)
  cameraY += ((p.y - H * CONFIG.CAM_FOLLOW) - cameraY) * Math.min(1, CONFIG.CAM_LERP * dt);
}

function fireAt(e, v) { v = v || CONFIG.PROJECTILE_V; const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1; projectiles.push({ x: e.x, y: e.y, vx: dx / d * v, vy: dy / d * v, r: 7, alive: true, friendly: false }); }
function spawnBoss() { const by = player.y - 300, bx = (wallL(by) + wallR(by)) / 2; enemies.push(makeEnemy('boss', bx, by)); shake = Math.max(shake, 8); }   // 画面上部(HUD下)に出現＝プレイヤーが登って遭遇
function bossVolley(e) { const base = Math.atan2(player.y - e.y, player.x - e.x), n = CONFIG.BOSS_VOLLEY; for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * CONFIG.BOSS_VOLLEY_SPREAD; projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * CONFIG.PROJECTILE_V, vy: Math.sin(a) * CONFIG.PROJECTILE_V, r: 8, alive: true, friendly: false }); } }
function bossPillars(e) { const wl = wallL(e.y), span = wallR(e.y) - wl; for (let i = 0; i < CONFIG.PLAT_COUNT; i++) platforms.push({ x: wl + span * (i + 1) / (CONFIG.PLAT_COUNT + 1), y: e.y + CONFIG.BOSS_H * 0.7 + i * 42, w: CONFIG.PLAT_W, h: CONFIG.PLAT_H, life: CONFIG.PLAT_LIFE }); }

// ---- render ----
function sy(worldY) { return worldY - cameraY; }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawWalls(bio) {
  const step = 12;
  ctx.fillStyle = bio.wall;
  ctx.beginPath(); ctx.moveTo(0, 0); for (let s = 0; s <= H; s += step) ctx.lineTo(wallL(cameraY + s), s); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); for (let s = 0; s <= H; s += step) ctx.lineTo(wallR(cameraY + s), s); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = bio.line; ctx.lineWidth = 2;
  const start = Math.floor(cameraY / 100) * 100;
  for (let wy = start; wy < cameraY + H; wy += 100) { const y = sy(wy); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wallL(wy), y); ctx.moveTo(wallR(wy), y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = bio.line; ctx.lineWidth = 3;
  ctx.beginPath(); for (let s = 0; s <= H; s += step) { const x = wallL(cameraY + s); s === 0 ? ctx.moveTo(x, s) : ctx.lineTo(x, s); } ctx.stroke();
  ctx.beginPath(); for (let s = 0; s <= H; s += step) { const x = wallR(cameraY + s); s === 0 ? ctx.moveTo(x, s) : ctx.lineTo(x, s); } ctx.stroke();
}
function drawEnemy(e) {
  const y = sy(e.y), x = e.x, flash = e.flash > 0;
  if (e.dead) {   // 死体：死亡コマを回転させながら落下
    ctx.save(); ctx.translate(x, y); ctx.rotate(e.rot || 0);
    const corpse = e.type === 'crawler' ? e01r[4] : e.type === 'turret' ? e06[6] : e.type === 'assassin' ? e03d[3] : null;   // crawler=崩れ/turret=萎れ/assassin=死亡#4
    if (corpse && corpse.ok) { const dh = e.type === 'turret' ? CONFIG.TURRET_DRAW_H : CONFIG.CRAWL_DRAW_H, dw = dh * corpse.width / corpse.height; ctx.drawImage(corpse, -dw / 2, -dh / 2, dw, dh); }
    else { ctx.fillStyle = '#6b7280'; roundRect(-e.w / 2, -e.h / 2, e.w, e.h, 6); ctx.fill(); }   // コード敵の死体(灰箱)
    ctx.restore(); return;
  }
  if (e.type === 'target') { ctx.fillStyle = flash ? '#fff' : '#27ae60'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 5); ctx.fill(); ctx.fillStyle = '#9be8bd'; ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x, y + 5); ctx.fill(); return; }
  if (e.type === 'obstacle') { ctx.fillStyle = flash ? '#fff' : '#c0392b'; const s = e.w / 2; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); return; }
  if (e.type === 'floater') { ctx.fillStyle = flash ? '#fff' : '#16a2b8'; ctx.beginPath(); ctx.arc(x, y, e.w / 2, 0, 6.2832); ctx.fill(); ctx.strokeStyle = '#0d6f7e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, e.w / 2 - 5, 0, 6.2832); ctx.stroke(); return; }
  if (e.type === 'crawler') {
    const img = e01r[Math.floor(e.anim / CONFIG.CRAWL_FRAME_T) % 4];   // crawl4コマループ
    ctx.save(); ctx.translate(x, y); ctx.rotate(e.side > 0 ? -Math.PI / 2 : Math.PI / 2);   // 脚を壁へ向ける＝壁に張り付く
    if (img && img.ok) { const dh = CONFIG.CRAWL_DRAW_H, dw = dh * (img.width / img.height); ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); }
    else { ctx.fillStyle = flash ? '#fff' : '#d8c8a8'; ctx.beginPath(); ctx.arc(0, 0, e.w / 2, 0, 6.2832); ctx.fill(); }
    ctx.restore(); return;
  }
  if (e.type === 'turret') {
    let idx;
    if (e.windup > 0) idx = (1 - e.windup / CONFIG.TELEGRAPH_LEAD) < 0.5 ? 2 : 3;   // ため(触手を内に窄める)
    else if (e.atkPose > 0) idx = e.atkPose > CONFIG.TURRET_ATK_POSE * 0.5 ? 4 : 5;  // 解放
    else idx = Math.floor(e.anim / CONFIG.TURRET_PULSE_T) % 2;                       // 鼓動
    const img = e06[idx];
    ctx.save(); ctx.translate(x, y); ctx.rotate(e.side > 0 ? -Math.PI / 2 : Math.PI / 2);   // 根を壁へ＝壁から生える
    if (img && img.ok) { const dh = CONFIG.TURRET_DRAW_H, dw = dh * (img.width / img.height); ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); }
    else { ctx.fillStyle = flash ? '#fff' : '#cdbf9a'; ctx.beginPath(); ctx.arc(0, 0, e.w / 2, 0, 6.2832); ctx.fill(); }
    if (e.windup > 0) { const t = 1 - e.windup / CONFIG.TELEGRAPH_LEAD; ctx.strokeStyle = `rgba(255,80,80,${0.3 + 0.5 * t})`; ctx.lineWidth = 2 + 3 * t; ctx.beginPath(); ctx.arc(0, 0, 22 + 16 * t, 0, 6.2832); ctx.stroke(); }   // ため視認リング
    ctx.restore(); return;
  }
  if (e.type === 'assassin') {
    const set = e.leapDir > 0 ? e03r : e03l;
    let idx;
    if (e.state === 'cling') idx = 0;
    else if (e.state === 'windup') idx = Math.min(2, 1 + Math.floor((1 - e.t / CONFIG.ASN_WINDUP) * 2));   // ため
    else if (e.state === 'leap') { const k = 1 - e.t / CONFIG.ASN_LEAP; idx = Math.min(set.length - 2, 3 + Math.floor(k * (set.length - 3))); }   // 跳→空中→攻撃
    else idx = set.length - 1;   // 着地
    const img = set[idx];
    if (img && img.ok) { const dh = CONFIG.ASN_DRAW_H, dw = dh * (img.width / img.height); ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh); }
    else { ctx.fillStyle = flash ? '#fff' : '#8a4a4a'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 6); ctx.fill(); }
    if (e.state === 'leap') { const k = 1 - e.t / CONFIG.ASN_LEAP; const bimg = boomImgs[Math.min(4, Math.floor(k * 5))]; if (bimg && bimg.ok) { const bh = CONFIG.ASN_BOOM_H, bw = bh * bimg.width / bimg.height; ctx.save(); ctx.translate(x + e.leapDir * CONFIG.ASN_BOOM_OFF, y); if (e.leapDir < 0) ctx.scale(-1, 1); ctx.drawImage(bimg, -bw / 2, -bh / 2, bw, bh); ctx.restore(); } }   // 突撃ソニックブーム：先端の少し先・進行でコマ送り(小→ピーク→減衰)
    if (e.state === 'windup') { const t = 1 - e.t / CONFIG.ASN_WINDUP; ctx.strokeStyle = `rgba(255,80,80,${0.3 + 0.5 * t})`; ctx.lineWidth = 2 + 3 * t; ctx.beginPath(); ctx.arc(x, y, 24 + 14 * t, 0, 6.2832); ctx.stroke(); }   // ため視認リング
    return;
  }
  if (e.type === 'boss') {
    const t = e.windup > 0 ? 1 - e.windup / CONFIG.BOSS_WINDUP : 0;
    ctx.fillStyle = flash ? '#fff' : '#6c2bd9'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 16); ctx.fill();
    ctx.strokeStyle = '#b794f6'; ctx.lineWidth = 3; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 16); ctx.stroke();
    ctx.fillStyle = e.windup > 0 ? '#ff5050' : (e.mode === 0 ? '#f6d365' : '#7ee8c0'); ctx.beginPath(); ctx.arc(x, y, 16, 0, 6.2832); ctx.fill();
    if (e.windup > 0) { ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.5 * t})`; ctx.lineWidth = 3 + 5 * t; ctx.beginPath(); ctx.arc(x, y, 24 + 40 * t, 0, 6.2832); ctx.stroke(); }
    return;
  }
  ctx.fillStyle = flash ? '#fff' : '#8e44ad'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 8); ctx.fill();
  if (e.windup > 0) { const t = 1 - e.windup / CONFIG.TELEGRAPH_LEAD; ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.5 * t})`; ctx.lineWidth = 2 + 3 * t; ctx.beginPath(); ctx.arc(x, y, 10 + 14 * t, 0, 6.2832); ctx.stroke(); }
  ctx.fillStyle = e.windup > 0 ? '#ff5050' : '#f1c40f'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fill();
}
function spriteKey() {
  const p = player;
  let act = 'idle';
  if (p.state === 'fallStun') act = 'fall';
  else if (p.state === 'cling') act = 'cling';
  else if (p.pogoTimer > 0) act = 'pogo';
  else if (p.upTimer > 0) act = 'up';
  else if (p.nailTimer > 0) act = 'atk';
  else if (p.vy < -60) act = 'jump';
  else if (p.vy > 120) act = 'fall';
  else if (p.grounded && Math.abs(p.vx) > 30) act = 'run';
  const dir = (p.state === 'cling') ? (p.clingWall > 0 ? 'r' : 'l') : (p.facing < 0 ? 'l' : 'r');   // しがみつきは壁側で向き決定
  return act + '_' + dir;
}
function drawSlash(cx, cy, prog, mode) {
  // 5コマをprogで送り(立体)＋上から下へクリップで伸ばす(軌道描き)→終わりにフェード。発光なし=キャラと同タッチ
  const fi = Math.min(SLASH_FRAMES - 1, Math.max(0, Math.floor(prog * SLASH_FRAMES)));
  const img = slashImgs[fi];
  if (!img || !img.ok) return;
  const dh = SLASH_H, dw = dh * (img.width / img.height) * slashReach;   // slashReach=射程倍率(攻撃方向へ伸ばす)
  const r = Math.min(1, prog / 0.30);                                   // 序盤で一気に上から描き切る(その後は全部表示=切れて見えない)
  const a = prog < 0.78 ? 1 : Math.max(0, 1 - (prog - 0.78) / 0.22);    // 出切った弧をしっかり見せてから後半フェード
  ctx.save();
  ctx.globalAlpha = a;
  if (mode === 'right')      { ctx.translate(cx + SLASH_OFF, cy); ctx.scale(-1, 1); }    // 右＝水平反転(凸を右へ・上下は保持)
  else if (mode === 'left')  { ctx.translate(cx - SLASH_OFF, cy); }                      // 左＝そのまま(凸が左)
  else if (mode === 'down')  { ctx.translate(cx, cy + SLASH_OFF); ctx.rotate(-Math.PI / 2); }
  else /* up */              { ctx.translate(cx, cy - SLASH_OFF); ctx.rotate(Math.PI / 2); }
  ctx.beginPath(); ctx.rect(-dw / 2, -dh / 2, dw, dh * r); ctx.clip();  // 上端からr割の帯だけ＝軌道を順に表示
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
function drawPlayer() {
  const p = player, x = p.x, y = sy(p.y);
  if (p.iframe > 0 && Math.floor(p.iframe * 20) % 2 === 0) return;
  const img = sprites[spriteKey()];
  if (img && img.ok) { const dh = CONFIG.PLAYER_DRAW_H, dw = dh * (img.width / img.height); const dx = p.state === 'cling' ? x - p.clingWall * CONFIG.CLING_DRAW_OFF : x; ctx.drawImage(img, dx - dw / 2, y + p.h / 2 - dh * CONFIG.SPRITE_FEET_FRAC, dw, dh); }   // 足基準接地／しがみつきは壁から離す／左右はスプライト内包
  else { ctx.fillStyle = p.state === 'fallStun' ? '#e74c3c' : p.state === 'cling' ? '#5dade2' : '#ecf0f1'; roundRect(x - p.w / 2, y - p.h / 2, p.w, p.h, 5); ctx.fill(); ctx.fillStyle = '#1b2430'; ctx.fillRect(x + p.facing * 6 - 3, y - 14, 6, 6); }
  if (p.mayuTimer > 0) { ctx.strokeStyle = `rgba(120,210,160,${0.4 + 0.3 * Math.sin(p.mayuTimer * 12)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, p.w, 0, 6.2832); ctx.stroke(); } // 守護の繭
}
function render() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const bio = biomeAt(-(cameraY + H * CONFIG.CAM_FOLLOW) / 100);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, bio.bgTop); g.addColorStop(1, bio.bgBottom);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  drawWalls(bio);
  if (sy(0) < H) { ctx.fillStyle = bio.line; ctx.fillRect(wallL(0), sy(0), wallR(0) - wallL(0), H); }
  for (const e of enemies) { const y = sy(e.y); if (y < -140 || y > H + 140) continue; drawEnemy(e); }
  for (const pl of platforms) { const py = sy(pl.y); if (py < -40 || py > H + 40) continue; const a = Math.min(1, pl.life / 1.2); ctx.fillStyle = `rgba(126,232,192,${0.3 + 0.45 * a})`; roundRect(pl.x - pl.w / 2, py - pl.h / 2, pl.w, pl.h, 5); ctx.fill(); ctx.strokeStyle = `rgba(180,255,230,${0.6 * a})`; ctx.lineWidth = 2; ctx.stroke(); }   // ボスの一時足場(寿命で点滅消失)
  for (const pr of projectiles) { ctx.fillStyle = pr.flame ? '#ffb347' : pr.friendly ? '#cdebff' : '#f6d365'; ctx.beginPath(); ctx.arc(pr.x, sy(pr.y), pr.r, 0, 6.2832); ctx.fill(); }
  drawPlayer();
  if (sparks.length) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const sp of sparks) { const a = Math.min(1, sp.life * 6); ctx.fillStyle = `rgba(255,248,205,${a})`; ctx.beginPath(); ctx.arc(sp.x, sy(sp.y), 2.6, 0, 6.2832); ctx.fill(); } ctx.restore(); }   // 着弾火花
  const p = player;
  if (p.pogoTimer > 0) drawSlash(p.x, sy(p.y) + p.h / 2, 1 - p.pogoTimer / CONFIG.POGO_ACTIVE, 'down');            // 下＝凸を下へ
  if (p.upTimer > 0) drawSlash(p.x, sy(p.y) - p.h / 2, 1 - p.upTimer / CONFIG.UPATK_ACTIVE, 'up');                 // 上＝凸を上へ
  if (p.nailTimer > 0) drawSlash(p.x + p.facing * p.w / 2, sy(p.y), 1 - p.nailTimer / CONFIG.NAIL_ACTIVE, p.facing < 0 ? 'left' : 'right');   // 前＝凸を進行方向へ
  if (p.spinTimer > 0) { ctx.strokeStyle = `rgba(255,255,255,${0.5 * p.spinTimer / CONFIG.SPIN_ACTIVE})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, sy(p.y), CONFIG.SPIN_R, 0, 6.2832); ctx.stroke(); }
  ctx.restore();
  if (hp0flash > 0) { ctx.fillStyle = `rgba(200,40,40,${0.4 * Math.max(0, hp0flash / 0.5)})`; ctx.fillRect(0, 0, W, H); }
  drawHUD();
  { const boss = enemies.find(e => e.type === 'boss' && e.alive && e.y > cameraY - 80 && e.y < cameraY + H + 80); if (boss) { const bw = W - 80, bx = 40, byy = 92; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx - 2, byy - 2, bw + 4, 12); ctx.fillStyle = '#6c2bd9'; ctx.fillRect(bx, byy, bw * Math.max(0, boss.hp / boss.hpMax), 8); ctx.strokeStyle = '#b794f6'; ctx.lineWidth = 1; ctx.strokeRect(bx, byy, bw, 8); ctx.fillStyle = '#cbb6f0'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('BOSS', W / 2, byy - 3); ctx.textAlign = 'left'; } }
  if (inHideout) drawHideout();
  else if (skillMod()) drawSkillRadial();
  if (paused) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PAUSE (P)', W / 2, H / 2); ctx.textAlign = 'left'; }
  if (invincible || autoRise || slashReach !== 1) { ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'right'; ctx.fillText('DEBUG ' + (invincible ? '∞無敵(I) ' : '') + (autoRise ? '↑上昇(O) ' : '') + (slashReach !== 1 ? '射程x' + slashReach + '(L)' : ''), W - 8, H - 10); ctx.textAlign = 'left'; }
}
function drawHUD() {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eaf2ff'; ctx.font = 'bold 22px system-ui'; ctx.fillText(`${(maxHeight / 100).toFixed(1)} m`, 14, 30);
  ctx.fillStyle = '#7f8ca0'; ctx.font = '10px system-ui'; ctx.fillText(`BEST ${(meta.bestHeight / 100).toFixed(1)}m`, 96, 21);
  ctx.fillText(biomeAt(Math.max(0, -player.y) / 100).name, 96, 33);
  ctx.textAlign = 'right'; ctx.font = 'bold 13px system-ui';
  ctx.fillStyle = '#f1c40f'; ctx.fillText(`◆${meta.gold}`, W - 12, 22);
  ctx.fillStyle = '#a99bff'; ctx.fillText(`SP ${meta.sp}`, W - 12, 40);
  ctx.fillStyle = '#e6e1c8'; ctx.fillText(`🔑${player.keys}`, W - 12, 58);
  ctx.textAlign = 'left';
  const total = maxQ(); let px = 14;
  for (let i = 0; i < total; i++) { ctx.fillStyle = i < player.hpQ ? '#e74c3c' : '#3a4150'; roundRect(px, 44, 7, 14, 2); ctx.fill(); px += 9; if ((i + 1) % CONFIG.QPH === 0) px += 6; }
  ctx.fillStyle = '#22303f'; ctx.fillRect(14, 64, 96, 7);
  ctx.fillStyle = '#48b1d6'; ctx.fillRect(14, 64, 96 * (player.mp / maxMP()), 7);
  if (player.state === 'cling') { const gg = Math.max(0, 1 - player.clingHold / CONFIG.CLING_GRIP_TIME); ctx.font = '11px system-ui'; ctx.fillStyle = gg > 0 ? '#5dade2' : '#e67e22'; ctx.fillText((gg > 0 ? 'つかまり中' : 'ずり落ち！') + (player.keys > 0 ? '  E:横穴' : ''), 118, 72); }
}
// 左Shiftホールド中：画面中央に上下左右(W↑/S↓/A←/D→)でセット済みスキルを簡易ポップ表示
function drawSkillRadial() {
  const cx = W / 2, cy = H * 0.46, R = 80;
  const pos = { W: [cx, cy - R], S: [cx, cy + R], A: [cx - R, cy], D: [cx + R, cy] };
  const arrow = { W: '↑', S: '↓', A: '←', D: '→' };
  ctx.strokeStyle = 'rgba(130,150,180,.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy - R + 16); ctx.lineTo(cx, cy + R - 16); ctx.moveTo(cx - R + 32, cy); ctx.lineTo(cx + R - 32, cy); ctx.stroke();
  ctx.textAlign = 'center';
  for (const k of ['W', 'A', 'S', 'D']) {
    const m = SKILL_META[meta.slots[k]]; if (!m) continue;
    const [x, y] = pos[k], cost = CONFIG[m.mp], cd = player[m.cd] || 0, usable = player.mp >= cost && cd <= 0, w = 80, h = 34;
    ctx.fillStyle = usable ? 'rgba(40,56,76,.94)' : 'rgba(20,26,34,.9)'; roundRect(x - w / 2, y - h / 2, w, h, 7); ctx.fill();
    ctx.strokeStyle = usable ? '#5dade2' : '#39424f'; ctx.lineWidth = 1.5; ctx.stroke();
    if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(x - w / 2, y - h / 2, w * Math.min(1, cd / (CONFIG[m.cdMax] || 1)), h, 7); ctx.fill(); }
    ctx.fillStyle = usable ? '#eaf4ff' : '#6b7686'; ctx.font = 'bold 14px system-ui'; ctx.fillText(`${arrow[k]} ${m.name}`, x, y - 1);
    ctx.font = '10px system-ui'; ctx.fillStyle = usable ? '#9fc4dd' : '#566273'; ctx.fillText(`MP ${cost}`, x, y + 12);
  }
  ctx.textAlign = 'left';
}

// ---- 横穴（ベンチ＋店）----
function buildHideoutRows() {
  const rows = [{ header: '── 器（カケラ4個で器1個・購入でベンチ全回復）──' }];
  rows.push({ label: `HPカケラ 購入  [${meta.heartShards}/4]  最大ハート ${CONFIG.HEARTS_MAX + meta.heartsBonus}/${CONFIG.HEARTS_CAP}${CONFIG.HEARTS_MAX + meta.heartsBonus >= CONFIG.HEARTS_CAP ? ' MAX' : ''}`, cost: `◆${CONFIG.HEART_SHARD_GOLD}`, can: meta.gold >= CONFIG.HEART_SHARD_GOLD && (CONFIG.HEARTS_MAX + meta.heartsBonus) < CONFIG.HEARTS_CAP,
    act: () => { meta.gold -= CONFIG.HEART_SHARD_GOLD; if (++meta.heartShards >= 4) { meta.heartShards = 0; meta.heartsBonus++; } player.hpQ = maxQ(); } });
  rows.push({ label: `MPカケラ 購入  [${meta.mpShards}/4]  最大MP ${maxMP()}`, cost: `SP${CONFIG.MP_SHARD_SP}`, can: meta.sp >= CONFIG.MP_SHARD_SP,
    act: () => { meta.sp -= CONFIG.MP_SHARD_SP; if (++meta.mpShards >= 4) { meta.mpShards = 0; meta.mpBonus++; } player.mp = maxMP(); } });
  rows.push({ header: '── スキル（SP解放 / 枠割当）──' });
  for (const id of SKILL_IDS) if (!meta.unlocked.includes(id)) rows.push({ label: `解放: ${SKILL_META[id].name}`, cost: `SP${CONFIG.UNLOCK_SP}`, can: meta.sp >= CONFIG.UNLOCK_SP, act: () => { meta.sp -= CONFIG.UNLOCK_SP; meta.unlocked.push(id); } });
  for (const dir of ['W', 'A', 'S', 'D']) rows.push({ label: `枠 ${dir}: ${SKILL_META[meta.slots[dir]].name}  ▸切替`, cost: '', can: meta.unlocked.length > 1, act: () => { const u = meta.unlocked, i = u.indexOf(meta.slots[dir]); meta.slots[dir] = u[(i + 1) % u.length]; } });
  rows.push({ header: `── チャーム（金購入/装着・ノッチ ${notchUsed()}/${meta.notchMax}）──` });
  rows.push({ label: 'ノッチ拡張 +1', cost: `◆${CONFIG.NOTCH_EXPAND_GOLD}`, can: meta.gold >= CONFIG.NOTCH_EXPAND_GOLD, act: () => { meta.gold -= CONFIG.NOTCH_EXPAND_GOLD; meta.notchMax++; } });
  for (const c of CHARMS) {
    if (!meta.ownedCharms.includes(c.id)) rows.push({ label: `購入: ${c.name} [${c.notch}枠]`, cost: `◆${c.gold}`, can: meta.gold >= c.gold, act: () => { meta.gold -= c.gold; meta.ownedCharms.push(c.id); } });
    else { const eq = hasCharm(c.id); rows.push({ label: `${eq ? '◉' : '○'} ${c.name} [${c.notch}枠]`, cost: eq ? '解除' : '装着', can: eq || notchUsed() + c.notch <= meta.notchMax, act: () => { if (eq) meta.equippedCharms = meta.equippedCharms.filter(x => x !== c.id); else meta.equippedCharms.push(c.id); } }); }
  }
  rows.push({ label: 'クライムに戻る', cost: '', can: true, act: () => { inHideout = false; } });
  return rows;
}
function hideoutKey(code) {
  const rows = buildHideoutRows();
  if (code === 'KeyW' || code === 'ArrowUp') { do { hideoutCursor = (hideoutCursor - 1 + rows.length) % rows.length; } while (rows[hideoutCursor].header); }
  else if (code === 'KeyS' || code === 'ArrowDown') { do { hideoutCursor = (hideoutCursor + 1) % rows.length; } while (rows[hideoutCursor].header); }
  else if (code === 'Enter' || code === 'NumpadEnter') { const r = rows[hideoutCursor]; if (r && r.act && r.can) { r.act(); saveMeta(); } }
  else if (code === 'KeyE' || code === 'Escape') { inHideout = false; saveMeta(); }
}
function drawHideout() {
  ctx.fillStyle = 'rgba(8,11,16,.93)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf4ff'; ctx.font = 'bold 24px system-ui'; ctx.fillText('横穴（ベンチ＋店）', W / 2, 64);
  ctx.fillStyle = '#9fc4dd'; ctx.font = '12px system-ui'; ctx.fillText('セーブ済 ・ W/S 選択 ・ Enter 決定 ・ E/Esc 戻る', W / 2, 88);
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 15px system-ui'; ctx.fillText(`◆ ${meta.gold}     SP ${meta.sp}     🔑 ${player.keys}`, W / 2, 116);
  const rows = buildHideoutRows(); ctx.textAlign = 'left'; let y = 162;
  rows.forEach((r, i) => {
    if (r.header) { ctx.fillStyle = '#5a6675'; ctx.font = '12px system-ui'; ctx.fillText(r.header, 44, y); y += 24; return; }
    const sel = i === hideoutCursor;
    if (sel) { ctx.fillStyle = 'rgba(93,173,226,.18)'; roundRect(36, y - 16, W - 72, 26, 5); ctx.fill(); }
    ctx.fillStyle = !r.can ? '#566273' : (sel ? '#eaf4ff' : '#cfe0f0'); ctx.font = (sel ? 'bold ' : '') + '14px system-ui';
    ctx.fillText((sel ? '▶ ' : '   ') + r.label, 44, y);
    if (r.cost) { ctx.textAlign = 'right'; ctx.fillStyle = r.can ? '#f1c40f' : '#566273'; ctx.fillText(r.cost, W - 44, y); ctx.textAlign = 'left'; }
    y += 30;
  });
}

const STEP = 1 / 120;
let acc = 0, last = performance.now();
function frame(t) { let dt = (t - last) / 1000; last = t; acc += Math.min(dt, 0.1); while (acc >= STEP) { if (hitStop > 0) { hitStop -= STEP; acc -= STEP; continue; } if (!paused) update(STEP); acc -= STEP; } render(); requestAnimationFrame(frame); }   // hitStop中はupdate凍結＝手応え
reset();
requestAnimationFrame(frame);
