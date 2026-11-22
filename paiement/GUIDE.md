# Activer le paiement réel du Pass premium

Tout le code est prêt. Le paiement reste **désactivé** sur le site tant que les étapes ci-dessous ne sont pas faites.
Commence toujours en **mode test** de Stripe : de faux paiements avec des cartes de test, sans argent réel.

## Ce que le système fait déjà
- Seul le **Pass premium** est vendu (prix fixe, un achat par saison). Pas de cartes ni de boosters au hasard contre de l'argent.
- Avant de payer, le joueur coche « 18 ans ou accord d'un parent » et la renonciation à la rétractation. Le serveur refuse le paiement sans ces deux accords.
- Le paiement se fait chez **Stripe**. Le site ne voit jamais la carte bancaire.
- C'est le **serveur** qui active le pass, après confirmation signée de Stripe. Un joueur ne peut pas se l'activer lui-même : les règles de la base l'interdisent, je l'ai testé.
- Un remboursement retire le pass automatiquement.
- Le pass est lié au **code de sauvegarde** : on le garde en changeant d'appareil.

## Étapes (à faire par l'adulte responsable du site)
1. **Compte Stripe** : crée-le sur stripe.com. Il faut une pièce d'identité et un IBAN. Reste en « mode test » au début.
2. **Produit** : dans Stripe → Catalogue de produits → « Pass premium Saison 1 », paiement unique, 2,99 € TTC (ou le prix de ton choix). Copie l'identifiant du prix (`price_…`).
3. **Firebase en formule Blaze** : console Firebase → engrenage → Utilisation et facturation → passer à Blaze (paiement à l'usage, quasi gratuit à ton échelle). Mets une **alerte de budget** à 5 €.
4. **Installer les outils** sur ton PC : Node.js (version LTS, nodejs.org), puis dans PowerShell : `npm install -g firebase-tools`, puis `firebase login`.
5. **Mettre le serveur en ligne**, depuis ce dossier `paiement` :
   - `cd functions` puis `npm install`, puis `cd ..`
   - `firebase functions:secrets:set STRIPE_SECRET` : colle ta clé secrète **de test** (`sk_test_…`). Tu la tapes toi-même, ne l'envoie jamais à personne.
   - `firebase deploy --only functions` : la première fois, on te demandera la valeur de `STRIPE_PRICE_ID`. Colle le `price_…`.
6. **Webhook** : dans Stripe → Développeurs → Webhooks → ajouter l'adresse `https://europe-west1-guess-the-song-27134.cloudfunctions.net/webhookStripe`, avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `charge.refunded`. Copie le secret `whsec_…`, puis :
   `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` et `firebase deploy --only functions`.
7. **Pages légales** : complète les parties en jaune de `legal.html` (nom, contact, médiateur…).
8. **Me prévenir** : j'active le bouton (`PAY.enabled = true` dans `prog.js`) et on fait un achat de test avec la carte `4242 4242 4242 4242`.
9. **Passer en vrai** : quand tout marche en test, remplace la clé par `sk_live_…`, refais le webhook en mode « live », et redéploie.

## Côté administratif
- Vendre régulièrement implique en général une **micro-entreprise** (déclaration gratuite sur autoentrepreneur.urssaf.fr) et de déclarer les revenus.
- Stripe prend environ 1,5 % + 0,25 € par paiement européen.
