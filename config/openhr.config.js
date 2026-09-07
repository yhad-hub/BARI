/**
 * Configuration du serveur web Fiche collaborateur.
 *
 * L'accès aux données HR Access passe par le connecteur Java OpenHR
 * (connector-java/) qui expose le dossier en JSON. Ce fichier définit :
 *  - l'URL du connecteur ;
 *  - la correspondance entre les informations/rubriques du dossier salarié
 *    (structure ZY) et les champs affichés par la page.
 *
 * Les codes de sections et rubriques ci-dessous correspondent au dossier
 * standard HRa Suite 9 à titre indicatif — ADAPTEZ-LES au dictionnaire de
 * votre site (la liste des sections lues se règle aussi côté connecteur,
 * propriété openhr.sections). Une section absente ou vide laisse simplement
 * le champ vide.
 */
module.exports = {
  // Mode simulation : true = dossier fictif sans appel au connecteur.
  mockMode: process.env.MOCK_MODE === 'true',

  // URL du connecteur Java OpenHR
  connecteur: {
    url: process.env.CONNECTOR_URL || 'http://localhost:8091',
    timeoutMs: parseInt(process.env.CONNECTOR_TIMEOUT_MS || '15000', 10)
  },

  serveur: {
    port: parseInt(process.env.PORT || '3000', 10)
  },

  /**
   * Correspondance sections/rubriques HRa -> champs de la page, par groupe
   * d'affichage. Chaque groupe agrège une ou plusieurs sections ; la première
   * occurrence de chaque section est utilisée.
   */
  groupes: {
    etatCivil: [
      { section: '00', champs: { MATCLE: 'matricule' } },
      { section: '07', champs: { NOMUSE: 'nomUsuel', NOMPAT: 'nomPatronymique', PRENOM: 'prenom' } },
      { section: '10', champs: { DATNAI: 'dateNaissance', VILNAI: 'villeNaissance' } },
      { section: '12', champs: { NATION: 'nationalite' } }
    ],
    coordonnees: [
      // ZY0F (Adresses) : ZONADA est redéfinie par pays (ZONAFR...) selon le site
      { section: '0F', champs: { ZONADA: 'adresseLigne1', CDPOST: 'codePostal', VILLE: 'ville', PAYS: 'pays' } }
    ],
    affectation: [
      // Codes à adapter : section d'affectation de votre dossier (société,
      // établissement, unité organisationnelle, poste...)
      { section: 'AF', champs: { SOCDOS: 'societe', ETABLI: 'etablissement', UNITEO: 'uniteOrganisationnelle', POSTES: 'poste', DATEFF: 'dateEffetAffectation' } }
    ],
    contrat: [
      // Codes à adapter : section contrat de votre dossier
      { section: 'CO', champs: { TYPCON: 'typeContrat', DATDEB: 'dateDebutContrat', DATFIN: 'dateFinContrat', TEMPSX: 'tempsTravail', CLASSI: 'classification' } }
    ]
  }
};
