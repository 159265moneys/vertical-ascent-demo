/* ============================================================
 * 縦型登攀アクション — グレーボックス手触りデモ (endless / solo)
 * v3準拠：壁キック＋空中アクションが中核／静止足場なし／HP=ハート1/4／MP共有CT。
 * スキルは Ctrl+W/A/S/D の4枠（画面のスキルバーに常時表示＝覚えなくていい）。
 * 物理・戦闘の数字は CONFIG に外出し（比は仮・実機で詰める）。
 * ============================================================ */

const CONFIG = {
  CANVAS_W: 450, CANVAS_H: 800,
  WALL_L: 60, WALL_R: 390,
  PLAYER_W: 40, PLAYER_H: 64,

  GRAVITY: 2600,
  MAX_FALL: 1500,
  AIR_ACCEL: 2600, MAX_AIR_X: 360, AIR_FRICTION: 1500,

  WALLKICK_VX: 470, WALLKICK_VY: -1020,
  GROUND_JUMP_VY: -1040,
  COYOTE: 0.09, JUMP_BUFFER: 0.10,
  CLING_GRIP_TIME: 3.0,
  CLING_SLIDE_MAX: 300, CLING_SLIDE_ACCEL: 350,

  // --- 攻撃（基礎攻撃力=1.0 が原器）---
  ATK_BASE: 1.0,
  POGO_BOUNCE: -1080,
  POGO_ACTIVE: 0.22, POGO_COOLDOWN: 0.06, POGO_W: 88, POGO_H: 60, POGO_REACH: 6, POGO_MULT: 1.2,
  UPATK_ACTIVE: 0.16, UPATK_COOLDOWN: 0.18, UPATK_W: 72, UPATK_H: 56, UPATK_REACH: 4, UPATK_MULT: 1.0,
  NAIL_ACTIVE: 0.12, NAIL_COOLDOWN: 0.20, NAIL_W: 64, NAIL_H: 50, NAIL_REACH: 6, NAIL_MULT: 1.0,

  // --- HP（ハート・1/4刻み）---
  HEARTS_MAX: 3, QPH: 4,
  FALL_SEC_PER_HEART: 1.0, FALL_TIME_CAP: 14, IFRAME: 0.9,

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
  HP_TARGET: 2, HP_OBSTACLE: 3, HP_FLOATER: 3, HP_ATTACKER: 4,
  // --- 敵→自分 ダメージ（1/4ハート単位）---
  DMG_TARGET: 0, DMG_OBSTACLE: 2, DMG_FLOATER: 1, DMG_ATTACKER: 1, DMG_PROJECTILE: 1,
  // --- ドロップ（撃破報酬・恒久層へ）＋テレグラフ ---
  GOLD: { target: 1, obstacle: 2, floater: 2, attacker: 4 },
  SP: { target: 1, obstacle: 1, floater: 1, attacker: 2 },
  TELEGRAPH_LEAD: 0.5,
  // --- 横穴ハブ（鍵・器）---
  KEY_PER_KILLS: 6, KEY_STOCK: 2,
  HEART_SHARD_GOLD: 12, MP_SHARD_SP: 8, MP_PER_VESSEL: 30,   // カケラ4個で器1個

  FALLER_VY: 135, OBSTACLE_VY: 210, FLOAT_SPEED: 2.2, FLOAT_DRIFT_X: 48, FLOAT_DRIFT_Y: 26,
  ATTACKER_DRIFT_X: 30, ATTACKER_FIRE_CD: 1.9, PROJECTILE_V: 270,
  BAND_GAP: 180, SHAKE_HIT: 9, SHAKE_FALL: 18,

  PLAYER_DRAW_H: 108, CAM_FOLLOW: 0.60, CAM_LERP: 9,
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

// 操作: A/D=移動, W/S=上下(攻撃方向), Shift=ジャンプ/壁キック, Enter=攻撃(↓ポゴ/↑上/前ネイル)
//       Ctrl+W/A/S/D = スキル4枠
const keys = {};
let jumpBuffer = 0, attackEdge = false, paused = false;
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
  if (e.code === 'KeyR') reset();
  if (e.code === 'KeyB') damage(1, 0);   // デバッグ：1/4
  if (e.code === 'KeyN') damage(99, 0);  // デバッグ：即HP0
  if (e.code === 'KeyG') player.keys = Math.min(player.keys + 1, CONFIG.KEY_STOCK);  // デバッグ：鍵+1
  if (e.code === 'KeyH') { inHideout = true; hideoutCursor = 1; }                    // デバッグ：横穴を直接開く(鍵/しがみつき不要)
  if (e.code === 'KeyE' && player.state === 'cling' && player.keys > 0) { player.keys--; inHideout = true; hideoutCursor = 1; saveMeta(); }  // 横穴へ
});
addEventListener('keyup', e => { keys[e.code] = false; });
const held = {   // 左Shift中はWASDをスキルに使うので移動/攻撃方向には効かせない
  left: () => keys['KeyA'] && !skillMod(), right: () => keys['KeyD'] && !skillMod(),
  up: () => keys['KeyW'] && !skillMod(), down: () => keys['KeyS'] && !skillMod(),
};

