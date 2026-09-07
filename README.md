# Fiche collaborateur — HR Access Suite 9 / OpenHR

Page web affichant les informations d'un collaborateur (état civil, coordonnées,
affectation, contrat) à partir des données du dossier salarié HR Access Suite 9,
lues via une connexion **OpenHR** (web services SOAP).

La page est conçue pour être **appelée depuis HRa Suite 9** (lien de menu ou
page guidée) avec le numéro de dossier passé en paramètre d'URL.

## Architecture

```
HRa Suite 9 (navigateur)
   │  ouvre  /?nudoss=00012345
   ▼
Serveur Node.js (ce projet)
   │  GET /api/collaborateur/00012345
   ▼
OpenHR (SOAP, serveur HR Access)  ──►  dossier salarié (ZY00, ZY3A, ZYAF, ZYCO…)
```

- `public/` — la page web (HTML/CSS/JS, en français, sans framework)
- `server.js` — serveur Express : sert la page et expose l'API JSON
- `src/openhrClient.js` — client SOAP OpenHR (construction de l'enveloppe,
  appel, extraction des rubriques) + mode mock
- `config/openhr.config.js` — endpoint OpenHR, identifiants, et surtout la
  **correspondance structures/rubriques HRa → champs de la page**

## Démarrage rapide (sans serveur HR Access)

Prérequis : Node.js ≥ 18.

```bash
npm install
npm run dev        # démarre avec MOCK_MODE=true (données de démonstration)
```

Puis ouvrir <http://localhost:3000/?nudoss=00012345> — la fiche s'affiche avec
un dossier fictif. C'est le mode à utiliser pour développer la mise en page.

## Connexion à OpenHR (mode réel)

1. Copier `.env.example` en `.env` et renseigner :
   - `OPENHR_ENDPOINT` : l'URL du web service OpenHR de votre serveur HRa
     (voir le WSDL exposé par votre installation) ;
   - `OPENHR_USER` / `OPENHR_PASSWORD` : un compte de service autorisé à la
     lecture du dossier salarié ;
   - `OPENHR_ROLE` : le rôle/population selon le paramétrage sécurité du site ;
   - `MOCK_MODE=false`.
2. Adapter si besoin le gabarit SOAP dans `src/openhrClient.js`
   (`construireEnveloppe`) aux balises exactes du WSDL de votre version
   d'OpenHR — le parseur de réponse est volontairement tolérant sur
   l'habillage (recherche des nœuds `occurrence` et des rubriques en
   profondeur).
3. Adapter la table `structures` de `config/openhr.config.js` au dossier de
   votre site : codes de structures d'information (SI) et rubriques. Les
   valeurs livrées par défaut (ZY00 état civil, ZY3A adresse, ZYAF
   affectation, ZYCO contrat) correspondent au dossier standard et sont à
   ajuster selon votre paramétrage.
4. Démarrer : `npm start`.

## Déclaration de la page dans HRa Suite 9

Dans le paramétrage Suite 9, créez un item de menu (ou un lien dans une page
guidée) de type **URL externe** pointant vers :

```
http://<serveur-de-cette-page>:3000/?nudoss=[NUDOSS]
```

en substituant le numéro de dossier du salarié courant (variable de contexte
selon votre paramétrage : NUDOSS ou matricule). La page accepte aussi
`?matricule=...`. Sans paramètre, un champ de recherche permet de saisir le
matricule manuellement.

Si la page est intégrée en iframe dans Suite 9, servez-la en **HTTPS** et sur
un domaine autorisé par la politique de sécurité de votre portail.

## Sécurité — points d'attention avant mise en production

- Les identifiants OpenHR ne doivent jamais être commités : ils viennent de
  variables d'environnement (`.env` est ignoré par git).
- La page expose des données personnelles : placez le serveur derrière
  l'authentification de votre SI (reverse proxy SSO, même IdP que le portail
  HRa) et servez-la en HTTPS.
- L'API ne contrôle pas, à ce stade, que l'utilisateur connecté a le droit de
  voir le dossier demandé — à brancher sur votre SSO/habilitations HRa avant
  ouverture au-delà de la population RH.

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/collaborateur/:nudoss` | Dossier du collaborateur (JSON par sections) |
| GET | `/api/sante` | État du serveur et mode (mock/réel) |
