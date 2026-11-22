/* Arcade Néon : progression commune (jetons 💠, XP et Pass de saison, connexion quotidienne, cartes à collectionner, sauvegarde en ligne par code).
   Tout est gagné en jouant : aucun argent réel. La sauvegarde en ligne est rangée sous un code secret de 12 caractères (save/<code>). */
(function(){
  'use strict';
  const DB = 'https://guess-the-song-27134-default-rtdb.europe-west1.firebasedatabase.app', KEY = 'arc_prog';
  const FAM = {
    ne: {n: 'Néon', e: '⚡', a: '#b86bff', b: '#38e1ff'}, fe: {n: 'Braise', e: '🔥', a: '#ff4d1a', b: '#ffd166'}, oc: {n: 'Abysse', e: '🌊', a: '#0a6cff', b: '#3dffa2'},
    fo: {n: 'Sylve', e: '🌿', a: '#1f9a45', b: '#d4ff6b'}, co: {n: 'Cosmos', e: '🌌', a: '#24125e', b: '#ff4fa3'}, om: {n: 'Ombre', e: '🌑', a: '#1a1028', b: '#7a5cff'},
    my: {n: 'Mythes', e: '✨', a: '#ff4fa3', b: '#ffd166'}, ps: {n: 'Pass', e: '🎫', a: '#ffb300', b: '#fff3b0'}
  };
  const RAR = [{n: 'Commune', c: '#c9c9d9', sh: 5, cr: 40}, {n: 'Rare', c: '#38a9ff', sh: 15, cr: 120}, {n: 'Épique', c: '#b86bff', sh: 50, cr: 400}, {n: 'Légendaire', c: '#ffd166', sh: 200, cr: 1600}, {n: 'Mythique', c: '#ff4fa3', sh: 800, cr: 6000}];
  const RAW = {
    ne: [['🦊', 'Voltaire le Renard', 0, 'Plus rapide qu\'un éclair, plus rusé qu\'un court-circuit.'], ['🐹', 'Watt-Watt', 0, 'Il fait tourner sa roue… et toute la ville.'], ['💡', 'Lumi', 0, 'Une idée lumineuse par seconde.'], ['🔌', 'Prisa', 0, 'Toujours branchée.'], ['🤖', 'Bip-Bop', 1, 'Huit milliards de calculs par seconde, et il oublie toujours ses clés.'], ['👾', 'Glitchou', 1, 'Un bug ? Non : une fonctionnalité.'], ['🐱', 'Pixelle', 1, 'Neuf vies, toutes en haute définition.'], ['🦅', 'Néonix', 2, 'Son cri fait sauter les fusibles.'], ['🎛️', 'DJ Ampère', 2, 'Il monte le son jusqu\'à 11.'], ['👑', 'Reine Kilowatt', 3, 'Elle règne sur toutes les lumières de la ville.']],
    fe: [['🐞', 'Coccinflamme', 0, 'Petite, mais elle chauffe.'], ['🕯️', 'Mèche', 0, 'Ne souffle jamais sur elle.'], ['🌶️', 'Piment Fou', 0, 'Trop épicé pour être arrêté.'], ['🦎', 'Lézard de Lave', 0, 'Il prend des bains à 1 200 °C.'], ['🐺', 'Loup Cendré', 1, 'Il hurle à la lune… pour la réchauffer.'], ['🧯', 'Pompière Rita', 1, 'Elle éteint tout, sauf sa passion.'], ['🌋', 'Gronde-Mont', 1, 'Quand il éternue, l\'île change de forme.'], ['🐉', 'Pyrolithe', 2, 'Dragon de roche en fusion, gardien des forges.'], ['☄️', 'Comète Rouge', 2, 'Elle traverse le ciel une fois par siècle.'], ['🐦‍🔥', 'Phénix Solaire', 3, 'Il renaît de ses cendres, plus brillant à chaque fois.']],
    oc: [['🐠', 'Bulle', 0, 'Elle oublie tout en trois secondes, sauf toi.'], ['🦀', 'Pince-Mi', 0, 'Il marche de travers mais va droit au but.'], ['🐚', 'Coquillou', 0, 'Écoute-le : il raconte la mer.'], ['🪼', 'Méduse Lunaire', 0, 'Elle brille dans les nuits sans lune.'], ['🐬', 'Ricochet', 1, 'Champion du monde de sauts périlleux.'], ['🐢', 'Grand-Père Tortue', 1, 'Trois cents ans et toujours en avance.'], ['🦭', 'Phoquette', 1, 'Elle applaudit chacune de tes victoires.'], ['🐙', 'Octave', 2, 'Huit bras, huit instruments, un orchestre.'], ['🦈', 'Croc d\'Azur', 2, 'Le requin le plus poli des océans.'], ['🐋', 'Léviathan Bleu', 3, 'Son chant fait danser les marées.']],
    fo: [['🍄', 'Champi', 0, 'Il pousse partout où tu ris.'], ['🐌', 'Lentille', 0, 'Elle arrive toujours… un jour.'], ['🦔', 'Piquant', 0, 'Doux à l\'intérieur.'], ['🌻', 'Tournesol', 0, 'Toujours tourné du bon côté.'], ['🦉', 'Hibou Savant', 1, 'Il a lu tous les livres de la forêt.'], ['🦌', 'Cerf d\'Émeraude', 1, 'Ses bois fleurissent au printemps.'], ['🐿️', 'Noisette', 1, 'Elle cache des trésors partout… et oublie où.'], ['🌳', 'Vieux Chêne', 2, 'Il se souvient de la toute première pluie.'], ['🦋', 'Papillonne', 2, 'Un battement d\'aile, un arc-en-ciel.'], ['🐻', 'Ours Mousse', 3, 'Le protecteur de toutes les forêts.']],
    co: [['🌙', 'Lunette', 0, 'Elle veille sur tes rêves.'], ['⭐', 'Étincelle', 0, 'Petite étoile, grand cœur.'], ['🛰️', 'Satello', 0, 'Il capte toutes les chansons de l\'univers.'], ['🪐', 'Anneau', 0, 'Elle tourne en rond, et elle adore ça.'], ['👽', 'Zorblax', 1, 'Venu en paix… et pour les crêpes.'], ['🧑‍🚀', 'Capitaine Orbite', 1, 'Première à avoir dansé sur Mars.'], ['🛸', 'Soucoupe Sam', 1, 'Il se gare toujours en double file.'], ['🌠', 'Filante', 2, 'Fais un vœu, elle l\'exaucera peut-être.'], ['🌌', 'Nébuleuse', 2, 'Elle peint les galaxies.'], ['☀️', 'Astre Roi', 3, 'Le cœur brûlant de la galaxie Néon.']],
    om: [['🦇', 'Chauvo', 0, 'Il voit tout, même les yeux fermés.'], ['🕷️', 'Tisseuse', 0, 'Ses toiles brillent sous la lune.'], ['👻', 'Bouh', 0, 'Il fait peur… surtout à lui-même.'], ['🐈‍⬛', 'Minuit', 0, 'Porte-bonheur, quoi qu\'on en dise.'], ['🎭', 'Masque', 1, 'Personne n\'a jamais vu son vrai visage.'], ['🦂', 'Dard Noir', 1, 'Discret comme une ombre, précis comme une flèche.'], ['🔮', 'Voyante Ysa', 1, 'Elle connaît déjà la fin de ta partie.'], ['🧛', 'Comte Crépuscule', 2, 'Il préfère le jus de tomate, promis.'], ['🐍', 'Serpent d\'Onyx', 2, 'Il murmure des énigmes.'], ['🌑', 'Reine des Ombres', 3, 'Quand elle sourit, les étoiles s\'éteignent.']],
    my: [['🐲', 'Arcanox, Dragon Néon', 4, 'Né du tout premier pixel de l\'Arcade.'], ['🦄', 'Prisma', 4, 'Elle laisse un arc-en-ciel à chaque pas.'], ['🧞', 'Djinn des Jeux', 4, 'Trois vœux, mille parties.'], ['🗿', 'Le Gardien', 4, 'Il garde la porte de l\'Arcade depuis toujours.']],
    ps: [['🏅', 'Champion de Saison', 3, 'Réservé à celles et ceux qui vont au bout du Pass.'], ['🎖️', 'Médaillé Néon', 3, 'Chaque niveau du Pass lui donne une étoile.'], ['💠', 'Joyau du Pass', 4, 'La récompense ultime de la Saison 1.']]
  };
  const CARDS = []; Object.entries(RAW).forEach(([f, arr]) => arr.forEach(([e, n, r, q], i) => CARDS.push({id: f + (i + 1), f, e, n, r, q, pw: 20 + r * 25 + ((i * 37 + f.charCodeAt(0) * 7) % 20)})));
  const BYID = Object.fromEntries(CARDS.map(c => [c.id, c])), DROP = CARDS.filter(c => c.f !== 'ps');
  const ODDS = [.62, .26, .09, .026, .004];
  const SEASON = {n: 'Saison 1 · Éveil Néon', end: '2027-01-31', levels: 30, xp: 100};
  const passFree = l => l % 5 === 0 ? {b: 1} : {j: 20 + l * 2};
  const passPrem = l => l === 10 ? {c: 'ps2'} : l === 20 ? {c: 'ps1'} : l === 30 ? {c: 'ps3'} : l % 5 === 0 ? {b: 2} : l % 2 ? {j: 40 + l * 3} : {sh: 30 + l * 4};
  const DAILY = [{j: 20}, {j: 30}, {j: 40, sh: 20}, {j: 50}, {j: 60, b: 1}, {j: 80, sh: 50}, {j: 120, b: 2}];
  const PRICES = {booster: 100, family: 160, premium: 500, tier: 150, tier5: 650};
  const tierCost = n => n >= 5 ? Math.round(PRICES.tier5 * n / 5) : PRICES.tier * n; // pack de 5 paliers moins cher
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ls = {get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e) { return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }};
  const blank = () => ({j: 150, xp: 0, sh: 0, prem: false, pc: '', pp: '', d: {n: 0, last: ''}, b: 1, cards: {}, code: '', t: 0});
  let S = Object.assign(blank(), ls.get(KEY, {})); const subs = [];
  const emit = () => { S.t = Date.now(); ls.set(KEY, S); subs.forEach(f => { try { f(S); } catch(e) {} }); schedule(); };
  let TB = 0; // paliers achetés en euros (tiers/<code>, écrits par l'admin) : s'ajoutent au niveau, jamais effacés par la synchro
  const level = () => Math.min(SEASON.levels, Math.floor(S.xp / SEASON.xp) + TB), give = r => { if (!r) return; if (r.j) S.j += r.j; if (r.sh) S.sh += r.sh; if (r.b) S.b += r.b; if (r.c) S.cards[r.c] = (S.cards[r.c] | 0) + 1; };
  const rewardText = r => [r.j ? '💠 ' + r.j : '', r.sh ? '✨ ' + r.sh + ' éclats' : '', r.b ? '📦 ' + r.b + ' booster' + (r.b > 1 ? 's' : '') : '', r.c ? '🃏 ' + BYID[r.c].n : ''].filter(Boolean).join(' · ');
  const roll = fam => { let x = Math.random(), r = 0; for (; r < 4 && x > ODDS[r]; r++) x -= ODDS[r]; let pool = DROP.filter(c => c.r === r && (!fam || c.f === fam)); while (!pool.length && r > 0) { r--; pool = DROP.filter(c => c.r === r && (!fam || c.f === fam)); } return pool[Math.random() * pool.length | 0]; };
  /* ---------- quêtes du jour : 3 par jour, les mêmes pour tout le monde (tirées à partir de la date) ---------- */
  const QPOOL = [
    {k: 'play', n: 5, t: 'Joue 5 parties de Mille Jeux', r: {j: 40}}, {k: 'play', n: 10, t: 'Joue 10 parties de Mille Jeux', r: {j: 70, sh: 20}},
    {k: 'stars', n: 6, t: 'Gagne 6 étoiles ⭐', r: {j: 50}}, {k: 'stars', n: 12, t: 'Gagne 12 étoiles ⭐', r: {j: 90}},
    {k: 'three', n: 1, t: 'Fais 3 étoiles dans une partie', r: {j: 40, sh: 20}}, {k: 'three', n: 3, t: 'Fais 3 étoiles dans 3 parties', r: {j: 80, sh: 30}},
    {k: 'diff', n: 3, t: 'Joue à 3 jeux différents', r: {j: 45}}, {k: 'diff', n: 5, t: 'Joue à 5 jeux différents', r: {j: 70}},
    {k: 'cat', c: 'ref', n: 2, t: 'Joue 2 parties de ⚡ Réflexes', r: {j: 40}}, {k: 'cat', c: 'mem', n: 2, t: 'Joue 2 parties de 🧠 Mémoire', r: {j: 40}},
    {k: 'cat', c: 'log', n: 2, t: 'Joue 2 parties de 🧩 Réflexion', r: {j: 40}}, {k: 'cat', c: 'arc', n: 2, t: 'Joue 2 parties d\'🕹️ Arcade', r: {j: 40}},
    {k: 'cat', c: 'mot', n: 2, t: 'Joue 2 parties de 🔤 Mots & calcul', r: {j: 40}},
    {k: 'booster', n: 1, t: 'Ouvre un booster de cartes', r: {sh: 40}}, {k: 'daily', n: 1, t: 'Récupère ta récompense du jour', r: {j: 25}},
    {k: 'claim', n: 2, t: 'Prends 2 récompenses du Pass', r: {j: 35}}
  ];
  const QBONUS = {b: 1}, QXP = 50;
  const seedOf = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function todayQuests(){ let h = seedOf('q' + today()); const out = [], kinds = new Set(), idx = [...QPOOL.keys()];
    while (out.length < 3 && idx.length) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const i = idx.splice(h % idx.length, 1)[0], q = QPOOL[i]; if (kinds.has(q.k)) continue; kinds.add(q.k); out.push(i); } return out; }
  let Q = ls.get('arc_quests', null);
  const qFresh = () => { if (!Q || Q.d !== today()) { Q = {d: today(), ids: todayQuests(), p: [0, 0, 0], c: [0, 0, 0], g: [], bonus: 0}; ls.set('arc_quests', Q); } return Q; };
  function track(k, amount, info){ qFresh(); let ch = false; Q.ids.forEach((qi, i) => { const q = QPOOL[qi]; if (q.k !== k || Q.p[i] >= q.n) return; if (k === 'cat' && (!info || info.cat !== q.c)) return; Q.p[i] = Math.min(q.n, Q.p[i] + amount); ch = true; }); if (ch) ls.set('arc_quests', Q); }
  function trackGame(stars, info){ track('play', 1); if (stars) track('stars', stars); if (stars >= 3) track('three', 1);
    if (info && info.id) { qFresh(); if (!Q.g.includes(info.id)) { Q.g.push(info.id); if (Q.g.length > 40) Q.g.shift(); track('diff', 1); } if (info.cat) track('cat', 1, info); } }
  /* ---------- sauvegarde en ligne (code secret) ---------- */
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', newCode = () => { const a = new Uint32Array(12); crypto.getRandomValues(a); return [...a].map(v => ALPH[v % ALPH.length]).join(''); };
  let timer = 0, lastPush = 0, status = 'local', busy = false, again = false;
  function schedule(ms){ clearTimeout(timer); timer = setTimeout(push, ms || Math.max(2500, 6000 - (Date.now() - lastPush))); }
  async function push(){
    if (!window.FBA) return; if (busy) { again = true; return; } busy = true; if (!S.code) { S.code = newCode(); ls.set(KEY, S); }
    try {
      const u = await FBA.ready(), name = String(ls.get('gs_name', '') || '').slice(0, 16), cards = {}; Object.entries(S.cards).forEach(([k, v]) => { if (BYID[k] && v > 0) cards[k] = Math.min(9999, v | 0); });
      const data = {u, n: name, j: Math.min(1e7, S.j | 0), xp: Math.min(1e8, S.xp | 0), sh: Math.min(1e7, S.sh | 0), prem: !!S.prem, pc: S.pc.slice(0, 40), pp: S.pp.slice(0, 40), d: {n: S.d.n | 0, last: String(S.d.last || '').slice(0, 10)}, b: Math.min(1000, S.b | 0), t: Date.now()};
      if (Object.keys(cards).length) data.cards = cards;
      const r = await fetch(await FBA.url(DB, '/'), {method: 'PATCH', body: JSON.stringify({['save/' + S.code]: data, ['rl/' + u + '/k']: {'.sv': 'timestamp'}})});
      lastPush = Date.now(); status = r.ok ? 'ok' : 'retry'; if (!r.ok) schedule(3000);
    } catch(e) { status = 'err'; schedule(8000); }
    busy = false; if (again) { again = false; schedule(); }
    subs.forEach(f => { try { f(S); } catch(e) {} });
  }
  const fromRemote = d => { const s = blank(); Object.assign(s, {j: d.j | 0, xp: d.xp | 0, sh: d.sh | 0, prem: !!d.prem, pc: String(d.pc || ''), pp: String(d.pp || ''), d: {n: (d.d && d.d.n) | 0, last: (d.d && d.d.last) || ''}, b: d.b | 0, cards: Object.assign({}, d.cards || {}), t: d.t | 0}); return s; };
  async function pull(){ // récupère la version en ligne si elle est plus récente (autre appareil)
    if (!S.code) return; try { const d = await (await fetch(DB + '/save/' + S.code + '.json')).json(); if (d && typeof d.t === 'number' && d.t > S.t + 2000) { const code = S.code; S = fromRemote(d); S.code = code; if (PAID) S.prem = true; ls.set(KEY, S); subs.forEach(f => f(S)); } status = 'ok'; } catch(e) {}
  }
  let PAID = false; // pass acheté (premium/<code>) : la synchro ne doit jamais l'effacer
  /* ---------- paiement réel du Pass via Revolut Business (désactivé tant que le serveur n'est pas en ligne) ---------- */
  // version simple : lien de paiement (PayPal, Revolut ou Stripe) + activation par l'admin (admin.html). Mets le lien et passe enabled à true.
  const PAY = {enabled: false, link: 'https://paypal.me/Aurelienrcxo/2.99EUR', me: 'https://paypal.me/Aurelienrcxo/', name: 'PayPal', price: '2,99 €', season: 's1'};
  // offres en euros : le Pass premium (une fois par saison) et des packs de paliers (jamais de cartes au hasard)
  const OFFERS = {
    pass: {k: 'pass', a: 299, price: '2,99 €', label: 'Pass premium', n: 0},
    t5: {k: 't5', a: 199, price: '1,99 €', label: '+5 paliers du Pass', n: 5},
    t10: {k: 't10', a: 349, price: '3,49 €', label: '+10 paliers du Pass', n: 10}
  };
  const payLink = k => PAY.me + (OFFERS[k].a / 100).toFixed(2) + 'EUR';
  async function checkTiers(){ // somme des paliers achetés (tiers/<code>), validés par l'admin
    if (!S.code) return TB;
    try { const d = await (await fetch(DB + '/tiers/' + S.code + '.json')).json(); let n = 0; if (d && typeof d === 'object') Object.values(d).forEach(g => { if (g && g.s === PAY.season) n += g.n | 0; });
      if (n !== TB) { TB = n; ls.set('arc_tb', {c: S.code, n}); subs.forEach(f => { try { f(S); } catch(e) {} }); } } catch(e) {}
    return TB;
  }
  async function checkPaid(){ // le serveur écrit premium/<code> après un paiement confirmé par Stripe
    if (!S.code) return false;
    try { const d = await (await fetch(DB + '/premium/' + S.code + '.json')).json(); if (d && d.season === PAY.season) { PAID = true; if (!S.prem) { S.prem = true; emit(); } return true; } } catch(e) {}
    return false;
  }
  window.PROG = {
    FAM, RAR, CARDS, BYID, SEASON, DAILY, PRICES, passFree, passPrem, rewardText,
    get: () => S, level, status: () => status,
    xpIn: () => S.xp % SEASON.xp, daysLeft: () => Math.max(0, Math.ceil((Date.parse(SEASON.end + 'T23:59:59') - Date.now()) / 864e5)),
    on: f => { subs.push(f); },
    addXP(n){ S.xp = Math.min(SEASON.levels * SEASON.xp * 3, S.xp + n); emit(); },
    addJ(n){ S.j += n; emit(); },
    gameReward(stars, info){ const j = 1 + stars * 2, xp = 10 + stars * 10, before = level(); S.j += j; S.xp += xp; trackGame(stars, info); emit(); return {j, xp, up: level() > before, quests: this.questsReady()}; },
    // quêtes du jour
    quests(){ qFresh(); return Q.ids.map((qi, i) => { const q = QPOOL[qi]; return {i, t: q.t, n: q.n, p: Q.p[i], r: q.r, xp: QXP, done: Q.p[i] >= q.n, claimed: !!Q.c[i]}; }); },
    questsReady(){ return this.quests().filter(q => q.done && !q.claimed).length; },
    claimQuest(i){ qFresh(); const qi = Q.ids[i], q = QPOOL[qi]; if (!q || Q.c[i] || Q.p[i] < q.n) return null; Q.c[i] = 1; ls.set('arc_quests', Q); give(q.r); S.xp += QXP; emit(); return q.r; },
    bonusReady(){ qFresh(); return Q.c.every(Boolean) && !Q.bonus; },
    claimBonus(){ if (!this.bonusReady()) return null; Q.bonus = 1; ls.set('arc_quests', Q); give(QBONUS); S.xp += 100; emit(); return QBONUS; },
    questsLeftH: () => { const d = new Date(), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return Math.max(1, Math.ceil((m - d) / 36e5)); },
    canDaily: () => S.d.last !== today(),
    claimDaily(){ if (S.d.last === today()) return null; const day = S.d.n % 7, r = DAILY[day]; give(r); S.xp += 60; S.d = {n: day + 1 >= 7 ? 0 : day + 1, last: today()}; track('daily', 1); emit(); return {day, r}; },
    dayIndex: () => S.d.n % 7,
    buy(what, fam){ const p = what === 'family' ? PRICES.family : PRICES.booster; if (!ADMIN) { if (S.j < p) return false; S.j -= p; } const cards = this.open(fam); return cards; },
    open(fam, free){ if (free) { if (S.b < 1) return null; S.b--; } const out = []; for (let i = 0; i < 5; i++) out.push(roll(fam)); track('booster', 1); if (!out.some(c => c.r >= 1)) { const rp = DROP.filter(c => c.r === 1 && (!fam || c.f === fam)); if (rp.length) out[4] = rp[Math.random() * rp.length | 0]; } // au moins une Rare par booster
      const res = out.map(c => { const had = S.cards[c.id] | 0; S.cards[c.id] = had + 1; return {c, nw: !had}; }); emit(); return res; },
    recycle(id){ const n = S.cards[id] | 0; if (n < 2) return 0; const g = (n - 1) * RAR[BYID[id].r].sh; S.cards[id] = 1; S.sh += g; emit(); return g; },
    recycleAll(){ let g = 0; Object.keys(S.cards).forEach(id => { const n = S.cards[id] | 0; if (n > 1 && BYID[id]) { g += (n - 1) * RAR[BYID[id].r].sh; S.cards[id] = 1; } }); if (g) { S.sh += g; emit(); } return g; },
    craft(id){ const c = BYID[id]; if (!c || c.f === 'ps') return false; const p = RAR[c.r].cr; if (!ADMIN) { if (S.sh < p) return false; S.sh -= p; } S.cards[id] = (S.cards[id] | 0) + 1; emit(); return true; },
    passClaimed: (l, prem) => (prem ? S.pp : S.pc)[l - 1] === '1',
    claimPass(l, prem){ if ((l > level() && !ADMIN) || (prem && !S.prem)) return null; const k = prem ? 'pp' : 'pc'; const arr = S[k].padEnd(SEASON.levels, '0').split(''); if (arr[l - 1] === '1') return null; arr[l - 1] = '1'; S[k] = arr.join(''); const r = prem ? passPrem(l) : passFree(l); give(r); track('claim', 1); emit(); return r; },
    buyPremium(){ if (S.prem || (!ADMIN && S.j < PRICES.premium)) return false; if (!ADMIN) S.j -= PRICES.premium; S.prem = true; emit(); return true; },
    // mode admin : achats gratuits et illimités (vérifié par la base via FBA.isAdmin)
    // achat de paliers du Pass avec des jetons (gratuit pour l'admin) : n paliers, limité au niveau max
    tierCost,
    buyTiers(n){ const lv = level(); n = Math.min(n | 0, SEASON.levels - lv); if (n < 1) return 0; const p = tierCost(n);
      if (!ADMIN) { if (S.j < p) return 0; S.j -= p; }
      S.xp = lv + n >= SEASON.levels ? Math.max(S.xp, (SEASON.levels - TB) * SEASON.xp) : S.xp + n * SEASON.xp; emit(); return n; },
    isAdmin: () => ADMIN,
    unlockAll(){ if (!ADMIN) return 0; let n = 0; CARDS.forEach(c => { if (!S.cards[c.id]) { S.cards[c.id] = 1; n++; } }); S.prem = true; emit(); return n; },
    // demande de vérification de paiement envoyée à la console admin (payreq/<code>)
    async requestPay(k){ const o = OFFERS[k] || OFFERS.pass, u = await FBA.ready(), code = this.code(), key = code + (o.k === 'pass' ? '' : '_' + o.k), body = {['payreq/' + key]: {n: String(ls.get('gs_name', '') || '').slice(0, 16), a: o.a, k: o.k, u, t: {'.sv': 'timestamp'}}, ['rl/' + u + '/p']: {'.sv': 'timestamp'}};
      try { const r = await fetch(await FBA.url(DB, '/'), {method: 'PATCH', body: JSON.stringify(body)}); return r.ok ? 'ok' : 'attente'; } catch(e) { return 'reseau'; } },
    code: () => { if (!S.code) { S.code = newCode(); ls.set(KEY, S); schedule(); } return S.code; },
    async restore(code){ code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!/^[A-Z2-9]{12}$/.test(code)) return 'format';
      try { const d = await (await fetch(DB + '/save/' + code + '.json')).json(); if (!d || typeof d.t !== 'number') return 'absent'; S = fromRemote(d); S.code = code; S.t = Date.now(); PAID = false; TB = 0; ls.set(KEY, S); subs.forEach(f => f(S)); schedule(); checkPaid(); checkTiers(); return 'ok'; } catch(e) { return 'reseau'; } },
    syncNow: push, pull,
    PAY, OFFERS, payLink, checkPaid, checkTiers, tiersBought: () => TB,
    async startPayment(accords){ if (!PAY.enabled) return 'off'; if (!accords || !accords.majeur || !accords.retractation) return 'accords';
      try { const tok = await FBA.token(), r = await fetch(PAY.url, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + tok}, body: JSON.stringify({code: this.code(), accords})}); const d = await r.json().catch(() => ({}));
        if (r.ok && d.url && /^https:\/\/([a-z0-9-]+\.)*revolut\.com\//.test(d.url)) { location.href = d.url; return 'ok'; } return d.err || 'erreur'; } catch(e) { return 'reseau'; } }
  };
  let ADMIN = false;
  if (window.FBA) FBA.isAdmin().then(a => { ADMIN = !!a; if (ADMIN && !S.prem) { S.prem = true; emit(); } else if (ADMIN) subs.forEach(f => { try { f(S); } catch(e) {} }); });
  try { const c = ls.get('arc_tb', null); if (c && c.c === S.code) TB = c.n | 0; } catch(e) {}
  if (S.code) { pull().then(() => { checkPaid(); checkTiers(); }); } else if (window.FBA) schedule(3000);
})();
