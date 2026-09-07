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
const IDENTIFIANT_VALIDE = /^[A-Za-z0-9]{1,20}$/;

app.get('/api/collaborateur/:id', async (req, res) => {
  const { id } = req.params;
  const cle = req.query.cle === 'matricule' ? 'matricule' : 'nudoss';

  if (!IDENTIFIANT_VALIDE.test(id)) {
    return res.status(400).json({ erreur: 'Identifiant de dossier invalide.' });
  }

  try {
    const dossier = await lireDossierCollaborateur(cle, id);
    if (dossier === null) {
      return res.status(404).json({ erreur: 'Dossier introuvable (ou non visible du rôle utilisé).' });
    }
    res.json(dossier);
  } catch (err) {
    console.error(`Échec de lecture du dossier ${id} :`, err.message);
    res.status(502).json({
      erreur: 'Impossible de joindre le connecteur OpenHR. Vérifiez qu\'il est démarré et connecté au serveur HR Access.',
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