const SPRITE_STATES = ['idle','cling','wallkick','fall','pogo','upattack'];
const sprites = {};
SPRITE_STATES.forEach(s => { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/${s}.png`; sprites[s] = img; });

let player, cameraY, maxHeight, enemies, projectiles, spawnTopY, bandIndex, shake, hp0flash;

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
  enemies = []; projectiles = [];
  spawnTopY = -260; bandIndex = 0; shake = 0; hp0flash = 0; paused = false;
}

function damage(q, knockY) {
  if (player.iframe > 0 || player.state === 'fallStun' || q <= 0) return;
  if (hasCharm('def')) q = Math.max(0, q - CONFIG.DEF_REDUCE);              // 防御チャーム
  if (player.mayuTimer > 0) q = Math.floor(q * (1 - CONFIG.MAYU_REDUCE));   // 守護の繭：被ダメ減
  if (q <= 0) { player.iframe = CONFIG.IFRAME * 0.4; return; }
  player.hpQ -= q; player.iframe = CONFIG.IFRAME;
  if (knockY) player.vy = knockY;
  shake = Math.max(shake, CONFIG.SHAKE_HIT);
  if (player.hpQ <= 0) {
    player.hpQ = 0; player.state = 'fallStun'; player.clingWall = 0;
    player.fallStun = Math.min((CONFIG.HEARTS_MAX + meta.heartsBonus) * CONFIG.FALL_SEC_PER_HEART, CONFIG.FALL_TIME_CAP);
    player.vx = 0; shake = CONFIG.SHAKE_FALL; hp0flash = 0.5; saveMeta();
  }
}

function hitEnemy(e, dmg) { if (hasCharm('kaishin') && Math.random() < CONFIG.KAISHIN_CHANCE) dmg *= CONFIG.KAISHIN_MULT; e.hp -= dmg; e.flash = 0.12; if (e.hp <= 0 && e.alive) { e.alive = false; meta.gold += CONFIG.GOLD[e.type] || 0; meta.sp += CONFIG.SP[e.type] || 0; saveMeta(); player.killCount++; if (player.killCount % CONFIG.KEY_PER_KILLS === 0) player.keys = Math.min(player.keys + 1, CONFIG.KEY_STOCK); } }

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
  return { ...base, w: 44, h: 44, hp: CONFIG.HP_ATTACKER, windup: 0 };
}
function spawnBand(y, idx) {
  const span = CONFIG.WALL_R - CONFIG.WALL_L - 60;
  const rx = () => CONFIG.WALL_L + 30 + Math.random() * span;
  const sparse = idx % 3 === 0;
  const r = Math.random();
  let type = r < 0.34 ? 'target' : r < 0.58 ? 'obstacle' : r < 0.80 ? 'floater' : 'attacker';
  enemies.push(makeEnemy(type, rx(), y));
  if (!sparse && Math.random() < 0.45) { const t2 = Math.random() < 0.5 ? 'target' : 'floater'; enemies.push(makeEnemy(t2, rx(), y - 64)); }
}

const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
const pogoBox = () => ({ x: player.x, y: player.y + player.h / 2 + CONFIG.POGO_REACH + CONFIG.POGO_H / 2, w: CONFIG.POGO_W, h: CONFIG.POGO_H });
const upBox = () => ({ x: player.x, y: player.y - player.h / 2 - CONFIG.UPATK_REACH - CONFIG.UPATK_H / 2, w: CONFIG.UPATK_W, h: CONFIG.UPATK_H });
const nailBox = () => ({ x: player.x + player.facing * (player.w / 2 + CONFIG.NAIL_REACH + CONFIG.NAIL_W / 2), y: player.y, w: CONFIG.NAIL_W, h: CONFIG.NAIL_H });

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

  p.x += p.vx * dt; p.y += p.vy * dt;

  let side = 0;
  if (p.x - p.w / 2 <= CONFIG.WALL_L) { p.x = CONFIG.WALL_L + p.w / 2; side = -1; }
  else if (p.x + p.w / 2 >= CONFIG.WALL_R) { p.x = CONFIG.WALL_R - p.w / 2; side = 1; }
  if (side !== 0 && p.state === 'air') {
    const toward = (side < 0 && keys['KeyA']) || (side > 0 && keys['KeyD']);
    if (toward) { p.state = 'cling'; p.clingWall = side; p.clingHold = 0; p.vx = 0; p.vy = 0; p.facing = -side; }
    else p.vx = 0;
  }
  if (p.y >= 0) { if (p.vy > 700) shake = Math.max(shake, 6); p.y = 0; p.vy = 0; p.grounded = true; p.airJumps = 0; if (p.state === 'fallStun') { p.state = 'air'; p.hpQ = maxQ(); } }
  else p.grounded = false;
  if (p.grounded && p.state === 'air') p.x += inX * 180 * dt;

  while (spawnTopY > cameraY - H) { spawnBand(spawnTopY, bandIndex++); spawnTopY -= CONFIG.BAND_GAP; }

  const pg = pogoBox(), ub = upBox(), nb = nailBox();
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.type === 'target') e.y += CONFIG.FALLER_VY * dt;
    else if (e.type === 'obstacle') e.y += CONFIG.OBSTACLE_VY * dt;
    else if (e.type === 'floater') { e.phase += dt * CONFIG.FLOAT_SPEED; e.x = e.baseX + Math.sin(e.phase) * CONFIG.FLOAT_DRIFT_X; e.y = e.baseY + Math.cos(e.phase * 0.8) * CONFIG.FLOAT_DRIFT_Y; }
    else { e.phase += dt * CONFIG.FLOAT_SPEED * 0.6; e.x = e.baseX + Math.sin(e.phase) * CONFIG.ATTACKER_DRIFT_X; const onScr = e.y > cameraY - 40 && e.y < cameraY + H + 40; if (onScr) { if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) { fireAt(e); e.fireCd = CONFIG.ATTACKER_FIRE_CD; } } else { e.fireCd -= dt; if (e.fireCd <= 0) e.windup = CONFIG.TELEGRAPH_LEAD; } } }

    if (p.pogoTimer > 0 && !p.pogoHitThisSwing && overlap(pg.x, pg.y, pg.w, pg.h, e.x, e.y, e.w, e.h)) { hitEnemy(e, CONFIG.ATK_BASE * CONFIG.POGO_MULT); p.vy = CONFIG.POGO_BOUNCE; p.pogoHitThisSwing = true; p.pogoTimer = 0; p.coyote = 0; shake = Math.max(shake, 4); }
    if (e.alive && p.upTimer > 0 && !p.upHitThisSwing && overlap(ub.x, ub.y, ub.w, ub.h, e.x, e.y, e.w, e.h)) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.UPATK_MULT);
    if (e.alive && p.nailTimer > 0 && !p.nailHitThisSwing && overlap(nb.x, nb.y, nb.w, nb.h, e.x, e.y, e.w, e.h)) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.NAIL_MULT);
    if (e.alive) { const dq = e.type === 'obstacle' ? CONFIG.DMG_OBSTACLE : e.type === 'floater' ? CONFIG.DMG_FLOATER : e.type === 'attacker' ? CONFIG.DMG_ATTACKER : CONFIG.DMG_TARGET; if (overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) { if (hasCharm('kiba') && e.flash <= 0) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.KIBA_MULT); if (e.alive && dq > 0) damage(dq, -480); } }
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
      if (pr.x < CONFIG.WALL_L || pr.x > CONFIG.WALL_R) pr.alive = false;
    } else {
      if (overlap(p.x, p.y, p.w, p.h, pr.x, pr.y, pr.r * 2, pr.r * 2)) { damage(CONFIG.DMG_PROJECTILE, -360); pr.alive = false; }
      if (pr.x < CONFIG.WALL_L - 20 || pr.x > CONFIG.WALL_R + 20) pr.alive = false;
    }
    if (pr.y > cameraY + H + 80 || pr.y < cameraY - 120) pr.alive = false;
  }

  enemies = enemies.filter(e => e.alive && e.y < cameraY + H + 260);
  projectiles = projectiles.filter(pr => pr.alive);

  const h = Math.max(0, -p.y); if (h > maxHeight) maxHeight = h; if (maxHeight > meta.bestHeight) meta.bestHeight = maxHeight;
  cameraY += ((p.y - H * CONFIG.CAM_FOLLOW) - cameraY) * Math.min(1, CONFIG.CAM_LERP * dt);
}

function fireAt(e) { const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1; projectiles.push({ x: e.x, y: e.y, vx: dx / d * CONFIG.PROJECTILE_V, vy: dy / d * CONFIG.PROJECTILE_V, r: 7, alive: true, friendly: false }); }

// ---- render ----
function sy(worldY) { return worldY - cameraY; }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawWall(xInner, dir) {
  const x0 = dir < 0 ? 0 : xInner, w = dir < 0 ? xInner : W - xInner;
  ctx.fillStyle = '#161c26'; ctx.fillRect(x0, 0, w, H);
  ctx.strokeStyle = '#222c3a'; ctx.lineWidth = 2;
  const start = Math.floor(cameraY / 100) * 100;
  for (let wy = start; wy < cameraY + H; wy += 100) { const y = sy(wy); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
  ctx.fillStyle = '#2a3547'; ctx.fillRect(dir < 0 ? xInner - 3 : xInner, 0, 3, H);
}
function drawEnemy(e) {
  const y = sy(e.y), x = e.x, flash = e.flash > 0;
  if (e.type === 'target') { ctx.fillStyle = flash ? '#fff' : '#27ae60'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 5); ctx.fill(); ctx.fillStyle = '#9be8bd'; ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x, y + 5); ctx.fill(); return; }
  if (e.type === 'obstacle') { ctx.fillStyle = flash ? '#fff' : '#c0392b'; const s = e.w / 2; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); return; }
  if (e.type === 'floater') { ctx.fillStyle = flash ? '#fff' : '#16a2b8'; ctx.beginPath(); ctx.arc(x, y, e.w / 2, 0, 6.2832); ctx.fill(); ctx.strokeStyle = '#0d6f7e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, e.w / 2 - 5, 0, 6.2832); ctx.stroke(); return; }
  ctx.fillStyle = flash ? '#fff' : '#8e44ad'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 8); ctx.fill();
  if (e.windup > 0) { const t = 1 - e.windup / CONFIG.TELEGRAPH_LEAD; ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.5 * t})`; ctx.lineWidth = 2 + 3 * t; ctx.beginPath(); ctx.arc(x, y, 10 + 14 * t, 0, 6.2832); ctx.stroke(); }
  ctx.fillStyle = e.windup > 0 ? '#ff5050' : '#f1c40f'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fill();
}
function spriteKey() { const p = player; if (p.state === 'fallStun') return 'fall'; if (p.state === 'cling') return 'cling'; if (p.pogoTimer > 0) return 'pogo'; if (p.upTimer > 0) return 'upattack'; if (p.vy < -60) return 'wallkick'; if (p.vy > 120) return 'fall'; return 'idle'; }
function drawPlayer() {
  const p = player, x = p.x, y = sy(p.y);
  if (p.iframe > 0 && Math.floor(p.iframe * 20) % 2 === 0) return;
  const img = sprites[spriteKey()];
  if (img && img.ok) { const dh = CONFIG.PLAYER_DRAW_H, dw = dh * (img.width / img.height); ctx.save(); ctx.translate(x, y + p.h / 2); if (p.facing < 0) ctx.scale(-1, 1); ctx.drawImage(img, -dw / 2, -dh, dw, dh); ctx.restore(); }
  else { ctx.fillStyle = p.state === 'fallStun' ? '#e74c3c' : p.state === 'cling' ? '#5dade2' : '#ecf0f1'; roundRect(x - p.w / 2, y - p.h / 2, p.w, p.h, 5); ctx.fill(); ctx.fillStyle = '#1b2430'; ctx.fillRect(x + p.facing * 6 - 3, y - 14, 6, 6); }
  if (p.mayuTimer > 0) { ctx.strokeStyle = `rgba(120,210,160,${0.4 + 0.3 * Math.sin(p.mayuTimer * 12)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, p.w, 0, 6.2832); ctx.stroke(); } // 守護の繭
}
function render() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0e13'); g.addColorStop(1, '#10151d');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  drawWall(CONFIG.WALL_L, -1); drawWall(CONFIG.WALL_R, 1);
  if (sy(0) < H) { ctx.fillStyle = '#2a3547'; ctx.fillRect(CONFIG.WALL_L, sy(0), CONFIG.WALL_R - CONFIG.WALL_L, H); }
  for (const e of enemies) { const y = sy(e.y); if (y < -60 || y > H + 60) continue; drawEnemy(e); }
  for (const pr of projectiles) { ctx.fillStyle = pr.flame ? '#ffb347' : pr.friendly ? '#cdebff' : '#f6d365'; ctx.beginPath(); ctx.arc(pr.x, sy(pr.y), pr.r, 0, 6.2832); ctx.fill(); }
  drawPlayer();
  const p = player;
  if (p.pogoTimer > 0) { const b = pogoBox(); ctx.fillStyle = 'rgba(255,220,80,.30)'; ctx.fillRect(b.x - b.w / 2, sy(b.y) - b.h / 2, b.w, b.h); }
  if (p.upTimer > 0) { const b = upBox(); ctx.fillStyle = 'rgba(120,200,255,.30)'; ctx.fillRect(b.x - b.w / 2, sy(b.y) - b.h / 2, b.w, b.h); }
  if (p.nailTimer > 0) { const b = nailBox(); ctx.fillStyle = 'rgba(236,240,241,.30)'; ctx.fillRect(b.x - b.w / 2, sy(b.y) - b.h / 2, b.w, b.h); }
  if (p.spinTimer > 0) { ctx.strokeStyle = `rgba(255,255,255,${0.5 * p.spinTimer / CONFIG.SPIN_ACTIVE})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, sy(p.y), CONFIG.SPIN_R, 0, 6.2832); ctx.stroke(); }
  ctx.restore();
  if (hp0flash > 0) { ctx.fillStyle = `rgba(200,40,40,${0.4 * Math.max(0, hp0flash / 0.5)})`; ctx.fillRect(0, 0, W, H); }
  drawHUD();
  if (inHideout) drawHideout();
  else if (skillMod()) drawSkillRadial();
  if (paused) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PAUSE (P)', W / 2, H / 2); ctx.textAlign = 'left'; }
}
function drawHUD() {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eaf2ff'; ctx.font = 'bold 22px system-ui'; ctx.fillText(`${(maxHeight / 100).toFixed(1)} m`, 14, 30);
  ctx.fillStyle = '#7f8ca0'; ctx.font = '10px system-ui'; ctx.fillText(`BEST ${(meta.bestHeight / 100).toFixed(1)}m`, 96, 21);
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
  rows.push({ label: `HPカケラ 購入  [${meta.heartShards}/4]  最大ハート ${CONFIG.HEARTS_MAX + meta.heartsBonus}`, cost: `◆${CONFIG.HEART_SHARD_GOLD}`, can: meta.gold >= CONFIG.HEART_SHARD_GOLD,
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
function frame(t) { let dt = (t - last) / 1000; last = t; acc += Math.min(dt, 0.1); while (acc >= STEP) { if (!paused) update(STEP); acc -= STEP; } render(); requestAnimationFrame(frame); }
reset();
requestAnimationFrame(frame);
