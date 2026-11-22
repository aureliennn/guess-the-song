# Activer le paiement réel du Pass premium (Revolut Business)

Le paiement reste **désactivé** sur le site tant que ces étapes ne sont pas faites. Commence toujours en **sandbox** (mode test de Revolut, sans argent réel).

## Garde-fous déjà en place
- Seul le Pass premium est vendu (prix fixe, un achat par saison). Pas de cartes au hasard contre de l'argent.
- Avant de payer, le joueur coche « 18 ans ou accord d'un parent » et la renonciation à la rétractation. Le serveur vérifie aussi.
- La page de paiement est celle de Revolut : le site ne voit jamais la carte.
- Le serveur vérifie la signature du webhook, **redemande la commande à Revolut** (montant, devise, état « completed ») et seulement ensuite active `premium/<code>`. Les joueurs ne peuvent pas écrire dans `premium/`.
- Remboursement : retire le pass à la main dans la console Firebase (`premium/<code du joueur>`).

## Étapes
1. **Compte Revolut Business** (avec SIRET / micro-entreprise), puis active « Accepter des paiements ». Crée aussi un compte **sandbox** sur sandbox-business.revolut.com pour les tests.
2. **Clé API** : Revolut Business → APIs → Merchant API → copie la **clé secrète** (`sk_…`). Ne la donne jamais à personne.
3. **Firebase en formule Blaze**, avec une alerte de budget à 5 €.
4. **Outils** : installe Node.js LTS, puis `npm install -g firebase-tools` et `firebase login`.
5. **Mise en ligne**, depuis le dossier `paiement` :
   - `cd functions`, puis `npm install`, puis `cd ..`
   - `firebase functions:secrets:set REVOLUT_SECRET` (colle la clé sandbox)
   - `firebase functions:secrets:set REVOLUT_WEBHOOK_SECRET` (mets « temporaire » pour l'instant)
   - `firebase deploy --only functions` (accepte `REVOLUT_ENV = sandbox` et `PRICE_CENTS = 299` proposés)
6. **Webhook** : dans Revolut Business (APIs → Merchant API → Webhooks), ajoute l'adresse
   `https://europe-west1-guess-the-song-27134.cloudfunctions.net/webhookRevolut` avec l'événement `ORDER_COMPLETED`.
   Copie le secret de signature (`wsk_…`), puis : `firebase functions:secrets:set REVOLUT_WEBHOOK_SECRET` et `firebase deploy --only functions`.
7. **Pages légales** : complète les parties en jaune de `legal.html`.
8. **Préviens-moi** : j'active le bouton et on fait un achat de test en sandbox avec une carte de test Revolut.
9. **Passer en vrai** : remets la clé `sk_…` de production, `REVOLUT_ENV = prod`, recrée le webhook en production, puis redéploie.
