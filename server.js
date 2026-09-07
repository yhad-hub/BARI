/**
 * Serveur de la page « Fiche collaborateur » consultable depuis HR Access Suite 9.
 *
 * - Sert la page web statique (public/)
 * - Expose l'API /api/collaborateur/:nudoss qui interroge OpenHR
 *
 * Depuis HRa Suite 9, la page est appelée en URL avec le dossier en paramètre :
 *   http://serveur-page:3000/?nudoss=00012345
 * (voir README.md pour la déclaration du lien dans le menu / la page guidée)
 */
const path = require('path');
const express = require('express');
const config = require('./config/openhr.config');
const { lireDossierCollaborateur } = require('./src/openhrClient');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// Un NUDOSS / matricule HRa est un identifiant court alphanumérique.
const NUDOSS_VALIDE = /^[A-Za-z0-9]{1,20}$/;

app.get('/api/collaborateur/:nudoss', async (req, res) => {
  const { nudoss } = req.params;

  if (!NUDOSS_VALIDE.test(nudoss)) {
    return res.status(400).json({ erreur: 'Numéro de dossier invalide.' });
  }

  try {
    const dossier = await lireDossierCollaborateur(nudoss);
    res.json(dossier);
  } catch (err) {
    console.error(`Échec de lecture du dossier ${nudoss} :`, err.message);
    res.status(502).json({
      erreur: 'Impossible de joindre OpenHR. Vérifiez la connexion au serveur HR Access.',
      detail: err.message
    });
  }
});

app.get('/api/sante', (_req, res) => {
  res.json({ statut: 'ok', mockMode: config.mockMode });
});

app.listen(config.serveur.port, () => {
  console.log(`Fiche collaborateur démarrée sur http://localhost:${config.serveur.port}`);
  console.log(`Mode mock : ${config.mockMode ? 'ACTIF (données de démonstration)' : 'inactif (appels OpenHR réels)'}`);
});
