/* ============================================================
 * 無限登攀アクション — グレーボックス手触りデモ (endless / solo)
 * 検証する一点：「壁キック＋ポゴで踏んで登る」気持ちよさ。
 * 物理は全部 CONFIG に外出し（設計書 §11 Config化）。数字をいじって調整する前提。
 * スプライト：assets/sprites/*.png があれば自動差し替え、無ければ矩形。
 * ============================================================ */

const CONFIG = {
  CANVAS_W: 450, CANVAS_H: 800,
  WALL_L: 60, WALL_R: 390,            // 壁の内面 x（この間がシャフト）
  PLAYER_W: 40, PLAYER_H: 64,

  GRAVITY: 2600,
  MAX_FALL: 1500,                     // 通常最大落下速度
  AIR_ACCEL: 2600, MAX_AIR_X: 360, AIR_FRICTION: 1500,

  CLING_DURATION: 1.0,               // 壁張り付き時間(s)
  WALLKICK_VX: 470, WALLKICK_VY: -1020,
  GROUND_JUMP_VY: -1040,
  COYOTE: 0.09, JUMP_BUFFER: 0.10,
  FAST_FALL_CATCH: 950,              // この落下速度を超えると「壁方向入力」しないとキャッチ不可（腕の見せ場）

  POGO_BOUNCE: -1080,               // ポゴ跳ね初速（壁キックより少し強く＝連鎖で稼げる）
  POGO_ACTIVE: 0.12, POGO_COOLDOWN: 0.15,
  POGO_W: 56, POGO_H: 30, POGO_REACH: 8,

  UPATK_ACTIVE: 0.12, UPATK_COOLDOWN: 0.20, UPATK_W: 52, UPATK_H: 36,

  HP_MAX: 5,
  FALL_SEC_PER_HP: 0.7,            // 設計はs=1.0。デモはダレ防止で0.7。落下時間=HP最大×これ
  FALL_TIME_CAP: 12,              // 落下時間キャップ(s)
  IFRAME: 0.8,

  PLAYER_DRAW_H: 100,            // スプライト描画高(px)
  PAD_SPACING: 210,             // ポゴ標的の縦間隔
  CAM_FOLLOW: 0.60, CAM_LERP: 9,
};

// ---- canvas / DPR ----
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cv.width = CONFIG.CANVAS_W * DPR;
cv.height = CONFIG.CANVAS_H * DPR;
ctx.scale(DPR, DPR);
const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;

// ---- input ----
const keys = {};
let jumpBuffer = 0, pausePressed = false;
const KICK = e => e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) { // edge
    if (KICK(e)) jumpBuffer = CONFIG.JUMP_BUFFER;
    if (e.code === 'KeyP') paused = !paused;
    if (e.code === 'KeyR') reset();
    if (e.code === 'KeyK') damage(1, 0);
  }
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
const held = {
  left: () => keys['ArrowLeft'] || keys['KeyA'],
  right: () => keys['ArrowRight'] || keys['KeyD'],
  down: () => keys['ArrowDown'] || keys['KeyS'],
  up: () => keys['ArrowUp'] || keys['KeyW'],
  upatk: () => keys['KeyJ'],
};

// ---- sprites (任意) ----
const SPRITE_STATES = ['idle','cling','wallkick','fall','pogo','upattack'];
const sprites = {};
SPRITE_STATES.forEach(s => {
  const img = new Image(); img.ok = false;
  img.onload = () => { img.ok = true; };
  img.src = `../assets/sprites/${s}.png`;
  sprites[s] = img;
});

// ---- world ----
let player, cameraY, maxHeight, targets, paused = false;

function buildTargets() {
  const arr = [];
  const mid = (CONFIG.WALL_L + CONFIG.WALL_R) / 2;
  for (let i = 1; i < 200; i++) {
    const y = -i * CONFIG.PAD_SPACING - 220;
    const r = i % 4;
    let x = r === 0 ? CONFIG.WALL_L + 72 : r === 2 ? CONFIG.WALL_R - 72 : mid;
    let type = 'pad';
    if (i % 9 === 0) type = 'hazard';
    else if (i % 5 === 0) type = 'faller';
    arr.push({ x, y, baseY: y, w: 58, h: 18, type, alive: true, flash: 0, vy: type === 'faller' ? 55 : 0 });
  }
  return arr;
}

