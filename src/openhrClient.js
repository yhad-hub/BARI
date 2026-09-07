/**
 * Client OpenHR : interroge le dossier individuel HR Access Suite 9
 * via les web services SOAP OpenHR (service de lecture d'occurrences).
 *
 * En mode mock (MOCK_MODE=true), renvoie un dossier de démonstration
 * sans appel réseau — pratique pour développer la page hors infrastructure HRa.
 */
const { XMLParser } = require('fast-xml-parser');
const config = require('../config/openhr.config');
const donneesDemo = require('./donneesDemo');

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true, // les réponses OpenHR sont fortement préfixées (soapenv, ns1…)
  parseTagValue: false
});

/**
 * Construit l'enveloppe SOAP d'une demande de lecture d'occurrences
 * pour une structure d'information du dossier salarié.
 *
 * Le format exact du message dépend de la version d'OpenHR déployée sur
 * votre site (WSDL exposé par le serveur HRa). Le gabarit ci-dessous
 * correspond au service de lecture standard « getOccurrences » ; ajustez
 * les espaces de noms/balises si votre WSDL diffère.
 */
function construireEnveloppe(nudoss, codeStructure, rubriques) {
  const listeRubriques = rubriques
    .map((r) => `        <rubrique>${r}</rubrique>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:open="http://www.hraccess.com/openhr">
  <soapenv:Header>
    <open:identification>
      <open:utilisateur>${config.openhr.user}</open:utilisateur>
      <open:motDePasse>${config.openhr.password}</open:motDePasse>
      <open:role>${config.openhr.role}</open:role>
    </open:identification>
  </soapenv:Header>
  <soapenv:Body>
    <open:getOccurrences>
      <open:dossier>${nudoss}</open:dossier>
      <open:structure>${codeStructure}</open:structure>
      <open:rubriques>
${listeRubriques}
      </open:rubriques>
    </open:getOccurrences>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/** Appelle OpenHR pour une structure d'information et renvoie la 1re occurrence. */
async function lireStructure(nudoss, codeStructure, defStructure) {
  const rubriques = Object.keys(defStructure.champs);
  const enveloppe = construireEnveloppe(nudoss, codeStructure, rubriques);

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), config.openhr.timeoutMs);

  let reponse;
  try {
    reponse = await fetch(config.openhr.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'getOccurrences'
      },
      body: enveloppe,
      signal: controleur.signal
    });
  } finally {
    clearTimeout(minuteur);
  }

  if (!reponse.ok) {
    throw new Error(`OpenHR a répondu HTTP ${reponse.status} pour la structure ${codeStructure}`);
  }

  const xml = await reponse.text();
  return extraireChamps(xml, codeStructure, defStructure);
}

/**
 * Extrait les rubriques de la réponse SOAP et les renomme selon la
 * correspondance rubrique HRa -> nom de champ de la config.
 */
function extraireChamps(xml, codeStructure, defStructure) {
  const doc = parser.parse(xml);

  const fault = doc?.Envelope?.Body?.Fault;
  if (fault) {
    const detail = fault.faultstring || fault.Reason?.Text || 'erreur SOAP inconnue';
    throw new Error(`Erreur OpenHR (${codeStructure}) : ${detail}`);
  }

  // Cherche récursivement le premier nœud « occurrence » de la réponse,
  // quel que soit l'habillage exact du WSDL du site.
  const occurrence = trouverNoeud(doc, 'occurrence');
  if (!occurrence) return {};

  const resultat = {};
  for (const [rubrique, nomChamp] of Object.entries(defStructure.champs)) {
    const valeur = trouverNoeud(occurrence, rubrique);
    if (valeur !== undefined && valeur !== null && typeof valeur !== 'object') {
      resultat[nomChamp] = String(valeur).trim();
    }
  }
  return resultat;
}

/** Recherche en profondeur la première valeur portée par une balise donnée. */
function trouverNoeud(noeud, nom) {
  if (noeud === null || typeof noeud !== 'object') return undefined;
  if (Array.isArray(noeud)) {
    for (const element of noeud) {
      const trouve = trouverNoeud(element, nom);
      if (trouve !== undefined) return trouve;
    }
    return undefined;
  }
  if (nom in noeud) return noeud[nom];
  for (const valeur of Object.values(noeud)) {
    const trouve = trouverNoeud(valeur, nom);
    if (trouve !== undefined) return trouve;
  }
  return undefined;
}

/**
 * Lit l'ensemble du dossier collaborateur : interroge chaque structure
 * d'information configurée et fusionne les champs obtenus par section.
 */
async function lireDossierCollaborateur(nudoss) {
  if (config.mockMode) {
    return donneesDemo(nudoss);
  }

  const sections = {};
  const erreurs = [];

  await Promise.all(
    Object.entries(config.structures).map(async ([code, def]) => {
      try {
        sections[code] = await lireStructure(nudoss, code, def);
      } catch (err) {
        erreurs.push({ structure: code, message: err.message });
        sections[code] = {};
      }
    })
  );

  return {
    nudoss,
    etatCivil: sections.ZY00 || {},
    coordonnees: sections.ZY3A || {},
    affectation: sections.ZYAF || {},
    contrat: sections.ZYCO || {},
    erreurs
  };
}

module.exports = { lireDossierCollaborateur };
