/* Arcade Néon : outils communs à tous les jeux */
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ls = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtTime = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
let toastTO = 0;
function toast(m, ms){
  let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = m; t.classList.remove('hide'); clearTimeout(toastTO); toastTO = setTimeout(() => t.classList.add('hide'), ms || 3200);
}
/* sons de synthèse (partagent le réglage « Effets sonores » du blind test) */
let AC = null;
function tone(f, t0, d, type, g){
  try {
    if (ls.get('gs_set', {sfx: true}).sfx === false) return;
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), a = AC.createGain(), t = AC.currentTime + (t0 || 0);
    o.type = type || 'sine'; o.frequency.value = f; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g || .12, t + .015); a.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(a); a.connect(AC.destination); o.start(t); o.stop(t + d + .05);
  } catch(e) {}
}
const sfx = {
  click: () => tone(880, 0, .07, 'sine', .07),
  move: () => tone(520, 0, .09, 'triangle', .1),
  cap: () => { tone(300, 0, .12, 'square', .06); tone(190, .05, .16, 'triangle', .09); },
  ok: () => [523, 659, 784].forEach((f, i) => tone(f, i * .07, .25, 'triangle')),
  bad: () => tone(170, 0, .3, 'sawtooth', .07),
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * .1, .45, 'triangle')),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * .14, .4, 'triangle', .1))
};
/* fenêtre modale : modal('Titre', '<p>…</p>', [['Rejouer', fn], ['Accueil', fn, true]]) */
function modal(title, html, buttons){
  closeModal();
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal';
  m.innerHTML = '<div class="box glass" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><h2>' + esc(title) + '</h2>' + (html || '') + '<div class="row"></div></div>';
  const row = m.querySelector('.row');
  (buttons || [['OK']]).forEach(([label, fn, ghost]) => { const b = document.createElement('button'); b.className = 'btn' + (ghost ? ' ghost' : ''); b.textContent = label; b.onclick = () => { if (!fn || fn() !== false) closeModal(); }; row.appendChild(b); });
  document.body.appendChild(m); const f = row.querySelector('button'); if (f) f.focus();
}
function closeModal(){ const m = $('modal'); if (m) m.remove(); }
/* statistiques par jeu (localStorage) */
function stat(key, fn){ const v = ls.get(key, {}); fn(v); ls.set(key, v); return v; }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
