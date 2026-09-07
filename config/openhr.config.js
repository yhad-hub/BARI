/**
 * Configuration de la connexion OpenHR (HR Access Suite 9).
 *
 * Toutes les valeurs peuvent être surchargées par variables d'environnement
 * (voir .env.example). Les noms de structures d'information (SI) et de
 * rubriques correspondent au dossier individuel standard HRa Suite 9 ;
 * adaptez-les au paramétrage de votre site (SI spécifiques, rubriques
 * personnalisées, etc.).
 */
module.exports = {
  // Mode simulation : true = pas d'appel réel à OpenHR, données de démonstration.
  // Indispensable pour développer hors du réseau où se trouve le serveur HR Access.
  mockMode: process.env.MOCK_MODE === 'true',

  openhr: {
    // URL du service OpenHR exposé par le serveur HR Access
    // (ex. http://serveur-hra:8080/openhr/services/OpenHRService)
    endpoint: process.env.OPENHR_ENDPOINT || 'http://localhost:8080/openhr/services/OpenHRService',

    // Identifiants techniques du compte de service autorisé à interroger OpenHR
    user: process.env.OPENHR_USER || '',
    password: process.env.OPENHR_PASSWORD || '',

    // Code population / rôle utilisé pour l'appel (selon paramétrage sécurité HRa)
    role: process.env.OPENHR_ROLE || '',

    // Timeout des appels SOAP en millisecondes
    timeoutMs: parseInt(process.env.OPENHR_TIMEOUT_MS || '15000', 10)
  },

  serveur: {
    port: parseInt(process.env.PORT || '3000', 10)
  },

  /**
   * Structures d'information du dossier individuel à interroger,
   * et correspondance rubrique HRa -> champ exposé à la page web.
   *
   * Clé   : code de la SI dans le dossier salarié HRa Suite 9
   * Valeur: { occurrence: 'premiere'|'toutes', champs: { RUBRIQUE: 'nomChamp' } }
   */
  structures: {
    // État civil
    ZY00: {
      occurrence: 'premiere',
      champs: {
        MATCLE: 'matricule',
        NOMUSE: 'nomUsuel',
        NOMPAT: 'nomPatronymique',
        PRENOM: 'prenom',
        DATNAI: 'dateNaissance',
        VILNAI: 'villeNaissance',
        NATION: 'nationalite',
        SEXOFF: 'sexe',
        SITFAM: 'situationFamiliale'
      }
    },
    // Adresse / coordonnées
    ZY3A: {
      occurrence: 'premiere',
      champs: {
        ADRES1: 'adresseLigne1',
        ADRES2: 'adresseLigne2',
        CODPOS: 'codePostal',
        VILLE: 'ville',
        PAYS: 'pays',
        TELDOM: 'telephone',
        ADRMEL: 'email'
      }
    },
    // Affectation
    ZYAF: {
      occurrence: 'premiere',
      champs: {
        SOCDOS: 'societe',
        ETABLI: 'etablissement',
        UNITEO: 'uniteOrganisationnelle',
        POSTES: 'poste',
        DATEFF: 'dateEffetAffectation'
      }
    },
    // Contrat
    ZYCO: {
      occurrence: 'premiere',
      champs: {
        TYPCON: 'typeContrat',
        DATDEB: 'dateDebutContrat',
        DATFIN: 'dateFinContrat',
        TEMPSX: 'tempsTravail',
        CLASSI: 'classification'
      }
    }
  }
};