function reset() {
  player = {
    x: (CONFIG.WALL_L + CONFIG.WALL_R) / 2, y: 0,
    vx: 0, vy: 0, w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H,
    state: 'air', facing: 1, grounded: true,
    clingWall: 0, clingTimer: 0,
    coyote: 0, lastWall: 0,
    pogoTimer: 0, pogoCd: 0, pogoHitThisSwing: false,
    upTimer: 0, upCd: 0,
    hp: CONFIG.HP_MAX, fallStun: 0, iframe: 0,
  };
  cameraY = -H * CONFIG.CAM_FOLLOW;
  maxHeight = 0;
  targets = buildTargets();
  paused = false;
}

function damage(n, knockY) {
  if (player.iframe > 0 || player.state === 'fallStun') return;
  player.hp -= n;
  player.iframe = CONFIG.IFRAME;
  if (knockY) player.vy = knockY;
  if (player.hp <= 0) {
    player.hp = 0;
    player.state = 'fallStun';
    player.clingWall = 0;
    player.fallStun = Math.min(CONFIG.HP_MAX * CONFIG.FALL_SEC_PER_HP, CONFIG.FALL_TIME_CAP);
    player.vx = 0;
  }
}

// ---- helpers ----
const overlap = (ax, ay, aw, ah, bx, by, bw, bh) =>
  Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;

// ---- update (fixed step) ----
function update(dt) {
  const p = player;
  if (jumpBuffer > 0) jumpBuffer -= dt;
  if (p.iframe > 0) p.iframe -= dt;
  if (p.pogoCd > 0) p.pogoCd -= dt;
  if (p.upCd > 0) p.upCd -= dt;
  if (p.pogoTimer > 0) p.pogoTimer -= dt;
  if (p.upTimer > 0) p.upTimer -= dt;

  const inX = (held.right() ? 1 : 0) - (held.left() ? 1 : 0);

  // ---- 状態別 ----
  if (p.state === 'fallStun') {
    p.fallStun -= dt;
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL * 1.15);
    if (p.fallStun <= 0) { p.state = 'air'; p.hp = CONFIG.HP_MAX; } // デモ：復帰でHP全回復
  } else if (p.state === 'cling') {
    p.vy = 0; p.vx = 0;
    p.clingTimer -= dt;
    p.lastWall = p.clingWall;
    // 壁キック
    if (jumpBuffer > 0) {
      const dir = -p.clingWall;
      p.vx = CONFIG.WALLKICK_VX * dir;
      p.vy = CONFIG.WALLKICK_VY;
      p.facing = dir;
      p.state = 'air'; p.clingWall = 0; p.coyote = 0;
      jumpBuffer = 0;
    } else if ((p.clingWall < 0 && inX > 0) || (p.clingWall > 0 && inX < 0)) {
      // 壁と逆に倒したら離脱
      p.state = 'air'; p.coyote = CONFIG.COYOTE; p.clingWall = 0;
    } else if (p.clingTimer <= 0) {
      p.state = 'air'; p.coyote = CONFIG.COYOTE; p.clingWall = 0;
    }
  } else { // air
    if (p.coyote > 0) p.coyote -= dt;
    // 横移動（空中制御）
    if (inX !== 0) { p.vx += inX * CONFIG.AIR_ACCEL * dt; p.facing = inX; }
    else { const s = Math.sign(p.vx); p.vx -= s * CONFIG.AIR_FRICTION * dt; if (Math.sign(p.vx) !== s) p.vx = 0; }
    p.vx = Math.max(-CONFIG.MAX_AIR_X, Math.min(CONFIG.MAX_AIR_X, p.vx));
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);

    // 地上ジャンプ / コヨーテ壁キック
    if (jumpBuffer > 0) {
      if (p.grounded) { p.vy = CONFIG.GROUND_JUMP_VY; p.grounded = false; jumpBuffer = 0; }
      else if (p.coyote > 0 && p.lastWall !== 0) {
        const dir = -p.lastWall;
        p.vx = CONFIG.WALLKICK_VX * dir; p.vy = CONFIG.WALLKICK_VY; p.facing = dir;
        p.coyote = 0; jumpBuffer = 0;
      }
    }
    // ポゴ
    if (held.down() && p.pogoCd <= 0 && p.pogoTimer <= 0) {
      p.pogoTimer = CONFIG.POGO_ACTIVE; p.pogoCd = CONFIG.POGO_COOLDOWN; p.pogoHitThisSwing = false;
    }
    // 上攻撃
    if (held.upatk() && p.upCd <= 0 && p.upTimer <= 0) {
      p.upTimer = CONFIG.UPATK_ACTIVE; p.upCd = CONFIG.UPATK_COOLDOWN;
    }
  }

  // ---- 物理積分 ----
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // 壁衝突 & キャッチ/張り付き
  let side = 0;
  if (p.x - p.w / 2 <= CONFIG.WALL_L) { p.x = CONFIG.WALL_L + p.w / 2; side = -1; }
  else if (p.x + p.w / 2 >= CONFIG.WALL_R) { p.x = CONFIG.WALL_R - p.w / 2; side = 1; }
  if (side !== 0 && p.state === 'air') {
    const toward = (side < 0 && inX < 0) || (side > 0 && inX > 0);
    const away = (side < 0 && inX > 0) || (side > 0 && inX < 0);
    const slow = p.vy < CONFIG.FAST_FALL_CATCH;
    if (!away && (slow || toward)) {
      p.state = 'cling'; p.clingWall = side; p.clingTimer = CONFIG.CLING_DURATION;
      p.vx = 0; p.vy = 0; p.facing = -side;
    } else {
      p.vx = -p.vx * 0.3; // 弾かれる
    }
  }
  // 床
  if (p.y >= 0) { p.y = 0; p.vy = 0; p.grounded = true; if (p.state === 'fallStun') { p.state = 'air'; p.hp = CONFIG.HP_MAX; } }
  else p.grounded = false;
  // 地上横移動
  if (p.grounded && p.state === 'air') { p.x += inX * 180 * dt; }

  // ---- 標的との判定 ----
  for (const t of targets) {
    if (t.flash > 0) t.flash -= dt;
    if (t.type === 'faller' && t.alive) {
      t.y += t.vy * dt;
      if (t.y > p.y + H) t.alive = false;
    }
    if (!t.alive) continue;
    // ポゴ：足元下の判定
    if (p.pogoTimer > 0 && !p.pogoHitThisSwing) {
      const hx = p.x, hy = p.y + p.h / 2 + CONFIG.POGO_REACH + CONFIG.POGO_H / 2;
      if (overlap(hx, hy, CONFIG.POGO_W, CONFIG.POGO_H, t.x, t.y, t.w, t.h) && (t.type === 'pad' || t.type === 'faller')) {
        p.vy = CONFIG.POGO_BOUNCE; p.pogoHitThisSwing = true; p.pogoTimer = 0;
        t.flash = 0.25;
        if (t.type === 'faller') t.alive = false;
        p.coyote = 0;
      }
    }
    // 上攻撃：頭上の判定（fallerを弾く）
    if (p.upTimer > 0 && t.type === 'faller') {
      const hx = p.x, hy = p.y - p.h / 2 - CONFIG.UPATK_H / 2;
      if (overlap(hx, hy, CONFIG.UPATK_W, CONFIG.UPATK_H, t.x, t.y, t.w, t.h)) { t.alive = false; t.flash = 0.25; }
    }
    // ハザード接触
    if (t.type === 'hazard' && overlap(p.x, p.y, p.w, p.h, t.x, t.y, t.w, t.h)) {
      damage(1, -520);
    }
  }

  // 高さ更新
  const h = Math.max(0, -p.y);
  if (h > maxHeight) maxHeight = h;

  // カメラ
  const target = p.y - H * CONFIG.CAM_FOLLOW;
  cameraY += (target - cameraY) * Math.min(1, CONFIG.CAM_LERP * dt);
}

