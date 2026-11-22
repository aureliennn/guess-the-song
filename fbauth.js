/* Arcade Néon : identité Firebase.
   Chaque appareil reçoit un compte anonyme signé par Google (jeton renouvelé toutes les heures).
   L'admin peut se connecter avec son e-mail et son mot de passe : c'est Firebase (Google) qui vérifie le mot de passe,
   le site ne le stocke jamais. Les droits admin viennent de la liste admins/<uid> de la base (modifiable seulement dans la console).
   La clé ci-dessous est publique par nature (elle identifie le projet, elle ne donne aucun droit). */
(function(){
  'use strict';
  var KEY = 'AIzaSyAlfTCTFrhFsXNquXfWFzL5w8Mix3V1oKw', SK = 'arc_fb', ANON = 'arc_fb_anon', DB = 'https://guess-the-song-27134-default-rtdb.europe-west1.firebasedatabase.app';
  var st = null, pending = null, adm = null;
  function load(){ if (st) return; try { st = JSON.parse(localStorage.getItem(SK) || 'null'); } catch(e) { st = null; } }
  function save(){ try { localStorage.setItem(SK, JSON.stringify(st)); } catch(e) {} }
  function post(url, body, form){
    return fetch(url, {method: 'POST', headers: {'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json'}, body: body})
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ if (!r.ok) { var e = new Error('auth ' + r.status); e.status = r.status; e.code = d && d.error && d.error.message; throw e; } return d; }); });
  }
  function keep(uid, tok, rt, secs, email){ st = {uid: uid, tok: tok, rt: rt, exp: Date.now() + Math.max(60, (+secs || 3600) - 300) * 1000, email: email || ''}; save(); return tok; }
  function signUp(){ return post('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, JSON.stringify({returnSecureToken: true})).then(function(d){ return keep(d.localId, d.idToken, d.refreshToken, d.expiresIn); }); }
  function refresh(){
    var email = st.email;
    return post('https://securetoken.googleapis.com/v1/token?key=' + KEY, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(st.rt), true)
      .then(function(d){ return keep(d.user_id, d.id_token, d.refresh_token, d.expires_in, email); }, function(e){
        if (e.status === 400 || e.status === 403) { if (email) return restoreAnon(); return signUp(); } // session expirée : retour au compte joueur
        throw e; // simple coupure réseau : on garde le compte
      });
  }
  function restoreAnon(){ var a = null; try { a = JSON.parse(localStorage.getItem(ANON) || 'null'); } catch(e) {} st = a && a.rt ? a : null; adm = null; save(); return st ? refresh() : signUp(); }
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
    email: function(){ load(); return st && st.email || ''; },
    cached: function(){ load(); return st && st.tok && st.exp > Date.now() ? st.tok : ''; },
    // URL d'écriture signée : DB + '/chemin.json?auth=…'
    url: function(base, path, query){ return token().then(function(t){ return base + path + '.json?auth=' + encodeURIComponent(t) + (query ? '&' + query : ''); }); },
    // connexion admin : le mot de passe part directement chez Google (identitytoolkit), il n'est jamais enregistré par le site
    signIn: function(email, password){
      load(); if (st && !st.email) { try { localStorage.setItem(ANON, JSON.stringify(st)); } catch(e) {} }
      return post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + KEY, JSON.stringify({email: email, password: password, returnSecureToken: true}))
        .then(function(d){ adm = null; keep(d.localId, d.idToken, d.refreshToken, d.expiresIn, d.email || email); return st.uid; });
    },
    signOut: function(){ load(); if (!st || !st.email) return Promise.resolve(); return restoreAnon(); },
    // vrai si cet appareil est connecté avec un compte listé dans admins/ (vérifié par la base)
    isAdmin: function(){
      if (adm !== null) return Promise.resolve(adm);
      return token().then(function(t){ return fetch(DB + '/admins/' + st.uid + '.json?auth=' + encodeURIComponent(t)); }).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(v){ adm = !!v; return adm; }, function(){ return false; });
    }
  };
  token().catch(function(){});
  setInterval(function(){ if (!document.hidden) token().catch(function(){}); }, 10 * 60 * 1000);
})();
