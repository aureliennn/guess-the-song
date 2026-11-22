/* Arcade Néon : serveur de paiement du Pass de saison (Firebase Cloud Functions + Revolut Business, API marchande).
   - creerPaiement : vérifie le joueur (jeton Firebase) et ses deux accords, refuse un 2e achat dans la même saison,
                     crée une commande Revolut au prix fixe et renvoie la page de paiement sécurisée de Revolut.
   - webhookRevolut : notification de Revolut, signature HMAC vérifiée. Le serveur redemande la commande à Revolut
                      et n'active premium/<code> que si elle est vraiment « completed ».
   Seul ce serveur peut écrire dans premium/ (les règles de la base l'interdisent aux joueurs). */
const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret, defineString} = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp({databaseURL: 'https://guess-the-song-27134-default-rtdb.europe-west1.firebasedatabase.app'});
const REVOLUT_SECRET = defineSecret('REVOLUT_SECRET');                   // clé secrète de l'API marchande (sk_…)
const REVOLUT_WEBHOOK = defineSecret('REVOLUT_WEBHOOK_SECRET');          // secret de signature du webhook (wsk_…)
const REVOLUT_ENV = defineString('REVOLUT_ENV', {default: 'sandbox'});   // « sandbox » pour les tests, « prod » pour de vrai
const PRICE_CENTS = defineString('PRICE_CENTS', {default: '299'});       // prix en centimes (299 = 2,99 €)
const SITE = 'https://aureliennn.github.io', PAGE = SITE + '/guess-the-song/collection.html';
const SEASON = 's1', API_VERSION = '2024-09-01';
const OPTS = {region: 'europe-west1', maxInstances: 3, memory: '256MiB'};

const api = (path, init) => fetch((REVOLUT_ENV.value() === 'prod' ? 'https://merchant.revolut.com' : 'https://sandbox-merchant.revolut.com') + path, Object.assign({}, init, {
  headers: Object.assign({'Authorization': 'Bearer ' + REVOLUT_SECRET.value(), 'Revolut-Api-Version': API_VERSION, 'Content-Type': 'application/json', 'Accept': 'application/json'}, (init && init.headers) || {})
}));
const cors = (req, res) => {
  res.set('Access-Control-Allow-Origin', SITE); res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
};

exports.creerPaiement = onRequest({...OPTS, secrets: [REVOLUT_SECRET]}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({err: 'methode'});
  try {
    const token = String(req.get('Authorization') || '').replace(/^Bearer /, '');
    const user = await admin.auth().verifyIdToken(token);                 // joueur authentifié (compte anonyme du site)
    const code = String((req.body && req.body.code) || '');
    const accords = req.body && req.body.accords;
    if (!/^[A-Z2-9]{12}$/.test(code)) return res.status(400).json({err: 'code'});
    if (!accords || accords.majeur !== true || accords.retractation !== true) return res.status(400).json({err: 'accords'});
    const deja = await admin.database().ref('premium/' + code).get();
    if (deja.exists() && deja.val().season === SEASON) return res.status(409).json({err: 'deja'});   // un seul achat par saison
    const amount = parseInt(PRICE_CENTS.value(), 10);
    if (!(amount >= 100 && amount <= 5000)) return res.status(500).json({err: 'prix'});
    const r = await api('/api/orders', {method: 'POST', body: JSON.stringify({
      amount, currency: 'EUR',
      description: 'Arcade Néon · Pass premium Saison 1',
      merchant_order_data: {reference: code + '-' + Date.now()},
      metadata: {code, uid: user.uid, season: SEASON, majeur: 'oui', retractation: 'renonce'},
      redirect_url: PAGE + '?paiement=ok'
    })});
    const order = await r.json().catch(() => ({}));
    if (!r.ok || !order.checkout_url) { console.error('commande refusée', r.status, JSON.stringify(order).slice(0, 300)); return res.status(502).json({err: 'revolut'}); }
    await admin.database().ref('orders/' + order.id).set({code, season: SEASON, t: Date.now()});   // trace interne (illisible par les joueurs)
    res.json({url: order.checkout_url});
  } catch (e) {
    console.error('creerPaiement', e.message);
    res.status(/token|auth/i.test(e.message) ? 401 : 500).json({err: 'serveur'});
  }
});

exports.webhookRevolut = onRequest({...OPTS, secrets: [REVOLUT_SECRET, REVOLUT_WEBHOOK]}, async (req, res) => {
  // 1. signature : Revolut-Signature = v1=HMAC_SHA256(secret, "v1.<horodatage>.<corps brut>")
  const ts = String(req.get('Revolut-Request-Timestamp') || ''), sigs = String(req.get('Revolut-Signature') || '').split(',').map(s => s.trim());
  const expected = 'v1=' + crypto.createHmac('sha256', REVOLUT_WEBHOOK.value()).update('v1.' + ts + '.' + req.rawBody.toString('utf8')).digest('hex');
  const okSig = sigs.some(s => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  const tms = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts); // horodatage en secondes ou millisecondes
  if (!okSig || !ts || !(Math.abs(Date.now() - tms) <= 5 * 60 * 1000)) { console.warn('webhook rejeté (signature ou horodatage)'); return res.status(401).send('signature'); }
  try {
    const ev = req.body || {}, id = String(ev.order_id || '');
    if (ev.event === 'ORDER_COMPLETED' && /^[A-Za-z0-9-]{8,64}$/.test(id)) {
      // 2. on ne fait jamais confiance au contenu du webhook : on redemande la commande à Revolut
      const r = await api('/api/orders/' + id, {method: 'GET'}), order = await r.json().catch(() => ({}));
      const code = order.metadata && order.metadata.code;
      if (r.ok && order.state === 'completed' && order.currency === 'EUR' && order.amount === parseInt(PRICE_CENTS.value(), 10) && /^[A-Z2-9]{12}$/.test(code || '')) {
        await admin.database().ref('premium/' + code).set({season: order.metadata.season || SEASON, t: Date.now(), oid: id.slice(0, 64)});
      } else console.warn('commande non valide', id, order.state);
    }
    res.json({ok: true});
  } catch (e) { console.error('webhook', e.message); res.status(500).send('erreur'); }
});
