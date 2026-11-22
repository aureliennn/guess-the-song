/* Arcade Néon : identifiant anonyme Firebase.
   Chaque appareil reçoit un compte anonyme signé par Google (jeton renouvelé toutes les heures).
   Les règles de la base n'acceptent les écritures qu'avec ce jeton, et chacun ne peut modifier que ses propres données.
   La clé ci-dessous est publique par nature (elle identifie le projet, elle ne donne aucun droit). */
(function(){
  'use strict';
  var KEY = 'AIzaSyAlfTCTFrhFsXNquXfWFzL5w8Mix3V1oKw', SK = 'arc_fb', st = null, pending = null;
  function load(){ if (st) return; try { st = JSON.parse(localStorage.getItem(SK) || 'null'); } catch(e) { st = null; } }
  function save(){ try { localStorage.setItem(SK, JSON.stringify(st)); } catch(e) {} }
  function post(url, body, form){
    return fetch(url, {method: 'POST', headers: {'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json'}, body: body})
      .then(function(r){ if (!r.ok) { var e = new Error('auth ' + r.status); e.status = r.status; throw e; } return r.json(); });
  }
  function keep(uid, tok, rt, secs){ st = {uid: uid, tok: tok, rt: rt, exp: Date.now() + Math.max(60, (+secs || 3600) - 300) * 1000}; save(); return tok; }
  function signUp(){ return post('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, JSON.stringify({returnSecureToken: true})).then(function(d){ return keep(d.localId, d.idToken, d.refreshToken, d.expiresIn); }); }
  function refresh(){
    return post('https://securetoken.googleapis.com/v1/token?key=' + KEY, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(st.rt), true)
      .then(function(d){ return keep(d.user_id, d.id_token, d.refresh_token, d.expires_in); }, function(e){
        if (e.status === 400 || e.status === 403) return signUp(); // compte révoqué ou invalide : nouveau compte
        throw e; // simple coupure réseau : on garde le compte
      });
  }
  function token(){
    load();
    if (st && st.tok && st.exp > Date.now()) return Promise.resolve(st.tok);
    if (!pending) pending = (st && st.rt ? refresh() : signUp()).then(function(t){ pending = null; return t; }, function(e){ pending = null; throw e; });
    return pending;
  }
  window.FBA = {
    token: token,
    ready: function(){ return token().then(function(){ return st.uid; }); },
    uid: function(){ load(); return st ? st.uid : ''; },
    cached: function(){ load(); return st && st.tok && st.exp > Date.now() ? st.tok : ''; },
    // URL d'écriture signée : DB + '/chemin.json?auth=…'
    url: function(base, path, query){ return token().then(function(t){ return base + path + '.json?auth=' + encodeURIComponent(t) + (query ? '&' + query : ''); }); }
  };
  token().catch(function(){});
  setInterval(function(){ if (!document.hidden) token().catch(function(){}); }, 10 * 60 * 1000);
})();
