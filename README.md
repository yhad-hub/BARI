# Fiche collaborateur — HR Access Suite 9 / OpenHR

Page web affichant les informations d'un collaborateur (état civil,
coordonnées, affectation, contrat) à partir du dossier salarié HR Access
Suite 9, lues via **OpenHR** — l'API Java livrée avec HR Access (voir
`docs/OPENHR.md`).

La page est conçue pour être **appelée depuis HRa Suite 9** (lien de menu ou
page guidée) avec le dossier passé en paramètre d'URL.

## Architecture

OpenHR étant une API Java (protocole propriétaire sur sockets TCP, pas un
web service), l'accès aux données passe par un connecteur Java :

```
HRa Suite 9 (navigateur)
   │  ouvre  /?nudoss=1000  (ou ?matricule=123456)
   ▼
Serveur web Node.js (ce dépôt, racine)        — page + API JSON + mapping rubriques→champs
   │  GET http://connecteur:8091/collaborateur/1000
   ▼
Connecteur Java (connector-java/)             — API OpenHR : session, utilisateur, rôle,
   │                                            collection de dossiers, lecture d'occurrences
   ▼  sockets TCP (messages OpenHR)
Serveur OpenHR ──► programmes COBOL ──► base HR Access (dossier ZY)
```

- `public/` — la page web (HTML/CSS/JS, français, sans framework)
- `server.js` — serveur Express : sert la page, expose `/api/collaborateur/:id`
- `src/openhrClient.js` — appel du connecteur + transposition
  sections/rubriques → champs de la page (+ mode mock)
- `config/openhr.config.js` — URL du connecteur et **correspondance
  sections/rubriques HRa → champs affichés**
- `connector-java/` — le connecteur OpenHR (voir son README)

## Démarrage rapide (sans serveur HR Access)

Prérequis : Node.js ≥ 18. (Mise en service complète pas à pas : `docs/MISE-EN-SERVICE.md`.)

```bash
npm install
npm run dev        # MOCK_MODE=true : dossier fictif, pas de connecteur requis
```

Puis ouvrir <http://localhost:3000/?nudoss=00012345>.

Pour tester la chaîne complète avec le connecteur en mode mock (JDK requis) :

```bash
cd connector-java && ./build.sh
java -cp "build:lib/*" connecteur.ConnecteurOpenHR conf/connecteur.properties &
cd .. && MOCK_MODE=false npm start
```

## Connexion réelle à HR Access

1. **Connecteur** : suivre `connector-java/README.md` (JARs OpenHR dans
   `lib/`, `openhr.properties` selon votre topologie, utilisateur de service
   + rôle, `mock=false`).
2. **Serveur web** : copier `.env.example` en `.env`, pointer `CONNECTOR_URL`
   vers le connecteur, `MOCK_MODE=false`.
3. **Correspondance des données** : ajuster les codes de sections et
   rubriques dans `config/openhr.config.js` **et** la liste `openhr.sections`
   du connecteur, d'après le dictionnaire de données de votre site (les
   codes livrés sont indicatifs ; affectation `AF` et contrat `CO` sont des
   exemples à remplacer).

## Déclaration de la page dans HRa Suite 9

Créez un item de menu (ou un lien de page guidée) de type **URL externe** :

```
http://<serveur-de-cette-page>:3000/?nudoss=[NUDOSS]
```

en substituant le numéro de dossier du salarié courant (ou
`?matricule=[MATCLE]` pour la clé fonctionnelle — la réglementation SOCCLE
est alors celle configurée côté connecteur). Sans paramètre, la page offre
un champ de recherche. En iframe dans Suite 9 : servir en HTTPS, domaine
autorisé par la politique de sécurité du portail.

## Sécurité — avant mise en production

- **Côté OpenHR** (impératif, cf. guide) : sécuriser les message senders
  `sensitive` (SSL) et `privilegied` (SSL2) — le mot de passe de connexion
  transite par le canal sensitive. Configuration dans
  `connector-java/conf/openhr.properties`, en accord avec le serveur OpenHR.
- Le connecteur utilise un **utilisateur réel + rôle** (confidentialité HRa
  appliquée côté serveur), jamais l'« utilisateur de session ».
- Identifiants uniquement via configuration locale / variables
  d'environnement — jamais commités.
- La page expose des données personnelles : placer serveur web et connecteur
  derrière l'authentification du SI (SSO du portail HRa), servir en HTTPS,
  et restreindre l'accès réseau au connecteur (il ne doit être joignable que
  du serveur web).
- L'API ne contrôle pas, à ce stade, que l'utilisateur connecté a le droit
  de voir le dossier demandé — à brancher sur votre SSO avant ouverture
  au-delà de la population RH.

## API du serveur web

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/collaborateur/:id` | Dossier par NUDOSS (`?cle=matricule` pour la clé fonctionnelle) |
| GET | `/api/sante` | État du serveur et mode (mock/réel) |
