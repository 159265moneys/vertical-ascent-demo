/* ============================================================
 * 縦型登攀アクション — グレーボックス手触りデモ (endless / solo)
 * v3準拠：壁キック＋空中アクションが中核／静止足場なし／HP=ハート1/4／MP共有CT。
 * Phase1：戦闘テンポ検証＝敵HP(内部数値) : 攻撃力(基礎=1.0) の比を実機で殴る。
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

  // --- 攻撃（基礎攻撃力=1.0 が原器。全部その倍数）---
  ATK_BASE: 1.0,
  POGO_BOUNCE: -1080,
  POGO_ACTIVE: 0.22, POGO_COOLDOWN: 0.06, POGO_W: 88, POGO_H: 60, POGO_REACH: 6, POGO_MULT: 1.2,
  UPATK_ACTIVE: 0.16, UPATK_COOLDOWN: 0.18, UPATK_W: 72, UPATK_H: 56, UPATK_REACH: 4, UPATK_MULT: 1.0,
  NAIL_ACTIVE: 0.12, NAIL_COOLDOWN: 0.20, NAIL_W: 64, NAIL_H: 50, NAIL_REACH: 6, NAIL_MULT: 1.0, // 前方(Enter単体)

  // --- HP（ハート・1/4刻み）---
  HEARTS_MAX: 3, QPH: 4,                 // 3ハート×4 = 12クォーター
  FALL_SEC_PER_HEART: 1.0,               // 落下時間 = 最大ハート数 × これ（v3：1s）
  FALL_TIME_CAP: 14, IFRAME: 0.9,

  // --- MP（共有CT・自動回復）---
  MP_MAX: 100, MP_REGEN: 30,

  // --- スキル②：剣波（前方projectile・壁で消滅）---
  KENPA_MP: 22, KENPA_MULT: 1.4, KENPA_V: 640, KENPA_CD: 0.22, KENPA_R: 9,
  // --- スキル②：回転斬り（周囲AoE・即時）---
  SPIN_MP: 30, SPIN_MULT: 1.2, SPIN_R: 96, SPIN_ACTIVE: 0.18, SPIN_CD: 0.40,

  // --- 敵HP（ATK_BASE基準＝何発で倒れるか）---
  HP_TARGET: 2, HP_OBSTACLE: 3, HP_FLOATER: 3, HP_ATTACKER: 4,
  // --- 敵→自分 ダメージ（1/4ハート単位＝quarter）---
  DMG_TARGET: 0, DMG_OBSTACLE: 2, DMG_FLOATER: 1, DMG_ATTACKER: 1, DMG_PROJECTILE: 1,

  FALLER_VY: 135, OBSTACLE_VY: 210, FLOAT_SPEED: 2.2, FLOAT_DRIFT_X: 48, FLOAT_DRIFT_Y: 26,
  ATTACKER_DRIFT_X: 30, ATTACKER_FIRE_CD: 1.9, PROJECTILE_V: 270,
  BAND_GAP: 180, SHAKE_HIT: 9, SHAKE_FALL: 18,

  PLAYER_DRAW_H: 108, CAM_FOLLOW: 0.60, CAM_LERP: 9,
};

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cv.width = CONFIG.CANVAS_W * DPR; cv.height = CONFIG.CANVAS_H * DPR; ctx.scale(DPR, DPR);
const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;

// 操作: A/D=移動, W/S=上下(攻撃方向), Shift=ジャンプ/壁キック, Enter=攻撃(方向で上/下/前), J=剣波, K=回転斬り
const keys = {};
let jumpBuffer = 0, attackEdge = false, kenpaEdge = false, spinEdge = false, paused = false;
const PREVENT = ['ShiftLeft','ShiftRight','Enter','NumpadEnter','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','Space'];
addEventListener('keydown', e => {
  if (PREVENT.includes(e.code)) e.preventDefault();
  const fresh = !keys[e.code]; keys[e.code] = true;
  if (!fresh || e.repeat) return;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') jumpBuffer = CONFIG.JUMP_BUFFER;
  if (e.code === 'Enter' || e.code === 'NumpadEnter') attackEdge = true;
  if (e.code === 'KeyJ') kenpaEdge = true;
  if (e.code === 'KeyK') spinEdge = true;
  if (e.code === 'KeyP') paused = !paused;
  if (e.code === 'KeyR') reset();
  if (e.code === 'KeyB') damage(1, 0);          // デバッグ：1/4ダメージ
  if (e.code === 'KeyN') damage(99, 0);         // デバッグ：即HP0（落下テスト）
});
addEventListener('keyup', e => { keys[e.code] = false; });
const held = {
  left: () => keys['KeyA'], right: () => keys['KeyD'], up: () => keys['KeyW'], down: () => keys['KeyS'],
};

const SPRITE_STATES = ['idle','cling','wallkick','fall','pogo','upattack'];
const sprites = {};
SPRITE_STATES.forEach(s => { const img = new Image(); img.ok = false; img.onload = () => img.ok = true; img.src = `assets/sprites/${s}.png`; sprites[s] = img; });

let player, cameraY, maxHeight, enemies, projectiles, spawnTopY, bandIndex, shake, hp0flash;

function reset() {
  player = {
    x: (CONFIG.WALL_L + CONFIG.WALL_R) / 2, y: 0, vx: 0, vy: 0, w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H,
    state: 'air', facing: 1, grounded: true, clingWall: 0, clingHold: 0, coyote: 0, lastWall: 0,
    pogoTimer: 0, pogoCd: 0, pogoHitThisSwing: false,
    upTimer: 0, upCd: 0, upHitThisSwing: false,
    nailTimer: 0, nailCd: 0, nailHitThisSwing: false,
    spinTimer: 0, spinCd: 0, kenpaCd: 0,
    hpQ: CONFIG.HEARTS_MAX * CONFIG.QPH, mp: CONFIG.MP_MAX, fallStun: 0, iframe: 0,
  };
  cameraY = -H * CONFIG.CAM_FOLLOW; maxHeight = 0;
  enemies = []; projectiles = [];
  spawnTopY = -260; bandIndex = 0; shake = 0; hp0flash = 0; paused = false;
}

function damage(q, knockY) {           // q = 1/4ハート単位
  if (player.iframe > 0 || player.state === 'fallStun' || q <= 0) return;
  player.hpQ -= q; player.iframe = CONFIG.IFRAME;
  if (knockY) player.vy = knockY;
  shake = Math.max(shake, CONFIG.SHAKE_HIT);
  if (player.hpQ <= 0) {
    player.hpQ = 0; player.state = 'fallStun'; player.clingWall = 0;
    player.fallStun = Math.min(CONFIG.HEARTS_MAX * CONFIG.FALL_SEC_PER_HEART, CONFIG.FALL_TIME_CAP);
    player.vx = 0; shake = CONFIG.SHAKE_FALL; hp0flash = 0.5;
  }
}

function hitEnemy(e, dmg) {            // 自分→敵（内部数値・UI非表示）
  e.hp -= dmg; e.flash = 0.12;
  if (e.hp <= 0) e.alive = false;
}

function makeEnemy(type, x, y) {
  const base = { type, x, y, baseX: x, baseY: y, alive: true, flash: 0, phase: Math.random() * 6.28, fireCd: CONFIG.ATTACKER_FIRE_CD * (0.4 + Math.random() * 0.6) };
  if (type === 'target')   return { ...base, w: 48, h: 22, hp: CONFIG.HP_TARGET };
  if (type === 'obstacle') return { ...base, w: 42, h: 42, hp: CONFIG.HP_OBSTACLE };
  if (type === 'floater')  return { ...base, w: 40, h: 40, hp: CONFIG.HP_FLOATER };
  return { ...base, w: 44, h: 44, hp: CONFIG.HP_ATTACKER }; // attacker
}

function spawnBand(y, idx) {
  const span = CONFIG.WALL_R - CONFIG.WALL_L - 60;
  const rx = () => CONFIG.WALL_L + 30 + Math.random() * span;
  const sparse = idx % 3 === 0;
  const r = Math.random();
  let type = r < 0.34 ? 'target' : r < 0.58 ? 'obstacle' : r < 0.80 ? 'floater' : 'attacker';
  enemies.push(makeEnemy(type, rx(), y));
  if (!sparse && Math.random() < 0.45) {
    const t2 = Math.random() < 0.5 ? 'target' : 'floater';
    enemies.push(makeEnemy(t2, rx(), y - 64));
  }
}

const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
const pogoBox = () => ({ x: player.x, y: player.y + player.h / 2 + CONFIG.POGO_REACH + CONFIG.POGO_H / 2, w: CONFIG.POGO_W, h: CONFIG.POGO_H });
const upBox = () => ({ x: player.x, y: player.y - player.h / 2 - CONFIG.UPATK_REACH - CONFIG.UPATK_H / 2, w: CONFIG.UPATK_W, h: CONFIG.UPATK_H });
const nailBox = () => ({ x: player.x + player.facing * (player.w / 2 + CONFIG.NAIL_REACH + CONFIG.NAIL_W / 2), y: player.y, w: CONFIG.NAIL_W, h: CONFIG.NAIL_H });

function update(dt) {
  const p = player;
  if (jumpBuffer > 0) jumpBuffer -= dt;
  if (p.iframe > 0) p.iframe -= dt;
  for (const k of ['pogoCd','upCd','nailCd','spinCd','kenpaCd','pogoTimer','upTimer','nailTimer','spinTimer']) if (p[k] > 0) p[k] -= dt;
  if (shake > 0) shake = Math.max(0, shake - 60 * dt);
  if (hp0flash > 0) hp0flash -= dt;
  if (p.mp < CONFIG.MP_MAX) p.mp = Math.min(CONFIG.MP_MAX, p.mp + CONFIG.MP_REGEN * dt);

  const inX = (held.right() ? 1 : 0) - (held.left() ? 1 : 0);

  if (p.state === 'fallStun') {
    p.fallStun -= dt;
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL * 1.15);
    if (p.fallStun <= 0) { p.state = 'air'; p.hpQ = CONFIG.HEARTS_MAX * CONFIG.QPH; }
  } else if (p.state === 'cling') {
    p.vx = 0; p.lastWall = p.clingWall; p.clingHold += dt;
    const over = p.clingHold - CONFIG.CLING_GRIP_TIME;
    p.vy = over > 0 ? Math.min(CONFIG.CLING_SLIDE_MAX, over * CONFIG.CLING_SLIDE_ACCEL) : 0;
    const grip = (p.clingWall < 0 && held.left()) || (p.clingWall > 0 && held.right());
    if (jumpBuffer > 0) {
      const dir = -p.clingWall;
      p.vx = CONFIG.WALLKICK_VX * dir; p.vy = CONFIG.WALLKICK_VY; p.facing = dir;
      p.state = 'air'; p.clingWall = 0; p.coyote = 0; jumpBuffer = 0;
    } else if (!grip) { p.state = 'air'; p.coyote = CONFIG.COYOTE; p.clingWall = 0; }
  } else { // air
    if (p.coyote > 0) p.coyote -= dt;
    if (inX !== 0) { p.vx += inX * CONFIG.AIR_ACCEL * dt; p.facing = inX; }
    else { const s = Math.sign(p.vx); p.vx -= s * CONFIG.AIR_FRICTION * dt; if (Math.sign(p.vx) !== s) p.vx = 0; }
    p.vx = Math.max(-CONFIG.MAX_AIR_X, Math.min(CONFIG.MAX_AIR_X, p.vx));
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    if (jumpBuffer > 0) {
      if (p.grounded) { p.vy = CONFIG.GROUND_JUMP_VY; p.grounded = false; jumpBuffer = 0; }
      else if (p.coyote > 0 && p.lastWall !== 0) { const dir = -p.lastWall; p.vx = CONFIG.WALLKICK_VX * dir; p.vy = CONFIG.WALLKICK_VY; p.facing = dir; p.coyote = 0; jumpBuffer = 0; }
    }
  }

  // 攻撃（クリング中/空中どちらでも：Enter=方向で 下=ポゴ / 上=上攻撃 / 無=前ネイル）
  const canAttack = p.state === 'air' || p.state === 'cling';
  if (canAttack) {
    if (held.down() && (attackEdge || keys['Enter'] || keys['NumpadEnter']) && p.pogoCd <= 0 && p.pogoTimer <= 0) {
      p.pogoTimer = CONFIG.POGO_ACTIVE; p.pogoCd = CONFIG.POGO_COOLDOWN; p.pogoHitThisSwing = false;
    }
    if (attackEdge && held.up() && p.upCd <= 0 && p.upTimer <= 0) { p.upTimer = CONFIG.UPATK_ACTIVE; p.upCd = CONFIG.UPATK_COOLDOWN; p.upHitThisSwing = false; }
    if (attackEdge && !held.up() && !held.down() && p.nailCd <= 0 && p.nailTimer <= 0) { p.nailTimer = CONFIG.NAIL_ACTIVE; p.nailCd = CONFIG.NAIL_COOLDOWN; p.nailHitThisSwing = false; }
    // スキル②
    if (kenpaEdge && p.kenpaCd <= 0 && p.mp >= CONFIG.KENPA_MP) {
      p.mp -= CONFIG.KENPA_MP; p.kenpaCd = CONFIG.KENPA_CD;
      projectiles.push({ x: p.x + p.facing * p.w / 2, y: p.y, vx: p.facing * CONFIG.KENPA_V, vy: 0, r: CONFIG.KENPA_R, alive: true, friendly: true });
    }
    if (spinEdge && p.spinCd <= 0 && p.mp >= CONFIG.SPIN_MP) {
      p.mp -= CONFIG.SPIN_MP; p.spinCd = CONFIG.SPIN_CD; p.spinTimer = CONFIG.SPIN_ACTIVE;
      for (const e of enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < CONFIG.SPIN_R + e.w / 2) hitEnemy(e, CONFIG.ATK_BASE * CONFIG.SPIN_MULT);
      shake = Math.max(shake, 5);
    }
  }
  attackEdge = false; kenpaEdge = false; spinEdge = false;

  // 積分
  p.x += p.vx * dt; p.y += p.vy * dt;

  // 壁
  let side = 0;
  if (p.x - p.w / 2 <= CONFIG.WALL_L) { p.x = CONFIG.WALL_L + p.w / 2; side = -1; }
  else if (p.x + p.w / 2 >= CONFIG.WALL_R) { p.x = CONFIG.WALL_R - p.w / 2; side = 1; }
  if (side !== 0 && p.state === 'air') {
    const toward = (side < 0 && held.left()) || (side > 0 && held.right());
    if (toward) { p.state = 'cling'; p.clingWall = side; p.clingHold = 0; p.vx = 0; p.vy = 0; p.facing = -side; }
    else p.vx = 0;
  }
  // 床
  if (p.y >= 0) { if (p.vy > 700) shake = Math.max(shake, 6); p.y = 0; p.vy = 0; p.grounded = true; if (p.state === 'fallStun') { p.state = 'air'; p.hpQ = CONFIG.HEARTS_MAX * CONFIG.QPH; } }
  else p.grounded = false;
  if (p.grounded && p.state === 'air') p.x += inX * 180 * dt;

  // スポーン
  while (spawnTopY > cameraY - H) { spawnBand(spawnTopY, bandIndex++); spawnTopY -= CONFIG.BAND_GAP; }

  // 敵更新＋攻撃判定
  const pg = pogoBox(), ub = upBox(), nb = nailBox();
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.type === 'target') e.y += CONFIG.FALLER_VY * dt;
    else if (e.type === 'obstacle') e.y += CONFIG.OBSTACLE_VY * dt;
    else if (e.type === 'floater') { e.phase += dt * CONFIG.FLOAT_SPEED; e.x = e.baseX + Math.sin(e.phase) * CONFIG.FLOAT_DRIFT_X; e.y = e.baseY + Math.cos(e.phase * 0.8) * CONFIG.FLOAT_DRIFT_Y; }
    else { e.phase += dt * CONFIG.FLOAT_SPEED * 0.6; e.x = e.baseX + Math.sin(e.phase) * CONFIG.ATTACKER_DRIFT_X; const onScr = e.y > cameraY - 40 && e.y < cameraY + H + 40; if (onScr) { e.fireCd -= dt; if (e.fireCd <= 0) { fireAt(e); e.fireCd = CONFIG.ATTACKER_FIRE_CD; } } }

    // ポゴ：当てたらダメージ＋必ず跳ねる（HKポゴ）
    if (p.pogoTimer > 0 && !p.pogoHitThisSwing && overlap(pg.x, pg.y, pg.w, pg.h, e.x, e.y, e.w, e.h)) {
      hitEnemy(e, CONFIG.ATK_BASE * CONFIG.POGO_MULT); p.vy = CONFIG.POGO_BOUNCE; p.pogoHitThisSwing = true; p.pogoTimer = 0; p.coyote = 0; shake = Math.max(shake, 4);
    }
    if (e.alive && p.upTimer > 0 && !p.upHitThisSwing && overlap(ub.x, ub.y, ub.w, ub.h, e.x, e.y, e.w, e.h)) { hitEnemy(e, CONFIG.ATK_BASE * CONFIG.UPATK_MULT); }
    if (e.alive && p.nailTimer > 0 && !p.nailHitThisSwing && overlap(nb.x, nb.y, nb.w, nb.h, e.x, e.y, e.w, e.h)) { hitEnemy(e, CONFIG.ATK_BASE * CONFIG.NAIL_MULT); }
    // 接触ダメージ（敵→自分・1/4単位）
    if (e.alive) {
      const dq = e.type === 'obstacle' ? CONFIG.DMG_OBSTACLE : e.type === 'floater' ? CONFIG.DMG_FLOATER : e.type === 'attacker' ? CONFIG.DMG_ATTACKER : CONFIG.DMG_TARGET;
      if (dq > 0 && overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) damage(dq, -480);
    }
  }
  if (p.upTimer > 0) p.upHitThisSwing = true;   // 1スイング1ヒット化（複数フレーム）
  if (p.nailTimer > 0) p.nailHitThisSwing = true;

  // 弾更新
  for (const pr of projectiles) {
    if (!pr.alive) continue;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.friendly) {
      for (const e of enemies) if (e.alive && overlap(pr.x, pr.y, pr.r * 2, pr.r * 2, e.x, e.y, e.w, e.h)) { hitEnemy(e, CONFIG.ATK_BASE * CONFIG.KENPA_MULT); pr.alive = false; break; }
      if (pr.x < CONFIG.WALL_L || pr.x > CONFIG.WALL_R) pr.alive = false;   // 壁で消滅
    } else {
      if (overlap(p.x, p.y, p.w, p.h, pr.x, pr.y, pr.r * 2, pr.r * 2)) { damage(CONFIG.DMG_PROJECTILE, -360); pr.alive = false; }
      if (pr.x < CONFIG.WALL_L - 20 || pr.x > CONFIG.WALL_R + 20) pr.alive = false;
    }
    if (pr.y > cameraY + H + 80 || pr.y < cameraY - 120) pr.alive = false;
  }

  enemies = enemies.filter(e => e.alive && e.y < cameraY + H + 260);
  projectiles = projectiles.filter(pr => pr.alive);

  const h = Math.max(0, -p.y); if (h > maxHeight) maxHeight = h;
  cameraY += ((p.y - H * CONFIG.CAM_FOLLOW) - cameraY) * Math.min(1, CONFIG.CAM_LERP * dt);
}

function fireAt(e) {
  const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
  projectiles.push({ x: e.x, y: e.y, vx: dx / d * CONFIG.PROJECTILE_V, vy: dy / d * CONFIG.PROJECTILE_V, r: 7, alive: true, friendly: false });
}

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
  ctx.fillStyle = flash ? '#fff' : '#8e44ad'; roundRect(x - e.w / 2, y - e.h / 2, e.w, e.h, 8); ctx.fill(); ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fill();
}
function spriteKey() { const p = player; if (p.state === 'fallStun') return 'fall'; if (p.state === 'cling') return 'cling'; if (p.pogoTimer > 0) return 'pogo'; if (p.upTimer > 0) return 'upattack'; if (p.vy < -60) return 'wallkick'; if (p.vy > 120) return 'fall'; return 'idle'; }
function drawPlayer() {
  const p = player, x = p.x, y = sy(p.y);
  if (p.iframe > 0 && Math.floor(p.iframe * 20) % 2 === 0) return;
  const img = sprites[spriteKey()];
  if (img && img.ok) { const dh = CONFIG.PLAYER_DRAW_H, dw = dh * (img.width / img.height); ctx.save(); ctx.translate(x, y + p.h / 2); if (p.facing < 0) ctx.scale(-1, 1); ctx.drawImage(img, -dw / 2, -dh, dw, dh); ctx.restore(); }
  else { ctx.fillStyle = p.state === 'fallStun' ? '#e74c3c' : p.state === 'cling' ? '#5dade2' : '#ecf0f1'; roundRect(x - p.w / 2, y - p.h / 2, p.w, p.h, 5); ctx.fill(); ctx.fillStyle = '#1b2430'; ctx.fillRect(x + p.facing * 6 - 3, y - 14, 6, 6); }
}
function render() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0e13'); g.addColorStop(1, '#10151d');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  drawWall(CONFIG.WALL_L, -1); drawWall(CONFIG.WALL_R, 1);
  if (sy(0) < H) { ctx.fillStyle = '#2a3547'; ctx.fillRect(CONFIG.WALL_L, sy(0), CONFIG.WALL_R - CONFIG.WALL_L, H); }
  for (const e of enemies) { const y = sy(e.y); if (y < -60 || y > H + 60) continue; drawEnemy(e); }
  for (const pr of projectiles) { ctx.fillStyle = pr.friendly ? '#cdebff' : '#f6d365'; ctx.beginPath(); ctx.arc(pr.x, sy(pr.y), pr.r, 0, 6.2832); ctx.fill(); }
  drawPlayer();
  const p = player;
  if (p.pogoTimer > 0) { const b = pogoBox(); ctx.fillStyle = 'rgba(255,220,80,.30)'; ctx.fillRect(b.x - b.w / 2, sy(b.y) - b.h / 2, b.w, b.h); }
  if (p.upTimer > 0) { const b = upBox(); ctx.fillStyle = 'rgba(120,200,255,.30)'; ctx.fillRect(b.x - b.w / 2, sy(b.y) - b.h / 2, b.w, b.h); }
  if (p.nailTimer > 0) { const b = nailBox(); ctx.fillStyle = 'rgba(236,240,241,.30)'; ctx.fillRect(b.x - b.w / 2, sy(b.y) - b.h / 2, b.w, b.h); }
  if (p.spinTimer > 0) { ctx.strokeStyle = `rgba(255,255,255,${0.5 * p.spinTimer / CONFIG.SPIN_ACTIVE})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, sy(p.y), CONFIG.SPIN_R, 0, 6.2832); ctx.stroke(); }
  ctx.restore();
  if (hp0flash > 0) { ctx.fillStyle = `rgba(200,40,40,${0.4 * Math.max(0, hp0flash / 0.5)})`; ctx.fillRect(0, 0, W, H); }
  drawHUD();
  if (paused) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PAUSE (P)', W / 2, H / 2); ctx.textAlign = 'left'; }
}
function drawHUD() {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eaf2ff'; ctx.font = 'bold 22px system-ui'; ctx.fillText(`${(maxHeight / 100).toFixed(1)} m`, 14, 30);
  // HP：3ハート×4クォーター（pip表示）
  const total = CONFIG.HEARTS_MAX * CONFIG.QPH; let px = 14;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i < player.hpQ ? '#e74c3c' : '#3a4150';
    roundRect(px, 44, 7, 14, 2); ctx.fill();
    px += 9; if ((i + 1) % CONFIG.QPH === 0) px += 6;   // ハート境界に隙間
  }
  // MPバー
  ctx.fillStyle = '#22303f'; ctx.fillRect(14, 64, 96, 7);
  ctx.fillStyle = '#48b1d6'; ctx.fillRect(14, 64, 96 * (player.mp / CONFIG.MP_MAX), 7);
  // 握力
  if (player.state === 'cling') { const gg = Math.max(0, 1 - player.clingHold / CONFIG.CLING_GRIP_TIME); ctx.font = '11px system-ui'; ctx.fillStyle = gg > 0 ? '#5dade2' : '#e67e22'; ctx.fillText(gg > 0 ? 'つかまり中' : 'ずり落ち！', 118, 72); }
}

const STEP = 1 / 120;
let acc = 0, last = performance.now();
function frame(t) { let dt = (t - last) / 1000; last = t; acc += Math.min(dt, 0.1); while (acc >= STEP) { if (!paused) update(STEP); acc -= STEP; } render(); requestAnimationFrame(frame); }
reset();
requestAnimationFrame(frame);
