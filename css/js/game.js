(() => {
'use strict';
const W = 400, H = 700, G = 0.5, STAGE_H = 3000, STAGES = 10, INK = '#16121a', GROUND_CAM = -(H - 90);
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d'); cv.width = W; cv.height = H;
const THEMES = [['#4fc3f7','#e1f5fe'],['#ff9a5a','#ffe0a3'],['#6a4c93','#e58f9f'],['#2b3a2f','#5b7a52'],['#222a3a','#4a5a78'],
  ['#5a1a1a','#b3402a'],['#3a0f3f','#8a2a5a'],['#150a24','#4a1a6a'],['#2a0000','#c2300a'],['#050005','#5a0014']];
const MOB = ['#7bd96b','#ffb347','#c58bff','#6fa86a','#6c8cff','#ff6b4a','#d33f9a','#8a5cff','#ff3b1f','#c4001a'];
const NAMES = ['Meadow','Sunset Hills','Dusk Cliffs','Dead Forest','Storm Peak','Ember Gate','Demon Court','Void Spire','Inferno','Hell Throne'];
const BOSSN = ['Grumpy Imp','Sun Eater','Dusk Duke','Rot King','Storm Fiend','Ember Lord','Court Jester','Void Maw','Inferno Titan','THE DEVIL'];
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, f) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => v + (y[i] - v) * f | 0)})`; };

// ---------- state ----------
let st = 'menu', T = 0, cam = GROUND_CAM, stage = 1, boss = null, arena = 0, genY = 0, maxH = 0, kills = 0, lives = 3, inv = 0, shake = 0, fireCD = 0, banner = null;
let plats = [], mobs = [], shots = [], ebul = [], parts = [], texts = [];
const keys = { l: 0, r: 0, f: 0 };
const frog = { x: W / 2, y: -16, vx: 0, vy: 0, face: 1, sq: 0, hurtT: 0 };
const topY = () => -stage * STAGE_H;
const score = () => Math.floor(maxH / 10);

// ---------- sound ----------
let ac; function sfx(f, d = .1, type = 'square') {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = .06; g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {}
}

// ---------- world ----------
function reset() {
  stage = 1; boss = null; maxH = 0; kills = 0; lives = 3; inv = 0; banner = null; T = 0; cam = GROUND_CAM;
  plats = [{ x: -50, y: 0, w: W + 100, t: 'g' }]; mobs = []; shots = []; ebul = []; parts = []; texts = []; genY = 0;
  Object.assign(frog, { x: W / 2, y: -16, vx: 0, vy: -14, sq: 0, hurtT: 0 });
  gen(); say(`STAGE 1 · ${NAMES[0]}`);
}
function gen() {
  while (!boss && genY > cam - 300 && genY > topY() + 20) {
    genY -= rnd(62, 88 + Math.min(stage * 4, 40));
    const r = Math.random(), p = { x: rnd(8, W - 78), y: genY, w: 70, t: 'n', v: 0 };
    if (stage >= 2 && r < .2) { p.t = 'm'; p.v = (Math.random() < .5 ? -1 : 1) * (1 + stage * .15); }
    else if (stage >= 3 && r < .34) p.t = 'c';
    else if (Math.random() < .06) p.sp = 1;
    plats.push(p);
    if (genY < -350 && Math.random() < .09 + stage * .015)
      mobs.push({ bx: p.x + 35, x: p.x + 35, y: genY - 70, by: genY - 70, hp: 1 + (stage > 5), ph: rnd(0, 6), k: stage - 1 });
  }
}
function startBoss() {
  arena = topY() - 450; const i = stage - 1, max = 6 + stage * 3;
  boss = { x: W / 2, y: arena + 130, hp: max, max, fl: 0, sc: 0, shot: 100, i };
  plats.push({ x: 0, y: arena + H - 40, w: W, t: 'b' });
  for (let k = 1; k <= 4; k++) plats.push({ x: rnd(10, W - 100), y: arena + H - 40 - k * 120, w: 90, t: 'n', v: 0 });
  say(`BOSS: ${BOSSN[i]}`); sfx(80, .5, 'sawtooth'); $('bbname').textContent = BOSSN[i]; $('bossbar').classList.remove('hidden'); $('bbfill').style.width = '100%';
}
function bossDead() {
  boom(boss.x, boss.y, MOB[boss.i], 40); shake = 22; sfx(60, .6, 'sawtooth');
  boss = null; $('bossbar').classList.add('hidden'); ebul = []; stage++;
  if (stage > STAGES) { setTimeout(() => end(true), 900); st = 'win'; return; }
  genY = arena + 130; say(`STAGE ${stage} · ${NAMES[stage - 1]}`);
}
const say = s => banner = { s, l: 150 };
function boom(x, y, c, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-6, 6), vy: rnd(-7, 3), l: 1, c: Math.random() < .5 ? c : '#ffd60a', r: rnd(3, 7) }); }
const pop = (x, y, s) => texts.push({ x, y, s, l: 34, a: rnd(-.3, .3) });

// ---------- actions ----------
function fire() {
  fireCD = 14; let tgt = null, bd = 1e9;
  const c = [...mobs, boss].filter(Boolean);
  for (const m of c) { const sy = m.y - cam; if (sy < 0 || sy > H) continue; const d = Math.hypot(m.x - frog.x, m.y - frog.y); if (d < bd) { bd = d; tgt = m; } }
  let dx = 0, dy = -1; if (tgt) { const d = Math.hypot(tgt.x - frog.x, tgt.y - frog.y); dx = (tgt.x - frog.x) / d; dy = (tgt.y - frog.y) / d; }
  shots.push({ x: frog.x, y: frog.y, vx: dx * 11, vy: dy * 11, a: 0, l: 80 }); sfx(900, .07);
}
function hurt() {
  if (inv > 0 || st !== 'play') return;
  lives--; inv = 100; shake = 12; frog.vy = -9; sfx(120, .25, 'sawtooth'); hearts();
  if (lives <= 0) { st = 'dying'; frog.hurtT = 0; }
}
function land() {
  if (frog.vy <= 0) return; const fy = frog.y + 16, py = fy - frog.vy;
  for (const p of plats) {
    if (p.dead || Math.abs(p.y - fy) > 60) continue;
    if (py <= p.y + 3 && fy >= p.y && frog.x > p.x - 8 && frog.x < p.x + p.w + 8) {
      if (p.t === 'g' && maxH > 250) { frog.y = p.y - 16; frog.vy = 0; st = 'dying'; frog.hurtT = 0; return; }   // упал на землю — проиграл
      frog.y = p.y - 16; frog.vy = p.sp ? -23 : -14.3; frog.sq = 1; if (p.t === 'c') { p.dead = 1; p.fv = 0; }
      boom(frog.x, fy, '#8ac926', 4); sfx(p.sp ? 700 : 420, .08); break;
    }
  }
}

// ---------- update ----------
function update() {
  T++; shake *= .86; if (inv > 0) inv--; if (fireCD > 0) fireCD--; if (frog.sq > 0) frog.sq -= .08;
  const dir = keys.r - keys.l;
  if (st === 'play') {
    frog.vx += (dir * 5.2 - frog.vx) * .25; if (dir) frog.face = dir;
    frog.x += frog.vx; if (frog.x < -14) frog.x = W + 14; if (frog.x > W + 14) frog.x = -14;
    frog.vy += G; frog.y += frog.vy; if (keys.f && fireCD <= 0) fire();
    land();
    if (boss && frog.y < arena + 30) { frog.y = arena + 30; frog.vy = Math.max(frog.vy, 0); }
    if (!boss && frog.y < topY() + 40) startBoss();
    maxH = Math.max(maxH, -frog.y);
  } else if (st === 'dying') {
    frog.vy = Math.min(frog.vy + G, 90); frog.y += frog.vy;                    // падаем до самого низа
    if (frog.y >= -16) { frog.y = -16; if (frog.hurtT++ === 0) { shake = 18; sfx(70, .4, 'sawtooth'); boom(frog.x, 0, '#ffd60a', 14); } if (frog.hurtT > 80) end(false); }
  }
  // camera
  if (st !== 'win') {
    if (frog.y - cam < H * .4) cam = frog.y - H * .4; else if (frog.y - cam > H * .7) cam = frog.y - H * .7;
    if (boss) cam = Math.max(cam, arena); cam = Math.min(cam, GROUND_CAM);
  }
  if (!boss) gen();
  // platforms
  for (const p of plats) {
    if (p.t === 'm') { p.x += p.v; if (p.x < 0 || p.x > W - p.w) p.v *= -1; }
    if (p.dead) { p.fv += .6; p.y += p.fv; }
  }
  if (plats.length > 400) plats = plats.filter(p => !p.dead || p.y < cam + H + 300);
  // mobs
  for (const m of mobs) {
    if (Math.abs(m.y - cam - H / 2) > H) continue;
    m.x = m.bx + Math.sin(T * .04 + m.ph) * 45; m.y = m.by + Math.sin(T * .07 + m.ph) * 8;
    if (st === 'play' && Math.hypot(m.x - frog.x, m.y - frog.y) < 28) {
      if (frog.vy > 2 && frog.y < m.y - 6) { m.hp = 0; frog.vy = -12; killFx(m, 'BAM!'); } else hurt();
    }
  }
  // shots
  for (const s of shots) {
    s.x += s.vx; s.y += s.vy; s.a += .5; s.l--;
    for (const m of mobs) if (m.hp > 0 && Math.hypot(m.x - s.x, m.y - s.y) < 24) { m.hp--; s.l = 0; if (m.hp <= 0) killFx(m, 'POW!'); else { pop(m.x, m.y, 'HIT'); sfx(300, .06); } }
    if (boss && Math.hypot(boss.x - s.x, boss.y - s.y) < 50) { s.l = 0; boss.hp--; boss.fl = 5; pop(s.x, s.y, 'ZAP!'); sfx(200, .08);
      $('bbfill').style.width = Math.max(0, boss.hp / boss.max * 100) + '%'; if (boss.hp <= 0) bossDead(); }
  }
  shots = shots.filter(s => s.l > 0); mobs = mobs.filter(m => m.hp > 0);
  // boss
  if (boss) {
    boss.t = (boss.t || 0) + 1; boss.fl = Math.max(0, boss.fl - 1);
    boss.x = W / 2 + Math.sin(T * .02 * (1 + stage * .08)) * 130; boss.y = arena + 130 + Math.sin(T * .05) * 20;
    if (--boss.shot <= 0) {
      boss.shot = Math.max(125 - stage * 7, 45); const n = 1 + Math.floor(stage / 4);
      for (let i = 0; i < n; i++) { const a = Math.atan2(frog.y - boss.y, frog.x - boss.x) + (i - (n - 1) / 2) * .35;
        ebul.push({ x: boss.x, y: boss.y + 20, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, l: 260 }); }
      sfx(160, .15, 'sawtooth');
    }
    if (st === 'play' && Math.hypot(boss.x - frog.x, boss.y - frog.y) < 56) hurt();
  }
  for (const b of ebul) { b.x += b.vx; b.y += b.vy; b.l--; if (st === 'play' && Math.hypot(b.x - frog.x, b.y - frog.y) < 18) { b.l = 0; hurt(); } }
  ebul = ebul.filter(b => b.l > 0);
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += .25; p.l -= .03; }
  parts = parts.filter(p => p.l > 0); texts.forEach(t => t.l--); texts = texts.filter(t => t.l > 0);
  if (banner && --banner.l <= 0) banner = null;
  if (st === 'play' || st === 'dying') ui();
}
function killFx(m, word) { boom(m.x, m.y, MOB[m.k], 14); pop(m.x, m.y, word); kills++; maxH += 100; sfx(500, .12); m.hp = 0; }

// ---------- draw ----------
const dotC = document.createElement('canvas'); dotC.width = dotC.height = 8;
{ const d = dotC.getContext('2d'); d.fillStyle = 'rgba(0,0,0,.5)'; d.beginPath(); d.arc(4, 4, 1.6, 0, 7); d.fill(); }
const dots = ctx.createPattern(dotC, 'repeat');

function demon(x, y, s, col, flash) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 3 / s; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.fillStyle = flash ? '#fff' : col;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 8, -12); ctx.lineTo(d * 22, -36); ctx.lineTo(d * 19, -8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 0, 23, 20, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe600';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 3, -2); ctx.lineTo(d * 15, -9); ctx.lineTo(d * 13, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-12, 8); for (let i = 0; i < 6; i++) ctx.lineTo(-12 + i * 4.8 + 2.4, i % 2 ? 8 : 15); ctx.lineTo(12, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBg() {
  const t = clamp(-cam / STAGE_H, 0, 9.999), i = t | 0, f = t - i, a = THEMES[i], b = THEMES[Math.min(i + 1, 9)];
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix(a[0], b[0], f)); g.addColorStop(1, mix(a[1], b[1], f));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (i >= 6) { ctx.fillStyle = '#ff2a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(300, 140 - cam * .02 % 40, 55, 0, 7); ctx.fill(); ctx.stroke(); }
  if (i < 3) { ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const y = ((k * 230 - cam * .3) % (H + 200) + H + 200) % (H + 200) - 100, x = (k * 150 + 40) % W;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.arc(x + 26, y + 6, 18, 0, 7); ctx.arc(x - 24, y + 8, 16, 0, 7); ctx.fill(); ctx.stroke(); } }
  if (i >= 3) for (let k = 0; k < 5; k++) { const y = ((k * 190 - cam * .25) % (H + 260) + H + 260) % (H + 260) - 130;
    ctx.globalAlpha = Math.min(.5, .12 + i * .05); demon((k * 137 + 50) % W, y, 1.8 + (k % 3) * .7, '#0a0408'); }
  ctx.globalAlpha = 1;
  if (i === 4 && Math.random() < .015) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = .22; ctx.fillStyle = dots; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
}
function drawPlat(p) {
  const y = p.y - cam; if (y < -20 || y > H + 20) return;
  const dark = stage >= 6, col = { g: '#7a4a2a', b: '#5a3a3a', n: dark ? '#7a5a8a' : '#8ac926', m: '#2aa0e8', c: '#c98a4a' }[p.t];
  ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.roundRect(p.x, y, p.w, p.t === 'g' ? 90 : 14, 6); ctx.fill(); ctx.stroke();
  if (p.t === 'g' || p.t === 'b') { ctx.fillStyle = dark ? '#8a3a3a' : '#55a630'; ctx.fillRect(p.x + 2, y + 2, p.w - 4, 9); }
  if (p.t === 'c') { ctx.beginPath(); ctx.moveTo(p.x + 25, y); ctx.lineTo(p.x + 33, y + 14); ctx.moveTo(p.x + 48, y); ctx.lineTo(p.x + 40, y + 14); ctx.stroke(); }
  if (p.sp) { ctx.fillStyle = '#ff3b4e'; ctx.beginPath(); ctx.roundRect(p.x + 26, y - 14, 18, 14, 4); ctx.fill(); ctx.stroke(); }
}
function drawFrog() {
  const y = frog.y - cam, up = frog.vy < 0, sq = Math.max(0, frog.sq);
  ctx.save(); ctx.translate(frog.x, y); if (inv > 0 && (T >> 2) & 1) ctx.globalAlpha = .4;
  if (st === 'dying' && frog.hurtT > 0) ctx.scale(1.3, .6); else ctx.scale(1 + sq * .25, 1 - sq * .25 + (up ? .12 : 0));
  if (up && frog.vy < -8) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; for (const d of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(d, 22); ctx.lineTo(d, 42); ctx.stroke(); } }
  ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.fillStyle = '#6cc24a';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 14, up ? 18 : 12, up ? 5 : 10, up ? 11 : 6, d * (up ? .2 : 0), 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 2, 20, 17, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9f5b0'; ctx.beginPath(); ctx.ellipse(0, 8, 11, 8, 0, 0, 7); ctx.fill();
  for (const d of [-1, 1]) { ctx.fillStyle = '#6cc24a'; ctx.beginPath(); ctx.arc(d * 11, -14, 8, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d * 11, -14, 5, 0, 7); ctx.fill();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(d * 11 + frog.face * 1.8, -14, 2.4, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 2, 7, .15, Math.PI - .15); ctx.stroke();
  ctx.restore();
  if (st === 'dying' && frog.hurtT > 0) { ctx.fillStyle = '#ffd60a'; for (let k = 0; k < 3; k++) { const a = T * .15 + k * 2.1; ctx.fillText('★', frog.x + Math.cos(a) * 20 - 6, y - 24 + Math.sin(a) * 6); } }
}
function drawShot(s) { ctx.save(); ctx.translate(s.x, s.y - cam); ctx.rotate(s.a); ctx.fillStyle = '#d8dde6'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 12, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
function draw() {
  ctx.save(); if (shake > .5) ctx.translate(rnd(-shake, shake) / 2, rnd(-shake, shake) / 2);
  drawBg(); plats.forEach(drawPlat);
  for (const m of mobs) { const y = m.y - cam; if (y > -50 && y < H + 50) demon(m.x, y, 1, MOB[m.k]); }
  if (boss) { demon(boss.x, boss.y - cam, 2.6, MOB[boss.i], boss.fl > 0); }
  ctx.fillStyle = '#ff3b4e'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  for (const b of ebul) { ctx.beginPath(); ctx.arc(b.x, b.y - cam, 8, 0, 7); ctx.fill(); ctx.stroke(); }
  shots.forEach(drawShot);
  ctx.font = '900 16px Nunito'; if (st !== 'menu') drawFrog();
  for (const p of parts) { ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y - cam, p.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const t of texts) { ctx.save(); ctx.translate(t.x, t.y - cam - (34 - t.l)); ctx.rotate(t.a); ctx.scale(1 + (t.l > 28 ? (t.l - 28) * .08 : 0), 1 + (t.l > 28 ? (t.l - 28) * .08 : 0));
    ctx.font = '400 34px Bangers'; ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeText(t.s, 0, 0); ctx.fillStyle = '#ffd60a'; ctx.fillText(t.s, 0, 0); ctx.restore(); }
  if (banner) { ctx.save(); ctx.globalAlpha = Math.min(1, banner.l / 25); ctx.translate(W / 2, 150); ctx.rotate(-.03);
    ctx.font = '400 30px Bangers'; const w = ctx.measureText(banner.s).width + 40; ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(-w / 2, -26, w, 50, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.fillText(banner.s, 0, 9); ctx.restore(); }
  ctx.restore();
}

// ---------- UI / profile / leaderboard ----------
const tg = window.Telegram && Telegram.WebApp; if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} }
const tgu = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
const uid = tgu ? 'tg' + tgu.id : (localStorage.fj_uid = localStorage.fj_uid || 'u' + Math.random().toString(36).slice(2, 10));
$('nick').value = localStorage.fj_name || (tgu && tgu.first_name) || '';
const DB = (window.FROG_CONFIG && FROG_CONFIG.FIREBASE_DB_URL || '').replace(/\/$/, '');
const best = () => +localStorage.fj_best || 0;
function hearts() { $('hearts').textContent = '❤'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives)); }
let lastScr = -1; function ui() { const s = score(); if (s !== lastScr) { lastScr = s; $('scr').textContent = s + ' m'; $('stg').textContent = `STAGE ${Math.min(stage, STAGES)}/${STAGES}`; } }
const show = (id, on) => $(id).classList.toggle('hidden', !on);
function play() {
  localStorage.fj_name = $('nick').value.trim(); reset(); st = 'play'; hearts(); lastScr = -1;
  ['menu', 'over', 'lb', 'bossbar'].forEach(i => show(i, false)); ['hud', 'tl', 'tr', 'fire'].forEach(i => show(i, true)); ui();
}
async function end(win) {
  st = win ? 'win' : 'over'; ['hud', 'tl', 'tr', 'fire', 'bossbar'].forEach(i => show(i, false));
  const s = score(); if (s > best()) { localStorage.fj_best = s; push(s); }
  $('otitle').textContent = win ? 'YOU WIN!' : 'GAME OVER'; $('oh').textContent = s + ' m'; $('ob').textContent = best() + ' m'; $('ok').textContent = kills; show('over', true);
}
function nick() { return ($('nick').value.trim() || (tgu && tgu.first_name) || 'Frog').slice(0, 14); }
function push(s) {
  const local = JSON.parse(localStorage.fj_lb || '{}'); local[uid] = { n: nick(), s }; localStorage.fj_lb = JSON.stringify(local);
  if (DB) fetch(`${DB}/scores/${uid}.json`, { method: 'PUT', body: JSON.stringify({ n: nick(), s }) }).catch(() => {});
}
async function openLb() {
  let data = JSON.parse(localStorage.fj_lb || '{}');
  if (DB) { try { data = await (await fetch(`${DB}/scores.json`)).json() || data; } catch (e) {} }
  const list = Object.values(data).sort((a, b) => b.s - a.s).slice(0, 100);
  $('lblist').innerHTML = list.length ? '' : '<li><span>—</span></li>';
  list.forEach(e => { const li = document.createElement('li'); const sp = document.createElement('span'); sp.textContent = e.n; const b = document.createElement('b'); b.textContent = e.s + ' m'; li.append(sp, b); $('lblist').append(li); });
  show('lb', true);
}
$('play').onclick = play; $('again').onclick = play; $('top').onclick = openLb; $('lbclose').onclick = () => show('lb', false);
$('tomenu').onclick = () => { show('over', false); show('menu', true); st = 'menu'; reset(); };

// ---------- input ----------
const hold = (el, k) => { const on = e => { e.preventDefault(); keys[k] = 1; }, off = e => { e.preventDefault(); keys[k] = 0; };
  el.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => el.addEventListener(n, off)); };
hold($('tl'), 'l'); hold($('tr'), 'r'); hold($('fire'), 'f');
addEventListener('keydown', e => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = 1; if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = 1; if (e.code === 'Space') keys.f = 1; });
addEventListener('keyup', e => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = 0; if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = 0; if (e.code === 'Space') keys.f = 0; });

reset(); frog.vy = 0; frog.y = -16; hearts();
(function loop() { if (st !== 'menu') update(); else { T++; } draw(); requestAnimationFrame(loop); })();
})();
