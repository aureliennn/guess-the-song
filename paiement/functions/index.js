/* Arcade Néon : serveur de paiement du Pass de saison (Firebase Cloud Functions + Stripe).
   - creerPaiement : vérifie le joueur (jeton Firebase), refuse un 2e achat dans la même saison, crée une page de paiement Stripe au prix fixe.
   - webhookStripe : reçu de Stripe, signature vérifiée. Paiement confirmé → premium/<code> activé. Remboursement → retiré.
   Seul ce serveur peut écrire dans premium/ (les règles de la base l'interdisent aux joueurs). */
const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret, defineString} = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp({databaseURL: 'https://guess-the-song-27134-default-rtdb.europe-west1.firebasedatabase.app'});
const STRIPE_SECRET = defineSecret('STRIPE_SECRET');            // clé secrète Stripe (sk_test_… puis sk_live_…)
const STRIPE_WEBHOOK = defineSecret('STRIPE_WEBHOOK_SECRET');   // secret du webhook (whsec_…)
const PRICE_ID = defineString('STRIPE_PRICE_ID');               // prix du pass créé dans Stripe (price_…)
const SITE = 'https://aureliennn.github.io';
const SEASON = 's1';
const OPTS = {region: 'europe-west1', maxInstances: 3, memory: '256MiB'};

const cors = (req, res) => {
  res.set('Access-Control-Allow-Origin', SITE); res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST'); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
};

exports.creerPaiement = onRequest({...OPTS, secrets: [STRIPE_SECRET]}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({err: 'methode'});
  try {
    const token = String(req.get('Authorization') || '').replace(/^Bearer /, '');
    const user = await admin.auth().verifyIdToken(token);               // joueur authentifié (compte anonyme du site)
    const code = String((req.body && req.body.code) || '');
    const accords = req.body && req.body.accords;
    if (!/^[A-Z2-9]{12}$/.test(code)) return res.status(400).json({err: 'code'});
    if (!accords || accords.majeur !== true || accords.retractation !== true) return res.status(400).json({err: 'accords'});
    const deja = await admin.database().ref('premium/' + code).get();
    if (deja.exists() && deja.val().season === SEASON) return res.status(409).json({err: 'deja'}); // un seul achat par saison
    const stripe = Stripe(STRIPE_SECRET.value());
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{price: PRICE_ID.value(), quantity: 1}],
      client_reference_id: code,
      metadata: {code, uid: user.uid, season: SEASON, majeur: 'oui', retractation: 'renonce'},
      locale: 'fr',
      success_url: SITE + '/guess-the-song/collection.html?paiement=ok',
      cancel_url: SITE + '/guess-the-song/collection.html?paiement=annule',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60
    });
    res.json({url: session.url});
  } catch (e) {
    console.error('creerPaiement', e.message);
    res.status(e.code === 'auth/argument-error' || /token/i.test(e.message) ? 401 : 500).json({err: 'serveur'});
  }
});

exports.webhookStripe = onRequest({...OPTS, secrets: [STRIPE_SECRET, STRIPE_WEBHOOK]}, async (req, res) => {
  let event;
  try { event = Stripe(STRIPE_SECRET.value()).webhooks.constructEvent(req.rawBody, req.get('stripe-signature'), STRIPE_WEBHOOK.value()); }
  catch (e) { console.warn('signature invalide'); return res.status(400).send('signature'); }   // faux appel : ignoré
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object, code = s.metadata && s.metadata.code;
      if (s.payment_status === 'paid' && /^[A-Z2-9]{12}$/.test(code || '')) {
        await admin.database().ref('premium/' + code).set({season: s.metadata.season || SEASON, t: Date.now(), pi: String(s.payment_intent || '').slice(0, 64)});
      }
    }
    if (event.type === 'charge.refunded') { // remboursé → pass retiré
      const pi = event.data.object.payment_intent; const snap = await admin.database().ref('premium').orderByChild('pi').equalTo(pi).get();
      const upd = {}; snap.forEach(c => { upd[c.key] = null; }); if (Object.keys(upd).length) await admin.database().ref('premium').update(upd);
    }
    res.json({ok: true});
  } catch (e) { console.error('webhook', e.message); res.status(500).send('erreur'); }
});