// ---- render ----
function sy(worldY) { return worldY - cameraY; }

function drawWall(xInner, dir) {
  const x0 = dir < 0 ? 0 : xInner;
  const w = dir < 0 ? xInner : W - xInner;
  ctx.fillStyle = '#161c26';
  ctx.fillRect(x0, 0, w, H);
  // 動きが見えるよう100pxごとに刻み
  ctx.strokeStyle = '#222c3a'; ctx.lineWidth = 2;
  const start = Math.floor(cameraY / 100) * 100;
  for (let wy = start; wy < cameraY + H; wy += 100) {
    const y = sy(wy);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
  }
  ctx.fillStyle = '#2a3547';
  ctx.fillRect(dir < 0 ? xInner - 3 : xInner, 0, 3, H); // 内面ライン
}

function render() {
  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0e13'); g.addColorStop(1, '#10151d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  drawWall(CONFIG.WALL_L, -1);
  drawWall(CONFIG.WALL_R, 1);

  // 床
  if (sy(0) < H) { ctx.fillStyle = '#2a3547'; ctx.fillRect(CONFIG.WALL_L, sy(0), CONFIG.WALL_R - CONFIG.WALL_L, H); }

  // 標的
  for (const t of targets) {
    if (!t.alive) continue;
    const y = sy(t.y);
    if (y < -40 || y > H + 40) continue;
    if (t.type === 'hazard') ctx.fillStyle = t.flash > 0 ? '#fff' : '#c0392b';
    else if (t.type === 'faller') ctx.fillStyle = t.flash > 0 ? '#fff' : '#7f8c9b';
    else ctx.fillStyle = t.flash > 0 ? '#fff' : '#566273';
    roundRect(t.x - t.w / 2, y - t.h / 2, t.w, t.h, 4); ctx.fill();
    if (t.type === 'pad') { ctx.fillStyle = '#6b7888'; ctx.fillRect(t.x - t.w / 2, y - t.h / 2, t.w, 3); }
  }

  // プレイヤー
  drawPlayer();

  // ポゴ/上攻撃の判定可視化
  const p = player;
  if (p.pogoTimer > 0) { ctx.fillStyle = 'rgba(255,220,80,.35)'; const hy = sy(p.y + p.h / 2 + CONFIG.POGO_REACH + CONFIG.POGO_H / 2); ctx.fillRect(p.x - CONFIG.POGO_W / 2, hy - CONFIG.POGO_H / 2, CONFIG.POGO_W, CONFIG.POGO_H); }
  if (p.upTimer > 0) { ctx.fillStyle = 'rgba(120,200,255,.35)'; const hy = sy(p.y - p.h / 2 - CONFIG.UPATK_H / 2); ctx.fillRect(p.x - CONFIG.UPATK_W / 2, hy - CONFIG.UPATK_H / 2, CONFIG.UPATK_W, CONFIG.UPATK_H); }

  drawHUD();
  if (paused) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PAUSE (P)', W / 2, H / 2); ctx.textAlign = 'left'; }
}

