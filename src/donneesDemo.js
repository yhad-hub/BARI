/**
 * Dossier collaborateur de démonstration, renvoyé en mode mock
 * (MOCK_MODE=true). La forme est identique à celle produite par
 * lireDossierCollaborateur() après un appel OpenHR réel.
 */
module.exports = function donneesDemo(nudoss) {
  return {
    nudoss,
    etatCivil: {
      matricule: nudoss,
      nomUsuel: 'MARTIN',
      nomPatronymique: 'MARTIN',
      prenom: 'Sophie',
      dateNaissance: '1988-04-12',
      villeNaissance: 'Lyon',
      nationalite: 'Française',
      sexe: 'F',
      situationFamiliale: 'Mariée'
    },
    coordonnees: {
      adresseLigne1: '12 rue de la République',
      adresseLigne2: 'Bâtiment B, Apt 34',
      codePostal: '69002',
      ville: 'Lyon',
      pays: 'France',
      telephone: '+33 6 12 34 56 78',
      email: 'sophie.martin@exemple.fr'
    },
    affectation: {
      societe: 'S001 - Société Exemple',
      etablissement: 'ET01 - Siège Lyon',
      uniteOrganisationnelle: 'DSI / Études & Développement',
      poste: 'Analyste développeur',
      dateEffetAffectation: '2021-09-01'
    },
    contrat: {
      typeContrat: 'CDI',
      dateDebutContrat: '2015-03-16',
      dateFinContrat: '',
      tempsTravail: 'Temps plein (100 %)',
      classification: 'Cadre - Position 2.2'
    },
    erreurs: []
  };
};
