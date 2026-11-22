/* Mille Jeux : moteur commun + 30 jeux, chacun décliné en variantes (règles, vitesse, taille, thème).
   Chaque jeu = { id, n (nom), e (emoji), cat, d (description), how (règle), axes: [{k, o: [[libellé, valeur], …]}], play(ctx) } */
'use strict';
const MJ = (() => {
  const PAL = [
    {n: 'Néon', a: '#b86bff', b: '#38e1ff', c: '#ff4fa3', bg: '#0d0820'},
    {n: 'Lagon', a: '#38e1ff', b: '#3dffa2', c: '#ffd166', bg: '#04141c'},
    {n: 'Braise', a: '#ff7a3d', b: '#ffd166', c: '#ff4d6d', bg: '#1a0907'},
    {n: 'Forêt', a: '#3dffa2', b: '#b6ff5c', c: '#38e1ff', bg: '#05170d'},
    {n: 'Givre', a: '#9fd8ff', b: '#ffffff', c: '#b86bff', bg: '#0a1124'},
    {n: 'Bonbon', a: '#ff8ad8', b: '#ffd166', c: '#7ef9ff', bg: '#1d0819'}
  ];
  const EMO = {
    fruits: ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍑', '🍋', '🍉', '🥥', '🍐', '🫐', '🥭', '🍊', '🍈'],
    animaux: ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐷', '🐰', '🐙', '🦄', '🐢', '🦉', '🐧'],
    espace: ['🚀', '🪐', '🌙', '⭐', '☄️', '👽', '🛸', '🌍', '🔭', '🌞', '🌌', '🛰️', '👾', '🌠', '🌑', '🧑‍🚀'],
    sport: ['⚽', '🏀', '🎾', '🏈', '⚾', '🏐', '🏓', '🥊', '⛳', '🏒', '🎳', '🥏', '🏸', '🛹', '🥅', '🏆'],
    food: ['🍕', '🍔', '🌮', '🍩', '🍪', '🧁', '🍣', '🥐', '🍟', '🍦', '🥨', '🍫', '🥞', '🍿', '🧀', '🍭'],
    nature: ['🌸', '🌵', '🍄', '🌻', '🍁', '🌴', '🌈', '❄️', '🔥', '🌊', '🍀', '🌷', '🌲', '🌙', '⚡', '🌺']
  };
  const EMN = {fruits: 'Fruits', animaux: 'Animaux', espace: 'Espace', sport: 'Sport', food: 'Gourmand', nature: 'Nature'};
  const TH = PAL.map((p, i) => [p.n, i]), TH3 = TH.slice(0, 3), EM = Object.keys(EMO).map(k => [EMN[k], k]);
  const D4 = [['Facile', 1], ['Normal', 2], ['Difficile', 3], ['Expert', 4]], D3 = D4.slice(0, 3);
  const CATS = {ref: '⚡ Réflexes', mem: '🧠 Mémoire', log: '🧩 Réflexion', arc: '🕹️ Arcade', mot: '🔤 Mots & calcul'};
  const ENG = [], def = e => ENG.push(e);
  const pl = (n, w) => n + ' ' + w.replace(/\{s\}/g, Math.abs(n) > 1 ? 's' : '');
  const st3 = (v, a, b, c) => v >= c ? 3 : v >= b ? 2 : v >= a ? 1 : 0;
  let WORDS = null;
  const words = () => WORDS ? Promise.resolve(WORDS) : fetch('mots.txt').then(r => r.text()).then(t => { const w = t.split(/\s+/).filter(Boolean); WORDS = {all: w, set: new Set(w), by: n => w.filter(x => x.length === n)}; return WORDS; });

  /* ---------------- moteur ---------------- */
  function run(stage, v, hooks){
    let dead = false; const offs = [], tids = []; let rafId = 0;
    stage.innerHTML = ''; stage.className = 'mj-stage';
    const P = v.P, T = PAL[P.t | 0] || PAL[0];
    stage.style.setProperty('--a', T.a); stage.style.setProperty('--b', T.b); stage.style.setProperty('--c', T.c); stage.style.setProperty('--bgc', T.bg);
    const cleanup = () => { tids.forEach(id => { clearTimeout(id); clearInterval(id); }); offs.forEach(f => f()); cancelAnimationFrame(rafId); };
    const ctx = {
      P, T, stage, em: EMO[P.em] || EMO[['fruits', 'animaux', 'espace', 'sport', 'food', 'nature'][(P.t | 0) % 6]],
      rnd: (a, b) => a + Math.random() * (b - a), ri: (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick: a => a[Math.random() * a.length | 0],
      shuf: a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; },
      get dead(){ return dead; },
      on(el, ev, fn, o){ el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); },
      after(ms, fn){ const id = setTimeout(() => { if (!dead) fn(); }, ms); tids.push(id); return id; },
      every(ms, fn){ const id = setInterval(() => { if (!dead) fn(); }, ms); tids.push(id); return id; },
      loop(fn){ let last = performance.now(); const step = now => { if (dead) return; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; fn(dt, now); if (!dead) rafId = requestAnimationFrame(step); }; rafId = requestAnimationFrame(step); },
      hud(s){ hooks.hud(s); },
      sfx: k => { try { (sfx[k] || sfx.click)(); } catch(e) {} },
      beep: (f, d) => { try { tone(f, 0, d || .08, 'triangle', .06); } catch(e) {} },
      end(score, stars, msg){ if (dead) return; dead = true; cleanup(); hooks.end({score: Math.max(0, Math.round(score)), stars: Math.max(0, Math.min(3, stars | 0)), msg: msg || ''}); },
      key(fn){ ctx.on(window, 'keydown', fn); },
      // toile : coordonnées logiques W×H, mise à l'échelle « contain »
      canvas(W, H){
        const dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; c.className = 'mj-cv';
        stage.appendChild(c); const g = c.getContext('2d'); g.scale(dpr, dpr);
        const pos = ev => { const r = c.getBoundingClientRect(), s = Math.min(r.width / W, r.height / H), ox = (r.width - W * s) / 2, oy = (r.height - H * s) / 2; return {x: (ev.clientX - r.left - ox) / s, y: (ev.clientY - r.top - oy) / s}; };
        return {c, g, W, H, pos};
      },
      // grille de boutons qui tient dans la scène
      grid(cols, rows, cls){
        const g = document.createElement('div'); g.className = 'mj-grid ' + (cls || ''); g.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)'; g.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
        const cells = []; for (let i = 0; i < cols * rows; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'mj-cell'; b.dataset.i = i; g.appendChild(b); cells.push(b); }
        stage.appendChild(g);
        const fit = () => { const r = stage.getBoundingClientRect(), extra = [...stage.children].filter(x => x !== g).reduce((a, x) => a + x.getBoundingClientRect().height, 0); const s = Math.max(120, Math.min(r.width - 8, (r.height - extra - 16) * cols / rows)); g.style.width = s + 'px'; g.style.height = (s * rows / cols) + 'px'; g.style.fontSize = Math.max(11, s / cols * .42) + 'px'; };
        requestAnimationFrame(fit); ctx.on(window, 'resize', fit); g.fit = fit;
        return {el: g, cells};
      },
      // balayage (doigt) + flèches/ZQSD
      swipe(fn){
        let s = null; stage.style.touchAction = 'none';
        ctx.on(stage, 'pointerdown', e => { s = {x: e.clientX, y: e.clientY}; });
        ctx.on(stage, 'pointerup', e => { if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; s = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); });
        ctx.key(e => { const m = {ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', KeyA: 'l', KeyQ: 'l', KeyD: 'r', KeyW: 'u', KeyZ: 'u', KeyS: 'd'}[e.code]; if (m) { e.preventDefault(); fn(m); } });
      },
      // déplacement horizontal : glisser le doigt / la souris, ou flèches
      steer(cv, get, set, speed){
        const keys = {}; let tx = null;
        ctx.on(cv.c, 'pointerdown', e => { tx = cv.pos(e).x; cv.c.setPointerCapture && cv.c.setPointerCapture(e.pointerId); });
        ctx.on(cv.c, 'pointermove', e => { if (tx !== null || e.pointerType === 'mouse') tx = cv.pos(e).x; });
        ctx.on(cv.c, 'pointerup', () => { tx = null; });
        ctx.on(cv.c, 'pointerleave', e => { if (e.pointerType === 'mouse') tx = null; });
        ctx.key(e => { keys[e.code] = true; if (/Arrow|Key[ADQ]/.test(e.code)) e.preventDefault(); }); ctx.on(window, 'keyup', e => { keys[e.code] = false; });
        return dt => { let x = get(); const dir = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || keys.KeyQ ? 1 : 0);
          if (dir) x += dir * speed * dt; else if (tx !== null) x += Math.max(-speed * dt * 1.6, Math.min(speed * dt * 1.6, tx - x)); set(x); };
      },
      // boutons de réponse sous la question
      choices(labels, onPick, cls){
        const w = document.createElement('div'); w.className = 'mj-choices ' + (cls || '');
        labels.forEach((l, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mj-ch'; b.innerHTML = l; b.dataset.i = i; w.appendChild(b); });
        ctx.on(w, 'click', e => { const b = e.target.closest('.mj-ch'); if (b && !b.disabled) onPick(+b.dataset.i, b); });
        return w;
      },
      el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
    };
    try { v.eng.play(ctx); } catch(err) { console.error(err); ctx.end(0, 0, 'Oups, ce jeu a rencontré une erreur.'); }
    return {stop(){ if (!dead) { dead = true; cleanup(); } }};
  }
  // toutes les variantes = produit des axes de chaque jeu
  function variants(){
    const out = [];
    for (const e of ENG) {
      let combos = [[]]; for (const ax of e.axes) combos = combos.flatMap(c => ax.o.map(o => c.concat([o])));
      combos.forEach((c, i) => { const P = {}; e.axes.forEach((ax, j) => { P[ax.k] = c[j][1]; }); out.push({id: e.id + '-' + (i + 1), eng: e, P, name: e.n, sub: c.map(x => x[0]).join(' · '), num: i + 1}); });
    }
    return out;
  }
  const glow = (g, col, blur) => { g.shadowColor = col; g.shadowBlur = blur; };
  const bg = (cv, T) => { const g = cv.g; g.shadowBlur = 0; g.fillStyle = T.bg; g.fillRect(0, 0, cv.W, cv.H); g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let x = 0; x <= cv.W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, cv.H); g.stroke(); } for (let y = 0; y <= cv.H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(cv.W, y); g.stroke(); } };
  const txt = (g, s, x, y, size, col, al) => { g.shadowBlur = 0; g.fillStyle = col || '#fff'; g.font = '800 ' + size + 'px Unbounded, Inter, sans-serif'; g.textAlign = al || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  /* ================= ⚡ RÉFLEXES ================= */
  def({id: 'cibles', n: 'Cibles néon', e: '🎯', cat: 'ref', d: 'Touche les cibles avant qu\'elles ne disparaissent.', how: 'Touche chaque cible lumineuse le plus vite possible. Les petites rapportent plus.',
    axes: [{k: 'd', o: D4}, {k: 'm', o: [['Classique', 'c'], ['Chrono 30 s', 't'], ['Survie', 's']]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g, d = P.d; let tg = [], hits = 0, miss = 0, spawned = 0, lives = 3, time = 30, sp = 0, combo = 0, score = 0;
      const total = 20, cols = [T.a, T.b, T.c];
      x.on(cv.c, 'pointerdown', e => { const p = cv.pos(e); for (let i = tg.length - 1; i >= 0; i--) { const t = tg[i], r = t.r * Math.min(1, t.age * 6); if (Math.hypot(p.x - t.x, p.y - t.y) < r + 8) { tg.splice(i, 1); hits++; combo++; score += Math.round(10 + (40 - t.r) + combo * 2); x.beep(500 + combo * 40); return; } } combo = 0; x.beep(160); });
      x.loop(dt => {
        sp -= dt; const rate = (P.m === 's' ? Math.max(.3, 1.1 - hits * .02) : 1) * (1.05 - d * .17);
        if (sp <= 0 && (P.m !== 'c' || spawned < total)) { sp = rate; spawned++; const r = Math.max(14, 34 - d * 4 - Math.random() * 8); tg.push({x: x.rnd(r + 10, 350 - r), y: x.rnd(r + 50, 530 - r), r, age: 0, life: (2.2 - d * .3) * (P.m === 's' ? Math.max(.55, 1 - hits * .01) : 1), col: x.pick(cols)}); }
        for (let i = tg.length - 1; i >= 0; i--) { const t = tg[i]; t.age += dt; if (t.age > t.life) { tg.splice(i, 1); miss++; combo = 0; if (P.m === 's') lives--; } }
        if (P.m === 't') time -= dt;
        bg(cv, T); for (const t of tg) { const k = Math.min(1, t.age * 6), left = 1 - t.age / t.life; glow(g, t.col, 18); g.strokeStyle = t.col; g.lineWidth = 4; g.beginPath(); g.arc(t.x, t.y, t.r * k, 0, 7); g.stroke(); g.fillStyle = t.col; g.beginPath(); g.arc(t.x, t.y, t.r * k * .35, 0, 7); g.fill(); g.lineWidth = 2; g.globalAlpha = .5; g.beginPath(); g.arc(t.x, t.y, t.r * k + 6, -1.57, -1.57 + 6.283 * left); g.stroke(); g.globalAlpha = 1; }
        x.hud(P.m === 'c' ? '🎯 ' + hits + ' / ' + total + ' · ' + score + ' pts' : P.m === 't' ? '⏱ ' + Math.ceil(time) + ' s · 🎯 ' + hits : '❤️'.repeat(Math.max(0, lives)) + ' · 🎯 ' + hits);
        if (P.m === 'c' && spawned >= total && !tg.length) x.end(score, st3(hits / total, .5, .75, .95), pl(hits, 'cible{s}') + ' sur ' + total);
        if (P.m === 't' && time <= 0) x.end(score, st3(hits, 10 + d * 3, 18 + d * 4, 26 + d * 5), pl(hits, 'cible{s}') + ' en 30 secondes');
        if (P.m === 's' && lives <= 0) x.end(score, st3(hits, 10, 25, 45), pl(hits, 'cible{s}') + ' avant de perdre tes 3 vies');
      });
    }});

  def({id: 'eclair', n: 'Réflexe éclair', e: '⚡', cat: 'ref', d: 'Mesure ton temps de réaction en millisecondes.', how: 'Attends que la zone devienne verte, puis touche-la le plus vite possible. 5 essais.',
    axes: [{k: 'm', o: [['Simple', 's'], ['Pièges rouges', 'p'], ['Bonne couleur', 'c']]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, pad = x.el('button', 'mj-pad', ''), info = x.el('div', 'mj-q', ''); pad.type = 'button'; x.stage.append(info, pad);
      const COL = [['VERT', '#2fe08c'], ['ROUGE', '#ff4d6d'], ['BLEU', '#38a9ff'], ['JAUNE', '#ffd166']];
      let n = 0, times = [], state = 'wait', t0 = 0, target = COL[0], cur = null, pen = 0;
      const next = () => { if (n >= 5) { const avg = times.reduce((a, b) => a + b, 0) / times.length + pen / 5; return x.end(Math.max(0, 1000 - avg), avg < 290 ? 3 : avg < 360 ? 2 : avg < 480 ? 1 : 0, 'Moyenne : ' + Math.round(avg) + ' ms'); }
        state = 'wait'; pad.style.background = '#2a1d4a'; pad.textContent = 'Attends…'; if (P.m === 'c') { target = x.pick(COL); info.innerHTML = 'Touche quand c\'est <b style="color:' + target[1] + '">' + target[0] + '</b>'; } else info.textContent = 'Essai ' + (n + 1) + ' / 5';
        const go = () => { if (P.m === 'p' && Math.random() < .3) { cur = COL[1]; state = 'trap'; pad.style.background = cur[1]; pad.textContent = 'NE TOUCHE PAS'; x.after(900, () => { if (state === 'trap') next(); }); return; }
          if (P.m === 'c') { cur = x.pick(COL); if (cur !== target) { state = 'trap'; pad.style.background = cur[1]; pad.textContent = cur[0]; x.after(800, () => { if (state === 'trap') go(); }); return; } }
          state = 'go'; t0 = performance.now(); pad.style.background = P.m === 'c' ? target[1] : '#2fe08c'; pad.textContent = 'TOUCHE !'; };
        x.after(x.rnd(1000, 3200), go); };
      x.on(pad, 'pointerdown', e => { e.preventDefault();
        if (state === 'go') { const ms = performance.now() - t0; times.push(ms); n++; state = 'done'; pad.textContent = Math.round(ms) + ' ms'; x.beep(800); x.after(800, next); }
        else if (state === 'wait' || state === 'trap') { pen += 300; x.beep(140, .2); pad.textContent = 'Trop tôt ! +300 ms'; pad.style.background = '#5a1020'; state = 'done'; x.after(900, next); } });
      x.hud('⚡ Réflexe'); next();
    }});

  def({id: 'taupe', n: 'Tape-taupe', e: '🔨', cat: 'ref', d: 'Tape les têtes qui sortent des trous.', how: 'Touche chaque personnage qui apparaît. Évite les bombes 💣 (–3). 30 secondes.',
    axes: [{k: 'n', o: [['3×3', 3], ['4×4', 4], ['5×5', 5]]}, {k: 'v', o: [['Calme', 1], ['Vif', 2], ['Frénétique', 3]]}, {k: 'b', o: [['Sans bombe', 0], ['Avec bombes', 1]]}, {k: 'em', o: EM.slice(0, 3)}],
    play(x){
      const {P} = x, G = x.grid(P.n, P.n, 'holes'); let score = 0, time = 30, up = new Map();
      const pop = () => { const free = G.cells.filter(c => !up.has(c)); if (!free.length) return; const c = x.pick(free), bomb = P.b && Math.random() < .2; c.textContent = bomb ? '💣' : x.pick(x.em); c.classList.add('up'); up.set(c, bomb); x.after(1300 - P.v * 280, () => { if (up.get(c) !== undefined) { up.delete(c); c.textContent = ''; c.classList.remove('up'); } }); };
      x.on(G.el, 'pointerdown', e => { const c = e.target.closest('.mj-cell'); if (!c || !up.has(c)) return; const bomb = up.get(c); up.delete(c); c.textContent = bomb ? '💥' : '✨'; c.classList.remove('up'); x.after(200, () => { if (!up.has(c)) c.textContent = ''; }); if (bomb) { score = Math.max(0, score - 3); x.beep(120, .25); } else { score++; x.beep(700); } });
      x.every(Math.max(260, 760 - P.v * 150 - P.n * 30), pop);
      x.loop(dt => { time -= dt; x.hud('⏱ ' + Math.ceil(time) + ' s · ⭐ ' + score); if (time <= 0) x.end(score * 10, st3(score, 10 + P.v * 3, 18 + P.v * 5, 26 + P.v * 7), pl(score, 'touché{s}')); });
    }});

  def({id: 'esquive', n: 'Esquive', e: '☄️', cat: 'ref', d: 'Évite la pluie de météores le plus longtemps possible.', how: 'Glisse le doigt (ou flèches) pour déplacer ton vaisseau et éviter tout ce qui tombe.',
    axes: [{k: 'd', o: D4}, {k: 'n', o: [['Pluie fine', 1], ['Averse', 1.6], ['Tempête', 2.3]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let px = 180, rocks = [], t = 0, sp = 0;
      const move = x.steer(cv, () => px, v => { px = Math.max(18, Math.min(342, v)); }, 380);
      x.loop(dt => { t += dt; move(dt); sp -= dt; if (sp <= 0) { sp = Math.max(.12, (.7 - P.d * .1) / P.n / (1 + t / 40)); const r = x.rnd(9, 22); rocks.push({x: x.rnd(r, 360 - r), y: -r, r, v: (150 + P.d * 50) * (1 + t / 45) * x.rnd(.8, 1.25)}); }
        bg(cv, T); for (let i = rocks.length - 1; i >= 0; i--) { const r = rocks[i]; r.y += r.v * dt; if (r.y > 560) { rocks.splice(i, 1); continue; } glow(g, T.c, 12); g.fillStyle = T.c; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.fill(); if (Math.hypot(r.x - px, r.y - 500) < r.r + 13) { x.beep(110, .3); return x.end(t * 10, st3(t, 15, 30, 55), 'Tenu ' + t.toFixed(1) + ' s'); } }
        glow(g, T.b, 18); g.fillStyle = T.b; g.beginPath(); g.moveTo(px, 482); g.lineTo(px - 16, 514); g.lineTo(px + 16, 514); g.closePath(); g.fill(); x.hud('⏱ ' + t.toFixed(1) + ' s'); });
    }});

  def({id: 'panier', n: 'Panier gourmand', e: '🧺', cat: 'ref', d: 'Attrape tout ce qui tombe, sauf les bombes.', how: 'Déplace le panier (doigt ou flèches). +1 par objet attrapé, –5 par bombe. 40 secondes.',
    axes: [{k: 'd', o: D4}, {k: 'b', o: [['Sans bombe', 0], ['Avec bombes', 1]]}, {k: 'em', o: EM}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let px = 180, it = [], time = 40, sc = 0, sp = 0;
      const move = x.steer(cv, () => px, v => { px = Math.max(34, Math.min(326, v)); }, 420);
      x.loop(dt => { time -= dt; move(dt); sp -= dt; if (sp <= 0) { sp = .75 - P.d * .1; const bomb = P.b && Math.random() < .22; it.push({x: x.rnd(20, 340), y: -20, v: 140 + P.d * 55 + (40 - time) * 3, e: bomb ? '💣' : x.pick(x.em), bomb}); }
        bg(cv, T); g.font = '30px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = it.length - 1; i >= 0; i--) { const o = it[i]; o.y += o.v * dt; if (o.y > 486 && o.y < 520 && Math.abs(o.x - px) < 40) { it.splice(i, 1); if (o.bomb) { sc = Math.max(0, sc - 5); x.beep(110, .3); } else { sc++; x.beep(660); } continue; } if (o.y > 570) { it.splice(i, 1); continue; } g.shadowBlur = 0; g.fillText(o.e, o.x, o.y); }
        glow(g, T.a, 16); g.fillStyle = T.a; g.fillRect(px - 38, 500, 76, 14); g.fillRect(px - 38, 484, 8, 20); g.fillRect(px + 30, 484, 8, 20);
        x.hud('⏱ ' + Math.ceil(time) + ' s · 🧺 ' + sc); if (time <= 0) x.end(sc * 10, st3(sc, 15, 25, 35), pl(sc, 'attrapé{s}')); });
    }});

  def({id: 'centre', n: 'Pile au centre', e: '🎚️', cat: 'ref', d: 'Arrête l\'aiguille pile dans la zone.', how: 'Touche l\'écran (ou Espace) pour arrêter l\'aiguille. Plus tu es proche du centre, plus tu marques. 10 essais.',
    axes: [{k: 'z', o: [['Grande zone', .18], ['Zone moyenne', .11], ['Petite zone', .06]]}, {k: 'v', o: [['Lent', 1], ['Normal', 1.6], ['Rapide', 2.3], ['Fou', 3.2]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 300), g = cv.g; let ph = 0, tries = 0, sc = 0, zc = .5, pause = 0, last = '';
      const stop = () => { if (pause > 0) return; const pos = (Math.sin(ph) + 1) / 2, dist = Math.abs(pos - zc), pts = dist <= P.z / 2 ? Math.round(100 - dist / (P.z / 2) * 50) : 0; sc += pts; tries++; last = pts ? '+' + pts : 'Raté'; x.beep(pts ? 500 + pts * 4 : 140); pause = .7; if (tries >= 10) x.after(700, () => x.end(sc, st3(sc, 400, 600, 800), sc + ' points sur 1 000')); else zc = x.rnd(.2, .8); };
      x.on(cv.c, 'pointerdown', stop); x.key(e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); stop(); } });
      x.loop(dt => { if (pause > 0) pause -= dt; else ph += dt * P.v * 2.2; const pos = (Math.sin(ph) + 1) / 2;
        bg(cv, T); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(20, 130, 320, 40); glow(g, T.b, 14); g.fillStyle = T.b; g.fillRect(20 + (zc - P.z / 2) * 320, 130, P.z * 320, 40); g.fillStyle = T.c; g.fillRect(20 + zc * 320 - 1, 126, 2, 48);
        glow(g, T.a, 16); g.fillStyle = '#fff'; g.fillRect(20 + pos * 320 - 3, 112, 6, 76); txt(g, last, 180, 70, 26, T.b); txt(g, 'Essai ' + Math.min(10, tries + 1) + ' / 10', 180, 240, 16, '#a79fc4');
        x.hud('🎚️ ' + sc + ' pts'); });
    }});

  def({id: 'tri', n: 'Tri express', e: '↔️', cat: 'ref', d: 'Range chaque objet du bon côté, vite !', how: 'Selon la règle affichée, envoie l\'objet à gauche ou à droite (glisse, flèches ou boutons). 45 secondes.',
    axes: [{k: 'r', o: [['Couleur', 'c'], ['Pair / impair', 'p'], ['Grand / petit', 'g']]}, {k: 'v', o: D3}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, q = x.el('div', 'mj-q'), card = x.el('div', 'mj-card'), time0 = 45; let time = time0, sc = 0, cur = null;
      const L = P.r === 'c' ? ['Chaud 🔴', 'Froid 🔵'] : P.r === 'p' ? ['Pair', 'Impair'] : ['< 50', '≥ 50'];
      q.innerHTML = '⬅️ <b>' + L[0] + '</b> · <b>' + L[1] + '</b> ➡️';
      const ch = x.choices(['⬅️ ' + L[0], L[1] + ' ➡️'], i => answer(i ? 'r' : 'l')); x.stage.append(q, card, ch);
      const nextItem = () => { if (P.r === 'c') { const hot = Math.random() < .5, hue = hot ? x.pick([0, 15, 30, 340, 50]) : x.pick([190, 210, 230, 170, 260]); cur = {side: hot ? 'l' : 'r'}; card.innerHTML = '<span class="dot" style="background:hsl(' + hue + ',90%,58%)"></span>'; }
        else { const n = P.r === 'p' ? x.ri(1, 99) : x.ri(1, 99) + (P.v > 1 && Math.random() < .3 ? 0 : 0); cur = {side: P.r === 'p' ? (n % 2 ? 'r' : 'l') : (n < 50 ? 'l' : 'r')}; card.textContent = n; } card.className = 'mj-card pop'; };
      const answer = s => { if (!cur) return; if (s === cur.side) { sc++; x.beep(700); } else { sc = Math.max(0, sc - 1); time -= P.v; x.beep(140, .2); card.classList.add('bad'); } nextItem(); };
      x.swipe(answer); nextItem();
      x.loop(dt => { time -= dt * (1 + (P.v - 1) * .25); x.hud('⏱ ' + Math.max(0, Math.ceil(time)) + ' s · ✅ ' + sc); if (time <= 0) x.end(sc * 10, st3(sc, 15, 28, 40), pl(sc, 'bien rangé{s}')); });
    }});

  /* ================= 🧠 MÉMOIRE ================= */
  def({id: 'echo', n: 'Écho lumineux', e: '🔆', cat: 'mem', d: 'Répète la séquence de lumières qui s\'allonge.', how: 'Regarde les cases s\'allumer, puis touche-les dans le même ordre. Une de plus à chaque tour.',
    axes: [{k: 'n', o: [['4 cases', 4], ['6 cases', 6], ['9 cases', 9]]}, {k: 'v', o: [['Posé', 620], ['Vif', 430], ['Éclair', 280]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, cols = P.n === 4 ? 2 : 3, G = x.grid(cols, P.n / cols, 'echo'); let seq = [], i = 0, lock = true;
      G.cells.forEach((c, k) => { c.style.setProperty('--h', Math.round(k * 360 / P.n)); });
      const flash = (k, ms) => { const c = G.cells[k]; c.classList.add('lit'); x.beep(300 + k * 60, ms / 1000); x.after(ms * .8, () => c.classList.remove('lit')); };
      const play = () => { lock = true; i = 0; seq.push(x.ri(0, P.n - 1)); x.hud('🔆 Longueur ' + seq.length); seq.forEach((k, j) => x.after(500 + j * P.v, () => flash(k, P.v))); x.after(500 + seq.length * P.v, () => { lock = false; }); };
      x.on(G.el, 'pointerdown', e => { const c = e.target.closest('.mj-cell'); if (!c || lock) return; const k = +c.dataset.i; flash(k, 220);
        if (k !== seq[i]) { lock = true; const n = seq.length - 1; return x.after(300, () => x.end(n * 100, st3(n, 5, 8, 12), 'Séquence de ' + n + ' retenue')); }
        if (++i >= seq.length) { lock = true; x.after(600, play); } });
      play();
    }});

  def({id: 'paires', n: 'Paires', e: '🃏', cat: 'mem', d: 'Retrouve toutes les paires de cartes.', how: 'Retourne deux cartes à la fois. Si elles sont identiques, elles restent visibles.',
    axes: [{k: 's', o: [['12 cartes', [4, 3]], ['16 cartes', [4, 4]], ['20 cartes', [5, 4]], ['30 cartes', [6, 5]]]}, {k: 'em', o: EM}, {k: 'm', o: [['Libre', 'l'], ['Chrono', 'c']]}],
    play(x){
      const {P} = x, [c, r] = P.s, n = c * r / 2, deck = x.shuf(x.shuf(x.em.slice()).slice(0, n).flatMap(e => [e, e])), G = x.grid(c, r, 'cards');
      let open = [], found = 0, moves = 0, time = n * 5 + 10, lock = false;
      G.cells.forEach((b, k) => { b.dataset.e = deck[k]; b.innerHTML = '<span>' + deck[k] + '</span>'; });
      x.on(G.el, 'click', e => { const b = e.target.closest('.mj-cell'); if (!b || lock || b.classList.contains('open')) return; b.classList.add('open'); open.push(b); x.beep(520);
        if (open.length === 2) { moves++; const [a, d] = open; open = []; if (a.dataset.e === d.dataset.e) { found++; a.classList.add('ok'); d.classList.add('ok'); x.beep(880); if (found === n) { const ratio = moves / n; x.end(n * 100 - moves * 5 + (P.m === 'c' ? Math.round(time) * 5 : 0), ratio <= 1.5 ? 3 : ratio <= 2.1 ? 2 : 1, n + ' paires en ' + pl(moves, 'coup{s}')); } }
          else { lock = true; x.after(700, () => { a.classList.remove('open'); d.classList.remove('open'); lock = false; }); } } });
      x.loop(dt => { if (P.m === 'c') { time -= dt; if (time <= 0) return x.end(found * 50, found >= n * .75 ? 1 : 0, 'Temps écoulé : ' + pl(found, 'paire{s}') + ' sur ' + n); } x.hud((P.m === 'c' ? '⏱ ' + Math.ceil(time) + ' s · ' : '') + '🃏 ' + found + ' / ' + n + ' · ' + moves + ' coups'); });
    }});

  def({id: 'memogrille', n: 'Mémo-grille', e: '🔲', cat: 'mem', d: 'Mémorise les cases allumées puis retrouve-les.', how: 'Des cases s\'allument un instant. Touche exactement les mêmes. 3 erreurs maximum.',
    axes: [{k: 'n', o: [['4×4', 4], ['5×5', 5], ['6×6', 6], ['7×7', 7]]}, {k: 's', o: [['Lent', 1.6], ['Normal', 1.1], ['Flash', .65]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, G = x.grid(P.n, P.n, 'memo'); let lvl = 1, lives = 3, lit = new Set(), got = 0, lock = true;
      const round = () => { lock = true; got = 0; G.cells.forEach(c => c.className = 'mj-cell'); const k = Math.min(P.n * P.n - 2, 2 + lvl); lit = new Set(x.shuf([...Array(P.n * P.n).keys()]).slice(0, k)); lit.forEach(i => G.cells[i].classList.add('lit'));
        x.hud('🔲 Niveau ' + lvl + ' · ' + '❤️'.repeat(lives)); x.after(600 + k * 180 * P.s, () => { lit.forEach(i => G.cells[i].classList.remove('lit')); lock = false; }); };
      x.on(G.el, 'pointerdown', e => { const c = e.target.closest('.mj-cell'); if (!c || lock || c.classList.contains('ok') || c.classList.contains('ko')) return; const i = +c.dataset.i;
        if (lit.has(i)) { c.classList.add('ok'); x.beep(600 + got * 40); if (++got === lit.size) { lvl++; lock = true; x.after(500, round); } }
        else { c.classList.add('ko'); x.beep(140, .2); if (--lives <= 0) { lock = true; lit.forEach(j => G.cells[j].classList.add('lit')); x.after(900, () => x.end((lvl - 1) * 100, st3(lvl - 1, 4, 7, 11), 'Niveau ' + lvl + ' atteint')); } else x.hud('🔲 Niveau ' + lvl + ' · ' + '❤️'.repeat(lives)); } });
      round();
    }});

  def({id: 'compte', n: 'Compte vite', e: '🔢', cat: 'mem', d: 'Combien en as-tu vu ? Réponds avant d\'oublier.', how: 'Des objets apparaissent un court instant. Indique combien il y avait de l\'objet demandé. 10 manches.',
    axes: [{k: 'd', o: D4}, {k: 'em', o: EM}],
    play(x){
      const {P} = x, cv = x.canvas(360, 360), g = cv.g, q = x.el('div', 'mj-q'); x.stage.prepend(q); let r = 0, ok = 0, box = null;
      const round = () => { if (box) box.remove(); if (r >= 10) return x.end(ok * 100, st3(ok, 5, 7, 9), pl(ok, 'bonne{s} réponse{s}') + ' sur 10'); r++;
        const kinds = x.shuf(x.em.slice()).slice(0, 1 + Math.min(3, P.d)), target = kinds[0], want = x.ri(2, 5 + P.d * 2), items = [];
        for (let i = 0; i < want; i++) items.push(target); for (let i = 0; i < x.ri(2, 4 + P.d * 3); i++) items.push(x.pick(kinds.slice(1).length ? kinds.slice(1) : kinds)); if (kinds.length === 1) items.length = want;
        g.clearRect(0, 0, 360, 360); g.fillStyle = x.T.bg; g.fillRect(0, 0, 360, 360); g.font = '32px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const spots = [];
        for (const it of items) { let p, tries = 0; do { p = {x: x.rnd(24, 336), y: x.rnd(24, 336)}; } while (tries++ < 60 && spots.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 40)); spots.push(p); g.fillText(it, p.x, p.y); }
        q.innerHTML = 'Manche ' + r + ' / 10 · Mémorise !'; x.hud('🔢 ' + ok + ' / ' + (r - 1));
        x.after(2400 - P.d * 400, () => { g.fillStyle = x.T.bg; g.fillRect(0, 0, 360, 360); txt(g, '?', 180, 180, 90, 'rgba(255,255,255,.15)'); q.innerHTML = 'Combien de ' + target + ' ?';
          const opts = x.shuf([...new Set([want, want + 1, Math.max(1, want - 1), want + 2])]).slice(0, 4); if (!opts.includes(want)) opts[0] = want; x.shuf(opts);
          box = x.choices(opts.map(String), (i, b) => { box.querySelectorAll('button').forEach(z => z.disabled = true); if (opts[i] === want) { ok++; b.classList.add('ok'); x.beep(800); } else { b.classList.add('ko'); x.beep(140, .2); } x.after(600, round); }); x.stage.append(box); }); };
      round();
    }});

  /* ================= 🧩 RÉFLEXION ================= */
  def({id: 'fusion', n: 'Fusion', e: '🔷', cat: 'log', d: 'Fais glisser les tuiles et fusionne les nombres identiques.', how: 'Glisse dans une direction : toutes les tuiles bougent et deux nombres égaux fusionnent. Atteins l\'objectif.',
    axes: [{k: 'n', o: [['3×3', 3], ['4×4', 4], ['5×5', 5]]}, {k: 'goal', o: [['Objectif modeste', 0], ['Objectif ambitieux', 1], ['Objectif extrême', 2]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, N = P.n, GOAL = {3: [64, 128, 256], 4: [256, 512, 2048], 5: [512, 2048, 4096]}[N][P.goal], G = x.grid(N, N, 'fuse'); let b = Array(N * N).fill(0), sc = 0;
      const add = () => { const e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) b[x.pick(e)] = Math.random() < .9 ? 2 : 4; };
      const draw = () => G.cells.forEach((c, i) => { c.textContent = b[i] || ''; c.style.setProperty('--l', b[i] ? Math.log2(b[i]) : 0); c.classList.toggle('v', !!b[i]); });
      const canMove = () => b.some(v => !v) || b.some((v, i) => (i % N < N - 1 && v === b[i + 1]) || (i + N < N * N && v === b[i + N]));
      const slide = dir => { const old = b.join(); for (let k = 0; k < N; k++) { const idx = [...Array(N).keys()].map(j => dir === 'l' ? k * N + j : dir === 'r' ? k * N + N - 1 - j : dir === 'u' ? j * N + k : (N - 1 - j) * N + k);
          let row = idx.map(i => b[i]).filter(Boolean); for (let j = 0; j < row.length - 1; j++) if (row[j] === row[j + 1]) { row[j] *= 2; sc += row[j]; row.splice(j + 1, 1); } idx.forEach((i, j) => { b[i] = row[j] || 0; }); }
        if (b.join() !== old) { add(); draw(); x.beep(420); const mx = Math.max(...b); x.hud('🔷 ' + sc + ' pts · ' + mx + ' / ' + GOAL);
          if (mx >= GOAL) return x.after(300, () => x.end(sc, 3, 'Objectif ' + GOAL + ' atteint !')); if (!canMove()) x.after(400, () => x.end(sc, mx >= GOAL / 2 ? 2 : mx >= GOAL / 4 ? 1 : 0, 'Plus de coup possible · tuile max ' + mx)); } };
      x.swipe(slide); add(); add(); draw(); x.hud('🔷 Objectif : ' + GOAL);
    }});

  def({id: 'demineur', n: 'Démineur', e: '💣', cat: 'log', d: 'Découvre toutes les cases sans faire exploser de mine.', how: 'Touche une case pour la découvrir. Le chiffre indique les mines voisines. Active 🚩 pour poser des drapeaux.',
    axes: [{k: 'n', o: [['7×7', 7], ['9×9', 9], ['11×11', 11], ['13×13', 13]]}, {k: 'p', o: [['Peu de mines', .1], ['Normal', .15], ['Beaucoup', .2]]}, {k: 't', o: TH3}],
    play(x){
      const {P} = x, N = P.n, M = Math.max(3, Math.round(N * N * P.p)), flagBtn = x.el('button', 'btn ghost sm mj-flag', '🚩 Drapeau : non'); flagBtn.type = 'button'; x.stage.append(flagBtn);
      const G = x.grid(N, N, 'mines'); let mines = null, open = 0, flag = false, t0 = performance.now(), done = false; const near = i => { const r = i / N | 0, c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && cc >= 0 && rr < N && cc < N) o.push(rr * N + cc); } return o; };
      x.on(flagBtn, 'click', () => { flag = !flag; flagBtn.textContent = '🚩 Drapeau : ' + (flag ? 'oui' : 'non'); flagBtn.classList.toggle('on', flag); });
      const reveal = i => { const c = G.cells[i]; if (c.classList.contains('o') || c.classList.contains('f')) return; c.classList.add('o'); open++; const k = near(i).filter(j => mines.has(j)).length; c.textContent = k || ''; c.dataset.k = k; if (!k) near(i).forEach(reveal); };
      x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c || done) return; const i = +c.dataset.i;
        if (flag) { if (!c.classList.contains('o')) { c.classList.toggle('f'); c.textContent = c.classList.contains('f') ? '🚩' : ''; } return; }
        if (c.classList.contains('f')) return;
        if (!mines) { const safe = new Set([i, ...near(i)]); mines = new Set(x.shuf([...Array(N * N).keys()].filter(j => !safe.has(j))).slice(0, M)); }
        if (mines.has(i)) { done = true; mines.forEach(j => { G.cells[j].textContent = '💣'; G.cells[j].classList.add('boom'); }); x.beep(100, .4); const pct = open / (N * N - M); return x.after(900, () => x.end(open * 5, pct > .5 ? 1 : 0, 'Boum ! ' + Math.round(pct * 100) + ' % découvert')); }
        reveal(i); x.beep(500); x.hud('💣 ' + M + ' mines · ' + Math.round(open / (N * N - M) * 100) + ' %');
        if (open === N * N - M) { done = true; const s = (performance.now() - t0) / 1000; x.after(400, () => x.end(Math.max(100, 3000 - s * 10) * P.p * 10, s < N * N * .5 ? 3 : 2, 'Déminé en ' + Math.round(s) + ' s')); } });
      x.hud('💣 ' + M + ' mines');
    }});

  def({id: 'interrupteurs', n: 'Interrupteurs', e: '💡', cat: 'log', d: 'Éteins toutes les lumières.', how: 'Toucher une case inverse son état et celui de ses voisines. Éteins tout en un minimum de coups.',
    axes: [{k: 'n', o: [['3×3', 3], ['4×4', 4], ['5×5', 5], ['6×6', 6]]}, {k: 'p', o: [['Voisins en croix', '+'], ['Voisins en diagonale', 'x']]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, N = P.n, G = x.grid(N, N, 'lights'); let on = Array(N * N).fill(false), moves = 0;
      const nb = i => { const r = i / N | 0, c = i % N, d = P.p === '+' ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] : [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]; return d.map(([a, b]) => [r + a, c + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N).map(([a, b]) => a * N + b); };
      const press = i => nb(i).forEach(j => { on[j] = !on[j]; });
      const par = x.ri(N + 1, N * 2 + 1); const picks = new Set(); while (picks.size < par) picks.add(x.ri(0, N * N - 1)); picks.forEach(press); if (!on.some(Boolean)) press(0);
      const draw = () => G.cells.forEach((c, i) => c.classList.toggle('lit', on[i]));
      x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c) return; press(+c.dataset.i); moves++; draw(); x.beep(on[+c.dataset.i] ? 700 : 400); x.hud('💡 ' + on.filter(Boolean).length + ' allumées · ' + moves + ' coups');
        if (!on.some(Boolean)) x.after(300, () => x.end(Math.max(50, 1000 - moves * 15), moves <= picks.size ? 3 : moves <= picks.size * 1.6 ? 2 : 1, 'Tout éteint en ' + pl(moves, 'coup{s}'))); });
      draw(); x.hud('💡 ' + on.filter(Boolean).length + ' allumées');
    }});

  def({id: 'taquin', n: 'Taquin', e: '🧱', cat: 'log', d: 'Remets les tuiles dans l\'ordre en les faisant glisser.', how: 'Touche une tuile voisine de la case vide pour la déplacer. Range tout dans l\'ordre.',
    axes: [{k: 'n', o: [['3×3', 3], ['4×4', 4], ['5×5', 5]]}, {k: 'm', o: [['Chiffres', 'n'], ['Dégradé', 'c']]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, N = P.n, G = x.grid(N, N, 'taquin'); let b = [...Array(N * N).keys()].map(i => (i + 1) % (N * N)), moves = 0;
      const adj = i => { const r = i / N | 0, c = i % N; return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, d]) => a >= 0 && d >= 0 && a < N && d < N).map(([a, d]) => a * N + d); };
      let e0 = N * N - 1, prev = -1; for (let k = 0; k < N * N * 12; k++) { const o = adj(e0).filter(j => j !== prev); const j = x.pick(o); [b[e0], b[j]] = [b[j], b[e0]]; prev = e0; e0 = j; }
      const draw = () => G.cells.forEach((c, i) => { const v = b[i]; c.textContent = v && P.m === 'n' ? v : ''; c.classList.toggle('empty', !v); c.style.setProperty('--h', v ? Math.round(200 + (v - 1) / (N * N - 1) * 150) : 0); c.style.setProperty('--l', v ? 30 + ((v - 1) % N) / N * 40 : 0); c.classList.toggle('grad', P.m === 'c'); });
      x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c) return; const i = +c.dataset.i, z = b.indexOf(0); if (!adj(z).includes(i)) return; [b[z], b[i]] = [b[i], b[z]]; moves++; draw(); x.beep(450); x.hud('🧱 ' + moves + ' coups');
        if (b.every((v, k) => v === (k + 1) % (N * N))) x.after(300, () => x.end(Math.max(100, N * 500 - moves * 4), moves < N * N * 4 ? 3 : moves < N * N * 8 ? 2 : 1, 'Résolu en ' + pl(moves, 'coup{s}'))); });
      draw(); x.hud('🧱 0 coup');
    }});

  def({id: 'intrus', n: 'L\'intrus', e: '🔍', cat: 'log', d: 'Trouve la case différente des autres.', how: 'Une seule case est différente : touche-la. La grille grandit et la différence devient subtile. 40 secondes.',
    axes: [{k: 'k', o: [['Couleur', 'c'], ['Emoji', 'e'], ['Forme', 'f']]}, {k: 'v', o: [['Tranquille', 1], ['Rapide', 2], ['Éclair', 3]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x; let lvl = 1, time = 40, G = null, odd = -1;
      const SH = [['●', '○'], ['■', '□'], ['▲', '△'], ['★', '☆'], ['◆', '◇'], ['♥', '♡']];
      const round = () => { if (G) G.el.remove(); const n = Math.min(8, 2 + Math.floor(lvl / 2)); G = x.grid(n, n, 'odd'); odd = x.ri(0, n * n - 1);
        if (P.k === 'c') { const h = x.ri(0, 359), d = Math.max(4, 40 - lvl * 2.2); G.cells.forEach((c, i) => { c.style.background = 'hsl(' + (i === odd ? h + d : h) + ',75%,55%)'; }); }
        else if (P.k === 'e') { const pair = x.shuf(x.em.slice()).slice(0, 2); G.cells.forEach((c, i) => { c.textContent = i === odd ? pair[1] : pair[0]; }); }
        else { const s = x.pick(SH); G.cells.forEach((c, i) => { c.textContent = i === odd ? s[1] : s[0]; c.style.color = 'var(--a)'; }); }
        G.el.fit(); };
      x.on(x.stage, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c) return; if (+c.dataset.i === odd) { lvl++; x.beep(600 + lvl * 20); round(); } else { time -= 3; x.beep(140, .2); c.classList.add('ko'); } });
      round(); x.loop(dt => { time -= dt * (1 + (P.v - 1) * .3); x.hud('⏱ ' + Math.max(0, Math.ceil(time)) + ' s · 🔍 niveau ' + lvl); if (time <= 0) x.end((lvl - 1) * 100, st3(lvl - 1, 8, 14, 20), pl(lvl - 1, 'intrus trouvé{s}')); });
    }});

  def({id: 'labyrinthe', n: 'Labyrinthe', e: '🌀', cat: 'log', d: 'Trouve la sortie d\'un labyrinthe généré.', how: 'Glisse (ou flèches) : tu avances jusqu\'au prochain carrefour. Rejoins la case brillante.',
    axes: [{k: 's', o: [['Petit', 8], ['Moyen', 12], ['Grand', 16], ['Géant', 20]]}, {k: 'f', o: [['Visible', 'v'], ['Brouillard', 'f'], ['Chrono serré', 'c']]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, N = P.s, cv = x.canvas(360, 360), g = cv.g, cs = 360 / N, W = [...Array(N * N)].map(() => ({u: 1, d: 1, l: 1, r: 1})), seen = new Set([0]);
      const st = [0]; while (st.length) { const i = st[st.length - 1], r = i / N | 0, c = i % N, o = [['u', r - 1, c, 'd'], ['d', r + 1, c, 'u'], ['l', r, c - 1, 'r'], ['r', r, c + 1, 'l']].filter(([, a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(a * N + b));
        if (!o.length) { st.pop(); continue; } const [k, a, b, opp] = x.pick(o), j = a * N + b; W[i][k] = 0; W[j][opp] = 0; seen.add(j); st.push(j); }
      let pos = 0, steps = 0, t = 0; const limit = N * N * .35, goal = N * N - 1, D = {u: -N, d: N, l: -1, r: 1};
      const open = (i, k) => !W[i][k], exits = i => ['u', 'd', 'l', 'r'].filter(k => open(i, k));
      const go = k => { if (!open(pos, k)) { x.beep(150); return; } let back = {u: 'd', d: 'u', l: 'r', r: 'l'}[k]; pos += D[k]; steps++;
        while (pos !== goal) { const ex = exits(pos).filter(e => e !== back); if (ex.length !== 1) break; back = {u: 'd', d: 'u', l: 'r', r: 'l'}[ex[0]]; pos += D[ex[0]]; steps++; } x.beep(500);
        if (pos === goal) x.after(200, () => x.end(Math.max(50, 2000 - t * 10) * N / 8, t < N * 1.4 ? 3 : t < N * 3 ? 2 : 1, 'Sortie trouvée en ' + Math.round(t) + ' s')); };
      x.swipe(go);
      x.loop(dt => { t += dt; if (P.f === 'c' && t > limit) return x.end(0, 0, 'Temps écoulé !');
        bg(cv, T); g.shadowBlur = 0; g.strokeStyle = T.a; g.lineWidth = 2.5; g.lineCap = 'round';
        const pr = pos / N | 0, pc = pos % N;
        for (let i = 0; i < N * N; i++) { const r = i / N | 0, c = i % N; if (P.f === 'f' && Math.hypot(r - pr, c - pc) > 2.6) continue; const X = c * cs, Y = r * cs; g.beginPath(); if (W[i].u) { g.moveTo(X, Y); g.lineTo(X + cs, Y); } if (W[i].l) { g.moveTo(X, Y); g.lineTo(X, Y + cs); } if (W[i].d) { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); } if (W[i].r) { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); } g.stroke(); }
        glow(g, T.b, 16); g.fillStyle = T.b; g.fillRect((N - 1) * cs + cs * .2, (N - 1) * cs + cs * .2, cs * .6, cs * .6);
        glow(g, T.c, 16); g.fillStyle = T.c; g.beginPath(); g.arc(pc * cs + cs / 2, pr * cs + cs / 2, cs * .32, 0, 7); g.fill();
        x.hud('🌀 ' + Math.round(t) + ' s' + (P.f === 'c' ? ' / ' + Math.round(limit) + ' s' : '')); });
    }});

  def({id: 'morpion', n: 'Morpion', e: '⭕', cat: 'log', d: 'Aligne tes symboles avant l\'ordinateur.', how: 'Tu joues ✕, l\'ordinateur joue ◯. Aligne le nombre indiqué en ligne, colonne ou diagonale.',
    axes: [{k: 'g', o: [['3×3', [3, 3]], ['4×4 · aligne 4', [4, 4]], ['5×5 · aligne 4', [5, 4]]]}, {k: 'ai', o: [['Facile', 0], ['Malin', 1], ['Coriace', 2]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, [N, K] = P.g, G = x.grid(N, N, 'ttt'); let b = Array(N * N).fill(0), lock = false;
      const lines = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const l = []; for (let k = 0; k < K; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || cc < 0 || rr >= N || cc >= N) break; l.push(rr * N + cc); } if (l.length === K) lines.push(l); }
      const win = (bd, p) => lines.some(l => l.every(i => bd[i] === p)), full = bd => bd.every(Boolean);
      const mm = (bd, p, depth, a, be) => { if (win(bd, 2)) return 10 - depth; if (win(bd, 1)) return depth - 10; if (full(bd) || depth > (N === 3 ? 9 : 2)) return 0; let best = p === 2 ? -99 : 99;
        for (let i = 0; i < bd.length; i++) if (!bd[i]) { bd[i] = p; const v = mm(bd, 3 - p, depth + 1, a, be); bd[i] = 0; if (p === 2) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); be = Math.min(be, v); } if (be <= a) break; } return best; };
      const score = i => { let s = 0; for (const l of lines) if (l.includes(i)) { const me = l.filter(j => b[j] === 2).length, op = l.filter(j => b[j] === 1).length; if (!op) s += [1, 4, 20, 200, 1000][me]; if (!me) s += [1, 3, 15, 150, 800][op]; } return s + Math.random(); };
      const aiMove = () => { const free = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); let pick;
        if (P.ai === 0) { pick = x.pick(free); for (const i of free) { b[i] = 2; if (win(b, 2)) pick = i; b[i] = 0; } }
        else if (P.ai === 2 && N === 3) { let best = -99; for (const i of free) { b[i] = 2; const v = mm(b, 1, 0, -99, 99); b[i] = 0; if (v > best) { best = v; pick = i; } } }
        else { pick = free.reduce((a, i) => score(i) > score(a) ? i : a, free[0]); if (P.ai === 1 && Math.random() < .15) pick = x.pick(free); }
        b[pick] = 2; draw(); x.beep(380); check(); lock = false; };
      const draw = () => G.cells.forEach((c, i) => { c.textContent = b[i] === 1 ? '✕' : b[i] === 2 ? '◯' : ''; c.classList.toggle('p1', b[i] === 1); c.classList.toggle('p2', b[i] === 2); });
      const check = () => { if (win(b, 1)) { lock = true; x.after(400, () => x.end(300, 3, 'Victoire !')); return true; } if (win(b, 2)) { lock = true; x.after(400, () => x.end(0, 0, 'L\'ordinateur gagne.')); return true; } if (full(b)) { lock = true; x.after(400, () => x.end(100, P.ai === 2 ? 2 : 1, 'Match nul.')); return true; } return false; };
      x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c || lock || b[+c.dataset.i]) return; b[+c.dataset.i] = 1; draw(); x.beep(600); if (check()) return; lock = true; x.after(350, aiMove); });
      x.hud('⭕ Aligne ' + K + ' · tu commences'); draw();
    }});

  def({id: 'plusmoins', n: 'Plus ou moins', e: '❓', cat: 'log', d: 'Devine le nombre secret.', how: 'Propose un nombre : on te dit si le secret est plus grand ou plus petit. Trouve-le en un minimum d\'essais.',
    axes: [{k: 'r', o: [['1 à 50', 50], ['1 à 100', 100], ['1 à 500', 500], ['1 à 1 000', 1000]]}, {k: 'k', o: [['Essais illimités', 0], ['Essais confortables', 3], ['Essais comptés au plus juste', 1]]}, {k: 't', o: TH3}],
    play(x){
      const {P} = x, secret = x.ri(1, P.r), q = x.el('div', 'mj-q', 'Le nombre est entre 1 et ' + P.r), disp = x.el('div', 'mj-card', '–'); let cur = '', tries = 0, lo = 1, hi = P.r;
      const pad = x.choices(['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'], i => { const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'][i];
        if (k === '⌫') cur = cur.slice(0, -1); else if (k === 'OK') return guess(); else if (cur.length < 4) cur += k; disp.textContent = cur || '–'; }, 'pad');
      x.stage.append(q, disp, pad);
      const opt = Math.ceil(Math.log2(P.r + 1)), lim = P.k ? opt + (P.k === 3 ? 3 : 0) : 0; q.textContent += lim ? ' · ' + lim + ' essais' : '';
      const guess = () => { const n = +cur; cur = ''; disp.textContent = '–'; if (!n || n > P.r) return; tries++; x.beep(500);
        if (n === secret) return x.end(Math.max(50, 1000 - tries * 60), tries <= opt ? 3 : tries <= opt + 2 ? 2 : 1, 'Trouvé en ' + tries + ' essai' + (tries > 1 ? 's' : '') + ' (' + secret + ')');
        if (n < secret) lo = Math.max(lo, n + 1); else hi = Math.min(hi, n - 1);
        q.innerHTML = n + ' : c\'est <b>' + (n < secret ? 'PLUS ⬆️' : 'MOINS ⬇️') + '</b> · entre ' + lo + ' et ' + hi;
        if (lim && tries >= lim) x.end(0, 0, 'Perdu : le nombre était ' + secret); x.hud('❓ ' + tries + (lim ? ' / ' + lim : '') + ' essais'); };
      x.key(e => { if (/^Digit\d$|^Numpad\d$/.test(e.code) && cur.length < 4) { cur += e.key; disp.textContent = cur; } else if (e.code === 'Backspace') { cur = cur.slice(0, -1); disp.textContent = cur || '–'; } else if (e.code === 'Enter' || e.code === 'NumpadEnter') guess(); });
      x.hud('❓ 0 essai');
    }});

  /* ================= 🕹️ ARCADE ================= */
  def({id: 'serpent', n: 'Serpent', e: '🐍', cat: 'arc', d: 'Mange, grandis, ne te mords pas la queue.', how: 'Glisse ou utilise les flèches pour diriger le serpent vers les fruits.',
    axes: [{k: 'v', o: [['Lent', 6], ['Normal', 9], ['Rapide', 13], ['Turbo', 18]]}, {k: 'w', o: [['Murs mortels', 1], ['Bords traversants', 0]]}, {k: 'n', o: [['Petit terrain', 12], ['Moyen', 16], ['Grand', 20]]}, {k: 'o', o: [['Sans obstacle', 0], ['Obstacles', 1]]}],
    play(x){
      const {P, T} = x, N = P.n, cv = x.canvas(360, 360), g = cv.g, cs = 360 / N; let sn = [[N >> 1, N >> 1]], dir = [1, 0], nd = [1, 0], food = null, acc = 0, sc = 0, go = false;
      const rocks = new Set(); if (P.o) for (let i = 0; i < N; i++) rocks.add(x.ri(0, N - 1) + ',' + x.ri(0, N - 1)); rocks.forEach(k => { const [a, b] = k.split(',').map(Number); if (Math.abs(a - (N >> 1)) < 3 && b === N >> 1) rocks.delete(k); });
      const place = () => { let p; do { p = [x.ri(0, N - 1), x.ri(0, N - 1)]; } while (sn.some(s => s[0] === p[0] && s[1] === p[1]) || rocks.has(p.join())); food = p; };
      place(); x.swipe(k => { const d = {l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1]}[k]; if (!go) { go = true; nd = d; dir = d; return; } if (d[0] !== -dir[0] || d[1] !== -dir[1]) nd = d; });
      x.loop(dt => { if (go) acc += dt; if (acc >= 1 / P.v) { acc = 0; dir = nd; let h = [sn[0][0] + dir[0], sn[0][1] + dir[1]];
          if (!P.w) h = [(h[0] + N) % N, (h[1] + N) % N];
          if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || sn.some(s => s[0] === h[0] && s[1] === h[1]) || rocks.has(h.join())) { x.beep(110, .4); return x.end(sc * 10 * P.v / 6, st3(sc, 5, 12, 20), pl(sc, 'fruit{s} mangé{s}')); }
          sn.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { sc++; x.beep(700); place(); } else sn.pop(); }
        bg(cv, T); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.18)'; rocks.forEach(k => { const [a, b] = k.split(',').map(Number); g.fillRect(a * cs + 1, b * cs + 1, cs - 2, cs - 2); });
        if (P.w) { g.strokeStyle = T.c; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 357, 357); }
        glow(g, T.c, 14); g.fillStyle = T.c; g.beginPath(); g.arc(food[0] * cs + cs / 2, food[1] * cs + cs / 2, cs * .38, 0, 7); g.fill();
        glow(g, T.a, 12); sn.forEach((s, i) => { g.fillStyle = i ? T.a : T.b; g.fillRect(s[0] * cs + 1.5, s[1] * cs + 1.5, cs - 3, cs - 3); });
        if (!go) txt(g, 'Glisse ou flèche pour partir', 180, 120, 15, '#fff'); x.hud('🐍 ' + pl(sc, 'fruit{s}')); });
    }});

  def({id: 'vol', n: 'Vol néon', e: '🪽', cat: 'arc', d: 'Bats des ailes pour passer entre les colonnes.', how: 'Touche l\'écran ou appuie sur Espace pour remonter. Ne touche pas les colonnes.',
    axes: [{k: 'gap', o: [['Passage large', 170], ['Passage moyen', 140], ['Passage étroit', 115]]}, {k: 'v', o: [['Doux', 120], ['Normal', 160], ['Rapide', 210]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let y = 260, vy = 0, cols = [], sp = 0, sc = 0, started = false;
      const flap = () => { started = true; vy = -330; x.beep(620, .05); }; x.on(cv.c, 'pointerdown', flap); x.key(e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } });
      x.loop(dt => { if (started) { vy += 900 * dt; y += vy * dt; sp -= dt; if (sp <= 0) { sp = 220 / P.v; cols.push({x: 380, gy: x.rnd(90, 450 - P.gap), done: false}); } }
        bg(cv, T); for (let i = cols.length - 1; i >= 0; i--) { const c = cols[i]; c.x -= P.v * dt; if (c.x < -60) { cols.splice(i, 1); continue; } glow(g, T.a, 12); g.fillStyle = T.a; g.fillRect(c.x, 0, 52, c.gy); g.fillRect(c.x, c.gy + P.gap, 52, 540); if (!c.done && c.x + 52 < 90) { c.done = true; sc++; x.beep(880); }
          if (90 + 13 > c.x && 90 - 13 < c.x + 52 && (y - 13 < c.gy || y + 13 > c.gy + P.gap)) return x.end(sc * 20, st3(sc, 5, 15, 30), pl(sc, 'colonne{s} passée{s}')); }
        if (y > 527 || y < 13) { if (started) return x.end(sc * 20, st3(sc, 5, 15, 30), pl(sc, 'colonne{s} passée{s}')); }
        glow(g, T.b, 16); g.fillStyle = T.b; g.beginPath(); g.arc(90, y, 13, 0, 7); g.fill(); if (!started) txt(g, 'Touche pour décoller', 180, 330, 16, '#fff'); x.hud('🪽 ' + sc); });
    }});

  def({id: 'briques', n: 'Casse-briques', e: '🧱', cat: 'arc', d: 'Renvoie la balle et détruis toutes les briques.', how: 'Déplace la raquette (doigt ou flèches). 3 vies.',
    axes: [{k: 'L', o: [['Mur', 0], ['Pyramide', 1], ['Damier', 2], ['Arche', 3], ['Losange', 4], ['Rayures', 5]]}, {k: 'v', o: [['Balle lente', 250], ['Balle normale', 320], ['Balle rapide', 400]]}, {k: 'p', o: [['Grande raquette', 90], ['Petite raquette', 60]]}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g, C = 8, R = 7, bw = 360 / C, bh = 20; let px = 180, ball = null, lives = 3, br = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const k = [true, c >= r / 2 && c < C - r / 2 && r < 4 ? true : r >= 4 ? false : false, (r + c) % 2 === 0, r < 2 || c === 0 || c === C - 1, Math.abs(c - 3.5) + Math.abs(r - 3) <= 3.5, r % 2 === 0][P.L]; if (k) br.push({x: c * bw, y: 60 + r * bh, hue: r * 40 + c * 6}); }
      const total = br.length, reset = () => { ball = {x: px, y: 480, vx: 0, vy: 0, held: true}; };
      reset(); const move = x.steer(cv, () => px, v => { px = Math.max(P.p / 2, Math.min(360 - P.p / 2, v)); }, 460);
      const launch = () => { if (ball.held) { ball.held = false; const a = x.rnd(-.6, .6); ball.vx = Math.sin(a) * P.v; ball.vy = -Math.cos(a) * P.v; } };
      x.on(cv.c, 'pointerup', launch); x.key(e => { if (e.code === 'Space') { e.preventDefault(); launch(); } });
      x.loop(dt => { move(dt); if (ball.held) { ball.x = px; ball.y = 490; } else { ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.x < 7 || ball.x > 353) { ball.vx *= -1; ball.x = Math.max(7, Math.min(353, ball.x)); } if (ball.y < 7) { ball.vy = Math.abs(ball.vy); }
          if (ball.vy > 0 && ball.y > 495 && ball.y < 512 && Math.abs(ball.x - px) < P.p / 2 + 7) { const k = (ball.x - px) / (P.p / 2), sp = Math.hypot(ball.vx, ball.vy) * 1.02; ball.vx = k * sp * .75; ball.vy = -Math.sqrt(Math.max(1, sp * sp - ball.vx * ball.vx)); x.beep(440); }
          for (let i = br.length - 1; i >= 0; i--) { const b = br[i]; if (ball.x > b.x && ball.x < b.x + bw && ball.y > b.y - 6 && ball.y < b.y + bh + 6) { br.splice(i, 1); ball.vy *= -1; x.beep(700); break; } }
          if (ball.y > 560) { lives--; x.beep(120, .3); if (lives <= 0) { const k = 1 - br.length / total; return x.end((total - br.length) * 10, st3(k, .4, .75, 1), Math.round(k * 100) + ' % des briques'); } reset(); }
          if (!br.length) return x.end(total * 10 + lives * 200, lives >= 2 ? 3 : 2, 'Toutes les briques détruites !'); }
        bg(cv, T); g.shadowBlur = 0; for (const b of br) { g.fillStyle = 'hsl(' + b.hue + ',85%,60%)'; g.fillRect(b.x + 2, b.y + 2, bw - 4, bh - 4); }
        glow(g, T.a, 14); g.fillStyle = T.a; g.fillRect(px - P.p / 2, 500, P.p, 10); glow(g, '#fff', 12); g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, 7, 0, 7); g.fill();
        if (ball.held) txt(g, 'Touche pour lancer', 180, 380, 15, '#a79fc4'); x.hud('❤️'.repeat(lives) + ' · 🧱 ' + br.length + ' restantes'); });
    }});

  def({id: 'ping', n: 'Ping néon', e: '🏓', cat: 'arc', d: 'Un duel de raquettes contre l\'ordinateur.', how: 'Déplace ta raquette (en bas) avec le doigt ou les flèches. Premier à 5 points.',
    axes: [{k: 'ai', o: [['Débutant', .45], ['Moyen', .65], ['Fort', .82], ['Champion', .95]]}, {k: 'v', o: [['Lent', 260], ['Normal', 330], ['Rapide', 410]]}, {k: 't', o: TH3}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let me = 180, ai = 180, b, s1 = 0, s2 = 0, pause = 1;
      const serve = dirDown => { b = {x: 180, y: 270, vx: x.rnd(-120, 120), vy: (dirDown ? 1 : -1) * P.v}; pause = .8; }; serve(true);
      const move = x.steer(cv, () => me, v => { me = Math.max(40, Math.min(320, v)); }, 480);
      x.loop(dt => { move(dt); if (pause > 0) pause -= dt; else { b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < 7 || b.x > 353) { b.vx *= -1; b.x = Math.max(7, Math.min(353, b.x)); }
          const tgt = b.vy < 0 ? b.x : 180; ai += Math.max(-P.v * P.ai * dt * 1.2, Math.min(P.v * P.ai * dt * 1.2, tgt - ai));
          const hit = (px, py, dirSign) => { if (Math.abs(b.y - py) < 10 && Math.abs(b.x - px) < 46 && Math.sign(b.vy) === dirSign) { b.vy = -b.vy * 1.04; b.vx = (b.x - px) * 6; x.beep(dirSign > 0 ? 520 : 380); } };
          hit(me, 500, 1); hit(ai, 40, -1);
          if (b.y > 560) { s2++; x.beep(140, .3); serve(false); } if (b.y < -20) { s1++; x.beep(900); serve(true); }
          if (s1 >= 5 || s2 >= 5) return x.end(s1 * 100 - s2 * 30, s1 >= 5 ? (s1 - s2 >= 3 ? 3 : 2) : s1 >= 2 ? 1 : 0, s1 >= 5 ? 'Victoire ' + s1 + ' – ' + s2 : 'Défaite ' + s1 + ' – ' + s2); }
        bg(cv, T); g.setLineDash([8, 10]); g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(0, 270); g.lineTo(360, 270); g.stroke(); g.setLineDash([]);
        glow(g, T.a, 14); g.fillStyle = T.a; g.fillRect(me - 40, 500, 80, 10); glow(g, T.c, 14); g.fillStyle = T.c; g.fillRect(ai - 40, 30, 80, 10); glow(g, '#fff', 10); g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, 7, 0, 7); g.fill();
        txt(g, s2, 30, 230, 30, 'rgba(255,255,255,.3)', 'left'); txt(g, s1, 30, 310, 30, 'rgba(255,255,255,.3)', 'left'); x.hud('🏓 ' + s1 + ' – ' + s2); });
    }});

  def({id: 'empileur', n: 'Empileur', e: '🏗️', cat: 'arc', d: 'Empile les blocs le plus haut possible.', how: 'Touche (ou Espace) pour lâcher le bloc. Ce qui dépasse tombe : vise juste !',
    axes: [{k: 'v', o: [['Lent', 140], ['Normal', 200], ['Rapide', 270], ['Fou', 350]]}, {k: 'w', o: [['Blocs larges', 160], ['Blocs étroits', 110]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let st = [{x: 180 - P.w / 2, w: P.w}], cur = {x: 0, w: P.w, dir: 1}, cam = 0;
      const drop = () => { const top = st[st.length - 1], l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w);
        if (r - l <= 2) { x.beep(110, .3); return x.end((st.length - 1) * 50, st3(st.length - 1, 8, 15, 25), pl(st.length - 1, 'étage{s}')); }
        const perfect = Math.abs(cur.x - top.x) < 4; st.push(perfect ? {x: top.x, w: top.w} : {x: l, w: r - l}); x.beep(perfect ? 1000 : 500 + st.length * 10); cur = {x: st.length % 2 ? 0 : 360 - st[st.length - 1].w, w: st[st.length - 1].w, dir: st.length % 2 ? 1 : -1}; };
      x.on(cv.c, 'pointerdown', drop); x.key(e => { if (e.code === 'Space') { e.preventDefault(); drop(); } });
      x.loop(dt => { cur.x += cur.dir * P.v * (1 + st.length * .02) * dt; if (cur.x < 0) { cur.x = 0; cur.dir = 1; } if (cur.x + cur.w > 360) { cur.x = 360 - cur.w; cur.dir = -1; }
        const want = Math.max(0, st.length * 24 - 300); cam += (want - cam) * Math.min(1, dt * 4);
        bg(cv, T); g.shadowBlur = 0; st.forEach((s, i) => { g.fillStyle = 'hsl(' + (i * 17 + 260) % 360 + ',80%,60%)'; g.fillRect(s.x, 500 - i * 24 + cam, s.w, 22); });
        glow(g, T.b, 14); g.fillStyle = T.b; g.fillRect(cur.x, 500 - st.length * 24 + cam, cur.w, 22); x.hud('🏗️ ' + pl(st.length - 1, 'étage{s}')); });
    }});

  def({id: 'sauts', n: 'Sauts', e: '🦘', cat: 'arc', d: 'Cours et saute par-dessus les obstacles.', how: 'Touche l\'écran ou Espace pour sauter. Double saut possible !',
    axes: [{k: 'v', o: [['Promenade', 200], ['Course', 260], ['Sprint', 330], ['Fusée', 410]]}, {k: 'gr', o: [['Gravité lunaire', .65], ['Gravité terrestre', 1]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(540, 300), g = cv.g; let y = 0, vy = 0, jumps = 0, obs = [], sp = 1, d = 0;
      const jump = () => { if (jumps < 2) { vy = 520 * Math.sqrt(P.gr) * (jumps ? .85 : 1); jumps++; x.beep(600 + jumps * 100, .06); } };
      x.on(cv.c, 'pointerdown', jump); x.key(e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } });
      x.loop(dt => { const v = P.v * (1 + d / 4000); d += v * dt; vy -= 1500 * P.gr * dt; y = Math.max(0, y + vy * dt); if (!y) { vy = 0; jumps = 0; }
        sp -= dt; if (sp <= 0) { sp = x.rnd(.8, 1.7) * 260 / v; const h = x.rnd(24, 52); obs.push({x: 560, w: x.rnd(18, 34), h}); }
        bg(cv, T); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 252, 540, 2);
        for (let i = obs.length - 1; i >= 0; i--) { const o = obs[i]; o.x -= v * dt; if (o.x < -40) { obs.splice(i, 1); continue; } glow(g, T.c, 12); g.fillStyle = T.c; g.fillRect(o.x, 252 - o.h, o.w, o.h);
          if (80 + 14 > o.x && 80 - 14 < o.x + o.w && 252 - y - 0 > 252 - o.h) { x.beep(110, .3); return x.end(d / 10, st3(d, 2000, 5000, 9000), Math.round(d / 10) + ' m parcourus'); } }
        glow(g, T.b, 16); g.fillStyle = T.b; g.fillRect(66, 224 - y, 28, 28); x.hud('🦘 ' + Math.round(d / 10) + ' m'); });
    }});

  def({id: 'defense', n: 'Défense spatiale', e: '🛸', cat: 'arc', d: 'Abats les envahisseurs avant qu\'ils n\'atteignent le sol.', how: 'Déplace ton canon (doigt ou flèches), il tire tout seul. 3 vies, 60 secondes.',
    axes: [{k: 'v', o: D4}, {k: 'f', o: [['Tir rapide', .18], ['Tir lent', .32]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let px = 180, sh = [], en = [], cd = 0, sp = 0, kills = 0, lives = 3, time = 60;
      const move = x.steer(cv, () => px, v => { px = Math.max(20, Math.min(340, v)); }, 420);
      x.loop(dt => { time -= dt; move(dt); cd -= dt; if (cd <= 0) { cd = P.f; sh.push({x: px, y: 488}); x.beep(1200, .02); }
        sp -= dt; if (sp <= 0) { sp = Math.max(.3, 1.3 - P.v * .2 - (60 - time) * .01); en.push({x: x.rnd(20, 340), y: -16, vx: x.rnd(-40, 40), v: 40 + P.v * 22 + (60 - time) * 1.2, e: x.pick(['👾', '🛸', '👽'])}); }
        bg(cv, T); glow(g, T.b, 8); g.fillStyle = T.b; for (let i = sh.length - 1; i >= 0; i--) { const s = sh[i]; s.y -= 520 * dt; if (s.y < -10) { sh.splice(i, 1); continue; } g.fillRect(s.x - 2, s.y - 8, 4, 12); }
        g.shadowBlur = 0; g.font = '26px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = en.length - 1; i >= 0; i--) { const e = en[i]; e.y += e.v * dt; e.x += e.vx * dt; if (e.x < 14 || e.x > 346) e.vx *= -1;
          const hit = sh.findIndex(s => Math.abs(s.x - e.x) < 16 && Math.abs(s.y - e.y) < 16); if (hit >= 0) { sh.splice(hit, 1); en.splice(i, 1); kills++; x.beep(300); continue; }
          if (e.y > 500) { en.splice(i, 1); lives--; x.beep(110, .3); continue; } g.fillText(e.e, e.x, e.y); }
        glow(g, T.a, 14); g.fillStyle = T.a; g.beginPath(); g.moveTo(px, 482); g.lineTo(px - 18, 512); g.lineTo(px + 18, 512); g.closePath(); g.fill();
        x.hud('❤️'.repeat(Math.max(0, lives)) + ' · 👾 ' + kills + ' · ⏱ ' + Math.ceil(time));
        if (lives <= 0 || time <= 0) x.end(kills * 20 + (time <= 0 ? lives * 100 : 0), st3(kills + (time <= 0 ? 5 : 0), 15, 30, 50), pl(kills, 'envahisseur{s} abattu{s}') + (time <= 0 ? ' · base défendue !' : '')); });
    }});

  /* ================= 🔤 MOTS & CALCUL ================= */
  def({id: 'calcul', n: 'Calcul éclair', e: '➗', cat: 'mot', d: 'Résous un maximum d\'opérations.', how: 'Choisis la bonne réponse parmi 4. Une erreur coûte du temps.',
    axes: [{k: 'op', o: [['Additions', '+'], ['Soustractions', '-'], ['Multiplications', '×'], ['Divisions', '÷'], ['Mélange', 'm']]}, {k: 'd', o: D4}, {k: 'm', o: [['60 secondes', 't'], ['20 questions', 'q']]}],
    play(x){
      const {P} = x, q = x.el('div', 'mj-card big'); x.stage.append(q); let ok = 0, n = 0, time = 60, t = 0, box = null, ans = 0;
      const mk = () => { const op = P.op === 'm' ? x.pick(['+', '-', '×', '÷']) : P.op, M = [10, 20, 50, 100][P.d - 1], m2 = [5, 10, 12, 20][P.d - 1]; let a, b;
        if (op === '+') { a = x.ri(1, M); b = x.ri(1, M); ans = a + b; } else if (op === '-') { a = x.ri(1, M); b = x.ri(1, M); if (b > a) [a, b] = [b, a]; ans = a - b; }
        else if (op === '×') { a = x.ri(2, m2); b = x.ri(2, m2); ans = a * b; } else { b = x.ri(2, m2); ans = x.ri(1, m2); a = b * ans; }
        q.textContent = a + ' ' + op + ' ' + b + ' = ?'; const opts = new Set([ans]); while (opts.size < 4) opts.add(Math.max(0, ans + x.ri(-Math.max(3, ans * .2 | 0), Math.max(3, ans * .2 | 0)))); const arr = x.shuf([...opts]);
        if (box) box.remove(); box = x.choices(arr.map(String), (i, el) => { n++; if (arr[i] === ans) { ok++; x.beep(800); } else { time -= 3; x.beep(140, .2); } if (P.m === 'q' && n >= 20) return finish(); mk(); }); x.stage.append(box); };
      const finish = () => x.end(ok * 50 + (P.m === 'q' ? Math.max(0, 600 - t * 5) : 0), P.m === 't' ? st3(ok, 10 + P.d, 18 + P.d * 2, 26 + P.d * 3) : st3(ok - (t > 90 ? 3 : 0), 12, 16, 19), pl(ok, 'bonne{s} réponse{s}') + (P.m === 'q' ? ' en ' + Math.round(t) + ' s' : ''));
      mk(); x.loop(dt => { t += dt; if (P.m === 't') { time -= dt; if (time <= 0) return finish(); } x.hud((P.m === 't' ? '⏱ ' + Math.ceil(time) + ' s' : '❔ ' + n + ' / 20') + ' · ✅ ' + ok); });
    }});

  def({id: 'anagrammes', n: 'Anagrammes', e: '🔀', cat: 'mot', d: 'Remets les lettres dans l\'ordre pour former un mot.', how: 'Touche les lettres dans l\'ordre pour écrire un vrai mot français. « Passer » coûte 5 secondes.',
    axes: [{k: 'L', o: [['5 lettres', 5], ['6 lettres', 6], ['7 lettres', 7]]}, {k: 'time', o: [['90 s', 90], ['60 s', 60], ['40 s', 40]]}, {k: 'h', o: [['Avec indice', 1], ['Sans indice', 0]]}],
    play(x){
      const {P} = x, out = x.el('div', 'mj-card big', '…'), hint = x.el('div', 'mj-q', 'Chargement du dictionnaire…'); x.stage.append(hint, out); let W = null, word = '', pick = [], box = null, found = 0, time = P.time, ready = false;
      const next = () => { word = x.pick(W.by(P.L)); let mix; do { mix = x.shuf(word.split('')); } while (mix.join('') === word); pick = []; out.textContent = '_ '.repeat(P.L).trim(); hint.textContent = P.h ? 'Indice : commence par « ' + word[0] + ' »' : 'Trouve le mot !';
        if (box) box.remove(); const bar = x.el('div', 'mj-row'); const skip = x.el('button', 'btn ghost sm', 'Passer (–5 s)'); skip.type = 'button'; const undo = x.el('button', 'btn ghost sm', '⌫ Effacer'); undo.type = 'button'; bar.append(undo, skip);
        box = x.choices(mix, (i, b) => { b.disabled = true; pick.push([i, b]); render(); if (pick.length === P.L) check(); }, 'letters'); box.append(bar); x.stage.append(box);
        x.on(skip, 'click', () => { time -= 5; x.beep(200); hint.textContent = 'C\'était ' + word; x.after(700, next); }); x.on(undo, 'click', () => { const l = pick.pop(); if (l) { l[1].disabled = false; render(); } }); };
      const render = () => { out.textContent = pick.map(p => p[1].textContent).join('') + ' _'.repeat(P.L - pick.length); };
      const check = () => { const w = pick.map(p => p[1].textContent).join(''); if (W.set.has(w) && w.split('').sort().join() === word.split('').sort().join()) { found++; x.beep(900); out.classList.add('okc'); x.after(450, () => { out.classList.remove('okc'); next(); }); } else { x.beep(140, .2); pick.forEach(p => { p[1].disabled = false; }); pick = []; x.after(200, render); } };
      words().then(w => { W = w; ready = true; next(); }).catch(() => x.end(0, 0, 'Dictionnaire indisponible.'));
      x.loop(dt => { if (!ready) return; time -= dt; x.hud('⏱ ' + Math.max(0, Math.ceil(time)) + ' s · 🔀 ' + found); if (time <= 0) x.end(found * P.L * 20, st3(found, 2, 4, 7), found + ' mot' + (found > 1 ? 's' : '') + ' trouvé' + (found > 1 ? 's' : '') + ' (dernier : ' + word + ')'); });
    }});

  def({id: 'frappe', n: 'Frappe rapide', e: '⌨️', cat: 'mot', d: 'Tape un maximum de mots sans faute.', how: 'Recopie le mot affiché puis valide (Entrée). Mesure tes mots par minute.',
    axes: [{k: 'L', o: [['Mots de 5 lettres', 5], ['Mots de 6 lettres', 6], ['Mots de 7 lettres', 7]]}, {k: 'time', o: [['30 s', 30], ['60 s', 60], ['90 s', 90]]}, {k: 'c', o: [['Minuscules', 0], ['Majuscules', 1]]}],
    play(x){
      const {P} = x, w = x.el('div', 'mj-card big', '…'), inp = x.el('input', 'mj-inp'); inp.autocomplete = 'off'; inp.autocapitalize = 'off'; inp.spellcheck = false; inp.enterKeyHint = 'next'; inp.placeholder = 'Tape le mot ici';
      x.stage.append(w, inp); let W = null, cur = '', ok = 0, time = P.time, started = false;
      const fmt = s => P.c ? s : s.toLowerCase(); const next = () => { cur = x.pick(W.by(P.L)); w.textContent = fmt(cur); inp.value = ''; };
      x.on(inp, 'input', () => { started = true; const v = inp.value.trim().toUpperCase(); inp.classList.toggle('bad', !cur.startsWith(v)); if (v === cur) { ok++; x.beep(800); next(); } });
      x.on(inp, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (inp.value.trim().toUpperCase() !== cur) { x.beep(140, .2); inp.classList.add('bad'); } } });
      words().then(r => { W = r; next(); inp.focus(); }).catch(() => x.end(0, 0, 'Dictionnaire indisponible.'));
      x.loop(dt => { if (!W) return; if (started) time -= dt; const wpm = Math.round(ok / Math.max(1, P.time - time) * 60); x.hud('⏱ ' + Math.ceil(time) + ' s · ⌨️ ' + ok + (started ? ' · ' + wpm + ' mots/min' : ' · commence à taper'));
        if (time <= 0) x.end(ok * P.L * 10, st3(ok / P.time * 60, 12, 20, 30), pl(ok, 'mot{s}') + ' · ' + Math.round(ok / P.time * 60) + ' mots/min'); });
    }});

  def({id: 'stroop', n: 'Couleurs piégées', e: '🎨', cat: 'mot', d: 'Le mot dit une couleur, l\'encre en montre une autre.', how: 'Selon le mode, choisis le SENS du mot ou la COULEUR de l\'encre. Ne te laisse pas piéger !',
    axes: [{k: 'd', o: D4}, {k: 'm', o: [['Sens du mot', 'w'], ['Couleur de l\'encre', 'c']]}, {k: 'time', o: [['30 s', 30], ['45 s', 45], ['60 s', 60]]}],
    play(x){
      const {P} = x, C = [['ROUGE', '#ff4d6d'], ['BLEU', '#38a9ff'], ['VERT', '#2fe08c'], ['JAUNE', '#ffd166'], ['VIOLET', '#b86bff'], ['ORANGE', '#ff9f1c']].slice(0, 3 + Math.min(3, P.d));
      const rule = x.el('div', 'mj-q', P.m === 'w' ? 'Choisis le <b>SENS</b> du mot' : 'Choisis la <b>COULEUR DE L\'ENCRE</b>'), w = x.el('div', 'mj-card big'); let ok = 0, ko = 0, time = P.time, want = 0, box = null;
      x.stage.append(rule, w);
      const next = () => { const a = x.ri(0, C.length - 1); let b = x.ri(0, C.length - 1); if (Math.random() < .8) while (b === a) b = x.ri(0, C.length - 1); w.textContent = C[a][0]; w.style.color = C[b][1]; want = P.m === 'w' ? a : b;
        if (box) box.remove(); const order = x.shuf([...C.keys()]); box = x.choices(order.map(i => '<span style="color:' + (P.d >= 3 ? C[x.ri(0, C.length - 1)][1] : '#fff') + '">' + C[i][0] + '</span>'), j => { if (order[j] === want) { ok++; x.beep(800); } else { ko++; time -= 2; x.beep(140, .2); } next(); }); x.stage.append(box); };
      next(); x.loop(dt => { time -= dt; x.hud('⏱ ' + Math.max(0, Math.ceil(time)) + ' s · ✅ ' + ok + ' · ❌ ' + ko); if (time <= 0) x.end(Math.max(0, ok * 20 - ko * 10), st3((ok - ko) / P.time * 30, 8, 14, 20), pl(ok, 'juste{s}') + ', ' + pl(ko, 'erreur{s}')); });
    }});

  /* ================= v5.2 : 12 nouveaux jeux ================= */
  const COLS = ['#ff4d6d', '#ffd166', '#3dffa2', '#38a9ff', '#b86bff', '#ff9f1c', '#ffffff', '#ff8ad8'], COLN = ['rouge', 'jaune', 'vert', 'bleu', 'violet', 'orange', 'blanc', 'rose'];
  const swatch = (c, s) => '<span class="pg" style="background:' + (c === null ? 'transparent' : COLS[c]) + (s ? ';width:' + s + 'px;height:' + s + 'px' : '') + '"></span>';

  def({id: 'inondation', n: 'Inondation', e: '🌊', cat: 'log', d: 'Envahis toute la grille d\'une seule couleur.', how: 'Choisis une couleur (bouton ou case) : la zone en haut à gauche la prend et absorbe les cases voisines identiques. Remplis tout avant la fin des coups.',
    axes: [{k: 'n', o: [['10×10', 10], ['14×14', 14], ['18×18', 18]]}, {k: 'c', o: [['4 couleurs', 4], ['5 couleurs', 5], ['6 couleurs', 6]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, N = P.n, cv = x.canvas(360, 360), g = cv.g, cs = 360 / N, lim = Math.round(N * P.c / 3.1) + 1; let b = [...Array(N * N)].map(() => x.ri(0, P.c - 1)), moves = 0;
      const region = () => { const col = b[0], seen = new Set([0]), st = [0]; while (st.length) { const i = st.pop(), r = i / N | 0, c = i % N; for (const [a, d] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) { if (a < 0 || d < 0 || a >= N || d >= N) continue; const j = a * N + d; if (!seen.has(j) && b[j] === col) { seen.add(j); st.push(j); } } } return seen; };
      const draw = () => { b.forEach((v, i) => { g.fillStyle = COLS[v]; g.fillRect((i % N) * cs, (i / N | 0) * cs, cs + .6, cs + .6); }); x.hud('🌊 ' + moves + ' / ' + lim + ' coups · ' + Math.round(region().size / (N * N) * 100) + ' %'); };
      const pick = k => { if (x.dead || k === b[0]) return; region().forEach(i => { b[i] = k; }); moves++; x.beep(300 + k * 80); draw(); const n = region().size;
        if (n === N * N) return x.end(Math.max(50, (lim - moves + 1) * 100), moves <= lim - 4 ? 3 : moves <= lim - 2 ? 2 : 1, 'Grille remplie en ' + pl(moves, 'coup{s}'));
        if (moves >= lim) x.end(Math.round(n / (N * N) * 500), 0, 'Plus de coups : ' + Math.round(n / (N * N) * 100) + ' % rempli'); };
      x.on(cv.c, 'click', e => { const p = cv.pos(e), i = Math.floor(p.y / cs) * N + Math.floor(p.x / cs); if (b[i] !== undefined) pick(b[i]); });
      x.stage.append(x.choices([...Array(P.c).keys()].map(k => swatch(k)), pick, 'colors')); draw();
    }});

  def({id: 'code', n: 'Code secret', e: '🔐', cat: 'log', d: 'Devine la combinaison de couleurs cachée.', how: 'Compose une combinaison puis valide. ● = bonne couleur bien placée, ○ = bonne couleur mal placée. 10 essais.',
    axes: [{k: 'L', o: [['4 pions', 4], ['5 pions', 5]]}, {k: 'c', o: [['6 couleurs', 6], ['8 couleurs', 8]]}, {k: 'r', o: [['Sans répétition', 0], ['Avec répétitions', 1]]}, {k: 't', o: TH3}],
    play(x){
      const {P} = x; let secret = []; if (P.r) for (let i = 0; i < P.L; i++) secret.push(x.ri(0, P.c - 1)); else secret = x.shuf([...Array(P.c).keys()]).slice(0, P.L);
      const hist = x.el('div', 'mj-hist'), cur = x.el('div', 'mj-cur'); let guess = [], tries = 0; x.stage.append(hist, cur);
      const drawCur = () => { cur.innerHTML = [...Array(P.L)].map((_, i) => swatch(guess[i] === undefined ? null : guess[i])).join(''); };
      const submit = () => { tries++; let black = 0, white = 0; const sc = [], gc = []; guess.forEach((v, i) => { if (v === secret[i]) black++; else { sc.push(secret[i]); gc.push(v); } }); gc.forEach(v => { const k = sc.indexOf(v); if (k >= 0) { white++; sc.splice(k, 1); } });
        hist.prepend(x.el('div', 'mj-hrow', guess.map(v => swatch(v, 20)).join('') + '<b>' + ('●'.repeat(black) + '○'.repeat(white) || '–') + '</b>')); guess = []; x.beep(black === P.L ? 900 : 400 + black * 80); x.hud('🔐 Essai ' + Math.min(10, tries + 1) + ' / 10');
        if (black === P.L) return x.end((11 - tries) * 100, tries <= 5 ? 3 : tries <= 7 ? 2 : 1, 'Code trouvé en ' + pl(tries, 'essai{s}'));
        if (tries >= 10) x.end(0, 0, 'Perdu ! Le code était : ' + secret.map(c => COLN[c]).join(', ')); };
      x.stage.append(x.choices([...Array(P.c).keys()].map(k => swatch(k)).concat(['⌫', 'OK']), i => { if (i < P.c) { if (guess.length < P.L && (P.r || !guess.includes(i))) { guess.push(i); x.beep(500); } } else if (i === P.c) guess.pop(); else if (guess.length === P.L) submit(); drawCur(); }, 'code'));
      drawCur(); x.hud('🔐 Essai 1 / 10');
    }});

  def({id: 'hanoi', n: 'Tours de Hanoï', e: '🗼', cat: 'log', d: 'Déplace toute la pile sur la tour de droite.', how: 'Touche une tour pour prendre son disque du haut, puis une autre pour le poser. Jamais un grand disque sur un plus petit.',
    axes: [{k: 'n', o: [['3 disques', 3], ['4 disques', 4], ['5 disques', 5], ['6 disques', 6], ['7 disques', 7]]}, {k: 'm', o: [['Libre', 'l'], ['Chrono', 'c']]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 300), g = cv.g, opt = 2 ** P.n - 1, h = Math.min(22, 160 / P.n); let tw = [[...Array(P.n)].map((_, i) => P.n - i), [], []], sel = -1, moves = 0, t = 0;
      const draw = () => { bg(cv, T); for (let k = 0; k < 3; k++) { const cx = 60 + k * 120; g.shadowBlur = 0; g.fillStyle = k === sel ? T.b : 'rgba(255,255,255,.35)'; g.fillRect(cx - 4, 80, 8, 190); g.fillRect(cx - 56, 268, 112, 8);
        tw[k].forEach((d, j) => { const w = 22 + d * (88 / P.n), col = 'hsl(' + (d * 47) % 360 + ',85%,60%)'; glow(g, col, 8); g.fillStyle = col; g.fillRect(cx - w / 2, 268 - (j + 1) * h - (k === sel && j === tw[k].length - 1 ? 14 : 0), w, h - 2); }); } };
      x.on(cv.c, 'pointerdown', e => { if (x.dead) return; const k = Math.max(0, Math.min(2, Math.floor(cv.pos(e).x / 120)));
        if (sel < 0) { if (tw[k].length) { sel = k; x.beep(500); } } else { if (k !== sel) { const d = tw[sel][tw[sel].length - 1], top = tw[k][tw[k].length - 1]; if (!top || top > d) { tw[k].push(tw[sel].pop()); moves++; x.beep(650); } else x.beep(150, .2); } sel = -1; }
        draw(); if (tw[2].length === P.n) x.end(Math.max(50, (opt * 2 - moves) * 20 + P.n * 100), moves <= opt ? 3 : moves <= opt * 1.5 ? 2 : 1, 'Terminé en ' + pl(moves, 'coup{s}') + ' (minimum ' + opt + ')'); });
      x.loop(dt => { t += dt; if (P.m === 'c') { const left = opt * 2.2 + 10 - t; if (left <= 0) return x.end(tw[2].length * 50, 0, 'Temps écoulé'); x.hud('🗼 ' + pl(moves, 'coup{s}') + ' · ⏱ ' + Math.ceil(left) + ' s'); } else x.hud('🗼 ' + pl(moves, 'coup{s}') + ' · minimum ' + opt); });
      draw();
    }});

  def({id: 'pixel', n: 'Pixel mystère', e: '🖼️', cat: 'log', d: 'Noircis les bonnes cases grâce aux indices chiffrés.', how: 'Les nombres donnent les blocs de cases pleines de chaque ligne et colonne, dans l\'ordre. Touche ✕ (en haut à gauche) pour marquer les cases vides.',
    axes: [{k: 'n', o: [['5×5', 5], ['7×7', 7], ['10×10', 10]]}, {k: 'p', o: [['Aéré', .45], ['Normal', .55], ['Dense', .65]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, N = P.n, sol = [...Array(N * N)].map(() => Math.random() < P.p);
      const clue = arr => { const o = []; let r = 0; arr.forEach(v => { if (v) r++; else if (r) { o.push(r); r = 0; } }); if (r) o.push(r); return o.length ? o : [0]; };
      const rowC = [...Array(N)].map((_, r) => clue(sol.slice(r * N, r * N + N))), colC = [...Array(N)].map((_, c) => clue([...Array(N)].map((_, r) => sol[r * N + c])));
      const G = x.grid(N + 1, N + 1, 'pix'); let fill = Array(N * N).fill(0), mark = false; const t0 = performance.now();
      G.cells.forEach((c, i) => { const r = i / (N + 1) | 0, k = i % (N + 1); if (!r && !k) { c.textContent = '✕'; c.classList.add('mode'); } else if (!r) { c.innerHTML = colC[k - 1].join('<br>'); c.classList.add('clue', 'cc'); } else if (!k) { c.textContent = rowC[r - 1].join(' '); c.classList.add('clue', 'rc'); } });
      const ok = () => { for (let r = 0; r < N; r++) if (clue(fill.slice(r * N, r * N + N).map(v => v === 1)).join() !== rowC[r].join()) return false; for (let c = 0; c < N; c++) if (clue([...Array(N)].map((_, r) => fill[r * N + c] === 1)).join() !== colC[c].join()) return false; return true; };
      x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c || x.dead) return; if (c.classList.contains('mode')) { mark = !mark; c.classList.toggle('on', mark); return; }
        const i = +c.dataset.i, r = i / (N + 1) | 0, k = i % (N + 1); if (!r || !k) return; const j = (r - 1) * N + (k - 1);
        fill[j] = mark ? (fill[j] === 2 ? 0 : 2) : (fill[j] === 1 ? 0 : 1); c.classList.toggle('f', fill[j] === 1); c.classList.toggle('x', fill[j] === 2); c.textContent = fill[j] === 2 ? '✕' : ''; x.beep(fill[j] === 1 ? 520 : 300);
        if (ok()) { const s = (performance.now() - t0) / 1000; x.end(Math.max(100, N * N * 20 - s * 3), s < N * N * 1.2 ? 3 : s < N * N * 2.5 ? 2 : 1, 'Image trouvée en ' + Math.round(s) + ' s'); } });
      x.hud('🖼️ ' + N + '×' + N);
    }});

  def({id: 'bulles', n: 'Grappes', e: '🫧', cat: 'log', d: 'Éclate les groupes de bulles de même couleur.', how: 'Touche un groupe d\'au moins 2 bulles identiques pour l\'éclater. Plus le groupe est gros, plus il rapporte. Vide la grille !',
    axes: [{k: 's', o: [['8×10', [8, 10]], ['10×12', [10, 12]]]}, {k: 'c', o: [['3 couleurs', 3], ['4 couleurs', 4], ['5 couleurs', 5]]}, {k: 't', o: TH}],
    play(x){
      const {P} = x, [Cc, Rr] = P.s, G = x.grid(Cc, Rr, 'bub'); let b = [...Array(Cc * Rr)].map(() => x.ri(0, P.c - 1)), sc = 0;
      const at = (r, c) => r >= 0 && c >= 0 && r < Rr && c < Cc ? b[r * Cc + c] : -2;
      const group = i => { const col = b[i]; if (col < 0) return []; const seen = new Set([i]), st = [i]; while (st.length) { const j = st.pop(), r = j / Cc | 0, c = j % Cc; for (const [a, d] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (at(a, d) === col) { const k = a * Cc + d; if (!seen.has(k)) { seen.add(k); st.push(k); } } } return [...seen]; };
      const gravity = () => { for (let c = 0; c < Cc; c++) { const v = []; for (let r = Rr - 1; r >= 0; r--) if (b[r * Cc + c] >= 0) v.push(b[r * Cc + c]); for (let r = Rr - 1, k = 0; r >= 0; r--, k++) b[r * Cc + c] = k < v.length ? v[k] : -1; }
        const keep = [...Array(Cc).keys()].filter(c => b[(Rr - 1) * Cc + c] >= 0), nb = Array(Cc * Rr).fill(-1); keep.forEach((c, k) => { for (let r = 0; r < Rr; r++) nb[r * Cc + k] = b[r * Cc + c]; }); b = nb; };
      const any = () => b.some((v, i) => v >= 0 && group(i).length > 1);
      const draw = () => G.cells.forEach((c, i) => { c.style.background = b[i] >= 0 ? COLS[b[i]] : 'transparent'; c.style.borderColor = b[i] >= 0 ? 'rgba(255,255,255,.3)' : 'transparent'; });
      x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c || x.dead) return; const gr = group(+c.dataset.i); if (gr.length < 2) { x.beep(150, .1); return; }
        gr.forEach(i => { b[i] = -1; }); sc += (gr.length - 1) ** 2; x.beep(300 + gr.length * 30); gravity(); draw(); const left = b.filter(v => v >= 0).length; x.hud('🫧 ' + sc + ' pts · ' + pl(left, 'bulle{s}'));
        if (!any()) x.after(300, () => x.end(sc + (left ? 0 : 1000), !left ? 3 : left <= Cc * Rr * .08 ? 2 : left <= Cc * Rr * .2 ? 1 : 0, left ? pl(left, 'bulle{s} restante{s}') : 'Grille vidée !')); });
      draw(); x.hud('🫧 0 pt');
    }});

  def({id: 'meles', n: 'Mots mêlés', e: '🔎', cat: 'mot', d: 'Retrouve les mots cachés dans la grille.', how: 'Touche la première lettre d\'un mot, puis sa dernière lettre. Les mots de la liste sont cachés en ligne droite.',
    axes: [{k: 'n', o: [['8×8', 8], ['10×10', 10], ['12×12', 12]]}, {k: 'w', o: [['4 mots', 4], ['6 mots', 6], ['8 mots', 8]]}, {k: 'd', o: [['Droit (→ ↓)', 's'], ['Toutes directions', 'a']]}],
    play(x){
      const {P} = x, N = P.n, q = x.el('div', 'mj-q', 'Chargement du dictionnaire…'); x.stage.append(q);
      words().then(W => { if (x.dead) return;
        const D = P.d === 's' ? [[0, 1], [1, 0]] : [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]], grid = Array(N * N).fill(''), placed = [];
        for (const w of x.shuf(W.all.filter(w => w.length <= N).slice(0, 4000))) { if (placed.length >= P.w) break; for (let tr = 0; tr < 40; tr++) { const [dr, dc] = x.pick(D), r0 = x.ri(0, N - 1), c0 = x.ri(0, N - 1), re = r0 + dr * (w.length - 1), ce = c0 + dc * (w.length - 1); if (re < 0 || ce < 0 || re >= N || ce >= N) continue;
            let fit = true; for (let k = 0; k < w.length; k++) { const ch = grid[(r0 + dr * k) * N + c0 + dc * k]; if (ch && ch !== w[k]) { fit = false; break; } } if (!fit) continue;
            const cells = []; for (let k = 0; k < w.length; k++) { const i = (r0 + dr * k) * N + c0 + dc * k; grid[i] = w[k]; cells.push(i); } placed.push({w, cells, found: false}); break; } }
        const AB = 'AAEEEIILNNORRSSTTUBCDGMP'; for (let i = 0; i < N * N; i++) if (!grid[i]) grid[i] = AB[Math.random() * AB.length | 0];
        const list = x.el('div', 'mj-words'), drawList = () => { list.innerHTML = placed.map(p => '<span class="' + (p.found ? 'ok' : '') + '">' + p.w + '</span>').join(''); }; q.remove(); x.stage.append(list); drawList();
        const G = x.grid(N, N, 'meles'); G.cells.forEach((c, i) => { c.textContent = grid[i]; }); let first = null, found = 0; const t0 = performance.now();
        x.on(G.el, 'click', e => { const c = e.target.closest('.mj-cell'); if (!c || x.dead) return; const i = +c.dataset.i; if (first === null) { first = i; c.classList.add('sel'); x.beep(500, .04); return; }
          G.cells[first].classList.remove('sel'); const a = first; first = null; const p = placed.find(p => !p.found && ((p.cells[0] === a && p.cells[p.cells.length - 1] === i) || (p.cells[0] === i && p.cells[p.cells.length - 1] === a)));
          if (!p) { x.beep(150, .2); return; } p.found = true; found++; p.cells.forEach(k => G.cells[k].classList.add('ok')); x.beep(880); drawList(); x.hud('🔎 ' + found + ' / ' + placed.length);
          if (found === placed.length) { const s = (performance.now() - t0) / 1000; x.end(Math.max(100, placed.length * 200 - s * 2), s < placed.length * 12 ? 3 : s < placed.length * 25 ? 2 : 1, pl(found, 'mot{s} trouvé{s}') + ' en ' + Math.round(s) + ' s'); } });
        x.hud('🔎 0 / ' + placed.length); }).catch(() => x.end(0, 0, 'Dictionnaire indisponible.'));
    }});

  def({id: 'pendu', n: 'Le pendu', e: '🪢', cat: 'mot', d: 'Trouve le mot lettre par lettre.', how: 'Propose des lettres (boutons ou clavier). Chaque erreur coûte une vie. Trouve le mot avant de toutes les perdre.',
    axes: [{k: 'L', o: [['5 lettres', 5], ['6 lettres', 6], ['7 lettres', 7]]}, {k: 'v', o: [['8 vies', 8], ['6 vies', 6], ['4 vies', 4]]}, {k: 'h', o: [['Première lettre donnée', 1], ['Sans indice', 0]]}],
    play(x){
      const {P} = x, w = x.el('div', 'mj-card big', '…'), life = x.el('div', 'mj-q', ''); x.stage.append(life, w);
      words().then(W => { if (x.dead) return; const word = x.pick(W.by(P.L)), got = new Set(), AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); let lives = P.v;
        const draw = () => { w.textContent = word.split('').map(c => got.has(c) ? c : '_').join(' '); life.textContent = '❤️'.repeat(lives) + '🖤'.repeat(P.v - lives); x.hud('🪢 ' + pl(lives, 'vie{s}')); };
        const kb = x.choices(AB, (i, b) => { if (x.dead) return; const L = AB[i]; b.disabled = true; if (word.includes(L)) { got.add(L); b.classList.add('ok'); x.beep(800); } else { lives--; b.classList.add('ko'); x.beep(150, .2); } draw();
          if (word.split('').every(c => got.has(c))) return x.end(lives * 100 + P.L * 30, lives >= P.v * .6 ? 3 : lives >= P.v * .3 ? 2 : 1, 'Trouvé : ' + word); if (lives <= 0) x.end(0, 0, 'Perdu ! Le mot était ' + word); }, 'kb');
        x.stage.append(kb); if (P.h) { got.add(word[0]); const b = kb.children[AB.indexOf(word[0])]; b.disabled = true; b.classList.add('ok'); }
        x.key(e => { const i = AB.indexOf((e.key || '').toUpperCase()); if (i >= 0 && !kb.children[i].disabled) kb.children[i].click(); }); draw(); }).catch(() => x.end(0, 0, 'Dictionnaire indisponible.'));
    }});

  def({id: 'rythme', n: 'Rythme néon', e: '🥁', cat: 'ref', d: 'Touche les notes pile au bon moment.', how: 'Touche la colonne (ou D F J K L) quand une note passe sur la ligne lumineuse. 40 notes.',
    axes: [{k: 'n', o: [['3 colonnes', 3], ['4 colonnes', 4], ['5 colonnes', 5]]}, {k: 'v', o: [['Lent', 200], ['Normal', 280], ['Rapide', 360], ['Fou', 450]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g, W = 360 / P.n, LY = 470, total = 40; let notes = [], sp = .6, spawned = 0, hit = 0, combo = 0, best = 0, sc = 0, msg = '', mt = 0; const fl = Array(P.n).fill(0);
      const press = k => { fl[k] = .15; let bi = -1, bd = 1e9; notes.forEach((n, i) => { if (n.l === k) { const d = Math.abs(n.y - LY); if (d < bd) { bd = d; bi = i; } } });
        if (bi >= 0 && bd < 44) { notes.splice(bi, 1); hit++; combo++; best = Math.max(best, combo); sc += (bd < 14 ? 100 : bd < 28 ? 70 : 40) + combo * 2; msg = bd < 14 ? 'PARFAIT' : bd < 28 ? 'BIEN' : 'OK'; mt = .45; x.beep(400 + k * 120, .06); } else { combo = 0; x.beep(140, .06); } };
      x.on(cv.c, 'pointerdown', e => press(Math.max(0, Math.min(P.n - 1, Math.floor(cv.pos(e).x / W)))));
      x.key(e => { const i = 'DFJKL'.slice(0, P.n).indexOf((e.key || '').toUpperCase()), j = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code), k = i >= 0 ? i : j; if (k >= 0 && k < P.n) { e.preventDefault(); press(k); } });
      x.loop(dt => { sp -= dt; if (sp <= 0 && spawned < total) { sp = Math.max(.24, .8 - P.v / 900) * x.rnd(.6, 1.4); notes.push({l: x.ri(0, P.n - 1), y: -20}); spawned++; }
        bg(cv, T); for (let k = 0; k < P.n; k++) { g.shadowBlur = 0; g.fillStyle = fl[k] > 0 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.03)'; g.fillRect(k * W + 2, 0, W - 4, 540); fl[k] -= dt; txt(g, 'DFJKL'[k], k * W + W / 2, 510, 14, 'rgba(255,255,255,.35)'); }
        glow(g, T.b, 14); g.fillStyle = T.b; g.fillRect(0, LY - 2, 360, 4);
        for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i]; n.y += P.v * dt; if (n.y > LY + 46) { notes.splice(i, 1); combo = 0; continue; } glow(g, T.a, 14); g.fillStyle = T.a; g.fillRect(n.l * W + 8, n.y - 10, W - 16, 20); }
        if (mt > 0) { mt -= dt; txt(g, msg, 180, 400, 24, T.c); } if (combo > 2) txt(g, '×' + combo, 180, 60, 22, '#fff');
        x.hud('🥁 ' + hit + ' / ' + total + ' · combo ' + combo);
        if (spawned >= total && !notes.length) x.end(sc, st3(hit / total, .5, .75, .92), hit + ' notes réussies sur ' + total + ' · combo max ' + best); });
    }});

  def({id: 'chaine', n: 'Réaction en chaîne', e: '💥', cat: 'ref', d: 'Une seule explosion pour en déclencher un maximum.', how: 'Touche l\'écran une seule fois par niveau : ton explosion fait éclater les bulles qu\'elle touche, qui explosent à leur tour. Atteins l\'objectif pour passer au niveau suivant.',
    axes: [{k: 'n', o: [['Peu de bulles', .7], ['Normal', 1], ['Plein de bulles', 1.4]]}, {k: 'g', o: [['Objectif facile', .75], ['Objectif moyen', 1], ['Objectif dur', 1.25]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g; let lvl = 1, balls = [], booms = [], used = false, popped = 0, goal = 0, sc = 0, wait = 0;
      const setup = () => { const total = Math.round((10 + lvl * 5) * P.n); goal = Math.min(total - 1, Math.round(total * Math.min(.9, (.15 + lvl * .08) * P.g))); balls = [...Array(total)].map(() => ({x: x.rnd(15, 345), y: x.rnd(15, 525), vx: x.rnd(-70, 70), vy: x.rnd(-70, 70), h: x.ri(0, 359), alive: true})); booms = []; used = false; popped = 0; wait = 0; };
      setup(); x.on(cv.c, 'pointerdown', e => { if (used || x.dead) return; used = true; const p = cv.pos(e); booms.push({x: p.x, y: p.y, r: 0, t: 0}); x.beep(300, .2); });
      x.loop(dt => { bg(cv, T); g.shadowBlur = 0; for (const b of balls) { if (!b.alive) continue; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < 8 || b.x > 352) b.vx *= -1; if (b.y < 8 || b.y > 532) b.vy *= -1; g.fillStyle = 'hsl(' + b.h + ',85%,62%)'; g.beginPath(); g.arc(b.x, b.y, 8, 0, 7); g.fill(); }
        for (let i = booms.length - 1; i >= 0; i--) { const B = booms[i]; B.t += dt; B.r = B.t < .9 ? Math.min(38, B.r + dt * 120) : B.r - dt * 90; if (B.r <= 0) { booms.splice(i, 1); continue; } g.fillStyle = 'rgba(255,255,255,.18)'; g.strokeStyle = T.b; g.lineWidth = 2; g.beginPath(); g.arc(B.x, B.y, B.r, 0, 7); g.fill(); g.stroke();
          for (const b of balls) if (b.alive && Math.hypot(b.x - B.x, b.y - B.y) < B.r + 8) { b.alive = false; popped++; sc += 10 * lvl; booms.push({x: b.x, y: b.y, r: 0, t: 0}); x.beep(400 + Math.min(popped, 60) * 15, .04); } }
        if (!used) txt(g, 'Touche pour exploser !', 180, 30, 15, '#fff'); x.hud('💥 Niveau ' + lvl + ' · ' + popped + ' / ' + goal);
        if (used && !booms.length && (wait += dt) > .3) { if (popped >= goal) { lvl++; x.beep(900); setup(); } else x.end(sc, st3(lvl - 1, 2, 4, 6), 'Niveau ' + lvl + ' : ' + popped + ' sur ' + goal + ' nécessaires'); } });
    }});

  def({id: 'traversee', n: 'Traversée', e: '🐸', cat: 'arc', d: 'Traverse les voies sans te faire percuter.', how: 'Glisse ou utilise les flèches pour avancer case par case. Atteins le haut pour marquer. 3 vies, 60 secondes.',
    axes: [{k: 'v', o: D4}, {k: 'n', o: [['Circulation fluide', .7], ['Embouteillage', 1.15]]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g, C = 12, cs = 30, ROWS = 18;
      const lanes = [...Array(ROWS)].map((_, r) => { if (r === 0 || r === ROWS - 1 || r === 9) return null; const cars = [], n = Math.max(1, Math.round(x.rnd(1.5, 3) * P.n)); for (let i = 0; i < n; i++) cars.push({x: x.rnd(0, 360), w: cs * x.ri(1, 3)}); return {dir: r % 2 ? 1 : -1, sp: (40 + P.v * 22) * x.rnd(.7, 1.4), cars, hue: x.ri(0, 359)}; });
      let px = 6, py = ROWS - 1, lives = 3, sc = 0, time = 60, inv = 0;
      x.swipe(k => { if (x.dead) return; const d = {l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1]}[k]; px = Math.max(0, Math.min(C - 1, px + d[0])); py = Math.max(0, Math.min(ROWS - 1, py + d[1])); x.beep(500, .03); if (py === 0) { sc++; x.beep(900); py = ROWS - 1; } });
      x.loop(dt => { time -= dt; inv -= dt; bg(cv, T);
        for (let r = 0; r < ROWS; r++) { const L = lanes[r]; g.shadowBlur = 0; g.fillStyle = L ? 'rgba(0,0,0,.35)' : 'rgba(61,255,162,.14)'; g.fillRect(0, r * cs, 360, cs); if (!L) continue;
          for (const c of L.cars) { c.x += L.dir * L.sp * dt; if (c.x > 400) c.x = -c.w - 20; if (c.x < -c.w - 40) c.x = 380; g.fillStyle = 'hsl(' + L.hue + ',80%,60%)'; g.fillRect(c.x, r * cs + 5, c.w, cs - 10);
            if (inv <= 0 && r === py && px * cs + cs * .8 > c.x && px * cs + cs * .2 < c.x + c.w) { lives--; inv = 1; x.beep(120, .3); px = 6; py = ROWS - 1; } } }
        glow(g, T.b, 14); g.fillStyle = inv > 0 && Math.floor(inv * 10) % 2 ? 'rgba(255,255,255,.3)' : T.b; g.beginPath(); g.arc(px * cs + cs / 2, py * cs + cs / 2, cs * .38, 0, 7); g.fill();
        x.hud('🐸 ' + sc + ' · ' + '❤️'.repeat(Math.max(0, lives)) + ' · ⏱ ' + Math.max(0, Math.ceil(time)));
        if (lives <= 0 || time <= 0) x.end(sc * 100, st3(sc, 2, 5, 9), pl(sc, 'traversée{s} réussie{s}')); });
    }});

  def({id: 'autoroute', n: 'Autoroute', e: '🚗', cat: 'arc', d: 'Change de voie pour éviter les voitures.', how: 'Touche à gauche ou à droite de ta voiture (ou flèches) pour changer de voie. Tiens le plus longtemps possible.',
    axes: [{k: 'n', o: [['3 voies', 3], ['4 voies', 4], ['5 voies', 5]]}, {k: 'v', o: D4}, {k: 't', o: TH3}],
    play(x){
      const {P, T} = x, cv = x.canvas(360, 540), g = cv.g, LW = 360 / P.n; let lane = P.n >> 1, cx = lane * LW + LW / 2, cars = [], sp = 1, d = 0, off = 0;
      const shift = s => { lane = Math.max(0, Math.min(P.n - 1, lane + s)); x.beep(500, .03); };
      x.on(cv.c, 'pointerdown', e => shift(cv.pos(e).x < cx ? -1 : 1)); x.key(e => { if (/ArrowLeft|KeyA|KeyQ/.test(e.code)) { e.preventDefault(); shift(-1); } if (/ArrowRight|KeyD/.test(e.code)) { e.preventDefault(); shift(1); } });
      x.loop(dt => { const v = (220 + P.v * 70) * (1 + d / 6000); d += v * dt; off = (off + v * dt) % 60; cx += (lane * LW + LW / 2 - cx) * Math.min(1, dt * 14);
        sp -= dt; if (sp <= 0) { sp = Math.max(.35, 1.1 - P.v * .15 - d / 20000); const k = Math.random() < .35 && P.n > 3 ? 2 : 1; x.shuf([...Array(P.n).keys()]).slice(0, k).forEach(l => cars.push({l, y: -60, hue: x.ri(0, 359), v: x.rnd(.3, .6)})); }
        bg(cv, T); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 1; i < P.n; i++) for (let y = -60 + off; y < 540; y += 60) g.fillRect(i * LW - 2, y, 4, 30);
        for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; c.y += v * c.v * dt; if (c.y > 600) { cars.splice(i, 1); continue; } g.fillStyle = 'hsl(' + c.hue + ',75%,58%)'; g.fillRect(c.l * LW + LW * .2, c.y, LW * .6, 56); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(c.l * LW + LW * .26, c.y + 10, LW * .48, 14);
          if (Math.abs(c.l * LW + LW / 2 - cx) < LW * .5 && c.y + 56 > 442 && c.y < 498) { x.beep(110, .4); return x.end(d / 10, st3(d, 3000, 7000, 12000), Math.round(d / 10) + ' m parcourus'); } }
        glow(g, T.a, 16); g.fillStyle = T.a; g.fillRect(cx - LW * .28, 440, LW * .56, 58); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(cx - LW * .2, 452, LW * .4, 12); x.hud('🚗 ' + Math.round(d / 10) + ' m'); });
    }});

  def({id: 'canon', n: 'Canonnier', e: '🧨', cat: 'arc', d: 'Vise et touche la cible malgré le vent.', how: 'Pose le doigt n\'importe où et tire vers l\'arrière (comme un lance-pierre), puis relâche. 10 tirs.',
    axes: [{k: 'w', o: [['Sans vent', 0], ['Brise', 1], ['Tempête', 2]]}, {k: 'd', o: [['Cible proche', 'n'], ['Cible lointaine', 'f'], ['Cible mobile', 'm']]}, {k: 't', o: TH}],
    play(x){
      const {P, T} = x, cv = x.canvas(540, 320), g = cv.g, GR = 380, C0 = {x: 40, y: 286}; let shots = 0, hits = 0, ball = null, drag = null, wind = 0, tg = null, sc = 0, flash = 0, last = '';
      const newT = () => { tg = {x: P.d === 'n' ? x.rnd(200, 330) : x.rnd(360, 510), w: 46, vx: P.d === 'm' ? x.rnd(60, 110) * (Math.random() < .5 ? -1 : 1) : 0}; wind = P.w ? x.rnd(-1, 1) * P.w * 70 : 0; }; newT();
      const vel = p => { let vx = (drag.x - p.x) * 3.6, vy = (drag.y - p.y) * 3.6; const s = Math.hypot(vx, vy); if (s > 620) { vx *= 620 / s; vy *= 620 / s; } return {vx, vy}; };
      x.on(cv.c, 'pointerdown', e => { if (!ball && !x.dead) { drag = cv.pos(e); drag.cur = drag; } });
      x.on(cv.c, 'pointermove', e => { if (drag) drag.cur = cv.pos(e); });
      x.on(cv.c, 'pointerup', e => { if (!drag || ball) { drag = null; return; } const v = vel(cv.pos(e)); drag = null; if (Math.hypot(v.vx, v.vy) < 80) return; ball = {x: C0.x, y: C0.y, vx: v.vx, vy: v.vy}; shots++; x.beep(200, .15); });
      x.loop(dt => { if (P.d === 'm') { tg.x += tg.vx * dt; if (tg.x < 180 || tg.x > 515) tg.vx *= -1; }
        if (ball) { ball.vx += wind * dt; ball.vy += GR * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.y >= 290) { const hitT = Math.abs(ball.x - tg.x) < tg.w / 2; if (hitT) { hits++; const pts = Math.round(100 - Math.abs(ball.x - tg.x) / (tg.w / 2) * 50); sc += pts; last = '🎯 +' + pts; x.beep(900); } else { last = 'Raté de ' + Math.round(Math.abs(ball.x - tg.x)) + ' px'; x.beep(150, .2); } flash = 1.2; ball = null; newT();
            if (shots >= 10) x.after(400, () => x.end(sc, st3(hits, 3, 6, 8), pl(hits, 'cible{s} touchée{s}') + ' sur 10')); }
          else if (ball.x > 560 || ball.x < -20) { last = 'Trop loin !'; flash = 1.2; ball = null; newT(); if (shots >= 10) x.after(400, () => x.end(sc, st3(hits, 3, 6, 8), pl(hits, 'cible{s} touchée{s}') + ' sur 10')); } }
        bg(cv, T); g.shadowBlur = 0; g.fillStyle = 'rgba(61,255,162,.18)'; g.fillRect(0, 292, 540, 28);
        glow(g, T.c, 12); g.fillStyle = T.c; g.fillRect(tg.x - tg.w / 2, 284, tg.w, 8); g.fillStyle = '#fff'; g.fillRect(tg.x - 4, 284, 8, 8);
        g.shadowBlur = 0; g.fillStyle = T.a; g.beginPath(); g.arc(C0.x, C0.y + 4, 16, Math.PI, 0); g.fill();
        if (drag && drag.cur) { const v = vel(drag.cur); g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 1; k < 14; k++) { const t = k * .06; g.beginPath(); g.arc(C0.x + v.vx * t, C0.y + v.vy * t + GR * t * t / 2, 2.5, 0, 7); g.fill(); } }
        if (ball) { glow(g, '#fff', 10); g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, 6, 0, 7); g.fill(); }
        txt(g, P.w ? 'Vent ' + (wind > 0 ? '→ ' : '← ') + Math.round(Math.abs(wind) / 10) : 'Pas de vent', 450, 26, 14, '#a79fc4'); if (flash > 0) { flash -= dt; txt(g, last, 270, 120, 20, T.b); }
        x.hud('🧨 Tir ' + Math.min(10, shots + (ball ? 0 : 1)) + ' / 10 · 🎯 ' + hits); });
    }});
  return {ENG, CATS, PAL, run, variants};
})();