function spriteKey() {
  const p = player;
  if (p.state === 'fallStun') return 'fall';
  if (p.state === 'cling') return 'cling';
  if (p.pogoTimer > 0) return 'pogo';
  if (p.upTimer > 0) return 'upattack';
  if (p.vy < -60) return 'wallkick';
  if (p.vy > 120) return 'fall';
  return 'idle';
}

function drawPlayer() {
  const p = player;
  const x = p.x, y = sy(p.y);
  if (p.iframe > 0 && Math.floor(p.iframe * 20) % 2 === 0) return; // 点滅
  const img = sprites[spriteKey()];
  if (img && img.ok) {
    const dh = CONFIG.PLAYER_DRAW_H, dw = dh * (img.width / img.height);
    ctx.save();
    ctx.translate(x, y + p.h / 2); // 足元基準
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, -dh, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = p.state === 'fallStun' ? '#e74c3c' : p.state === 'cling' ? '#5dade2' : (p.pogoTimer > 0 ? '#f4d03f' : '#ecf0f1');
    roundRect(x - p.w / 2, y - p.h / 2, p.w, p.h, 5); ctx.fill();
    // 向きの目印
    ctx.fillStyle = '#1b2430'; ctx.fillRect(x + p.facing * 6 - 3, y - 14, 6, 6);
  }
}

function drawHUD() {
  ctx.textAlign = 'left';
  // 高さ
  ctx.fillStyle = '#eaf2ff'; ctx.font = 'bold 22px system-ui';
  ctx.fillText(`${(maxHeight / 100).toFixed(1)} m`, 14, 30);
  ctx.fillStyle = '#7f8ca0'; ctx.font = '12px system-ui';
  ctx.fillText(`now ${(Math.max(0, -player.y) / 100).toFixed(1)} m`, 14, 48);
  // HP
  for (let i = 0; i < CONFIG.HP_MAX; i++) {
    ctx.fillStyle = i < player.hp ? '#e74c3c' : '#3a4150';
    roundRect(14 + i * 20, 60, 15, 15, 3); ctx.fill();
  }
  // 張り付き残量
  if (player.state === 'cling') {
    const r = player.clingTimer / CONFIG.CLING_DURATION;
    ctx.fillStyle = '#2c3440'; ctx.fillRect(14, 86, 80, 6);
    ctx.fillStyle = '#5dade2'; ctx.fillRect(14, 86, 80 * Math.max(0, r), 6);
  }
  // 状態（デバッグ）
  ctx.fillStyle = '#566273'; ctx.font = '11px system-ui';
  ctx.fillText(player.state, W - 70, 24);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- loop (fixed timestep) ----
const STEP = 1 / 120;
let acc = 0, last = performance.now();
function frame(t) {
  let dt = (t - last) / 1000; last = t;
  acc += Math.min(dt, 0.1);
  while (acc >= STEP) { if (!paused) update(STEP); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
