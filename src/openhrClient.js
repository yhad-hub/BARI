/**
 * Client du connecteur Java OpenHR : récupère le dossier collaborateur en
 * JSON (sections/occurrences/rubriques) et le transpose vers les champs de
 * la page selon la correspondance définie dans config/openhr.config.js.
 *
 * En mode mock (MOCK_MODE=true), renvoie un dossier de démonstration sans
 * appel réseau — pratique pour développer la page hors infrastructure HRa.
 */
const config = require('../config/openhr.config');
const donneesDemo = require('./donneesDemo');

/** Appelle le connecteur et renvoie le dossier brut (sections/occurrences). */
async function appelerConnecteur(cle, valeur) {
  const url = `${config.connecteur.url}/collaborateur/${encodeURIComponent(valeur)}`
    + (cle === 'matricule' ? '?cle=matricule' : '');

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), config.connecteur.timeoutMs);

  let reponse;
  try {
    reponse = await fetch(url, { signal: controleur.signal });
  } finally {
    clearTimeout(minuteur);
  }

  const corps = await reponse.json().catch(() => ({}));
  if (reponse.status === 404) {
    return null;
  }
  if (!reponse.ok) {
    throw new Error(corps.erreur || `Le connecteur OpenHR a répondu HTTP ${reponse.status}`);
  }
  return corps;
}

/**
 * Transpose les sections brutes vers un groupe de la page : pour chaque
 * section du groupe, prend la première occurrence et renomme les rubriques.
 */
function transposerGroupe(sections, definitionGroupe) {
  const resultat = {};
  const sectionsManquantes = [];

  for (const { section, champs } of definitionGroupe) {
    const occurrences = sections[section];
    if (!Array.isArray(occurrences) || occurrences.length === 0) {
      sectionsManquantes.push(section);
      continue;
    }
    const occurrence = occurrences[0];
    for (const [rubrique, nomChamp] of Object.entries(champs)) {
      const valeur = occurrence[rubrique];
      if (valeur !== undefined && valeur !== null && String(valeur).trim() !== '') {
        resultat[nomChamp] = String(valeur).trim();
      }
    }
  }
  return { resultat, sectionsManquantes };
}

/**
 * Lit le dossier collaborateur et le renvoie sous la forme attendue par la
 * page (etatCivil / coordonnees / affectation / contrat).
 *
 * @param cle    'nudoss' ou 'matricule'
 * @param valeur valeur de la clé
 * @returns le dossier transposé, ou null si le dossier n'existe pas
 */
async function lireDossierCollaborateur(cle, valeur) {
  if (config.mockMode) {
    return donneesDemo(valeur);
  }

  const brut = await appelerConnecteur(cle, valeur);
  if (brut === null) return null;

  const sections = brut.sections || {};
  const dossier = { nudoss: brut.nudoss, erreurs: [] };
  const manquantes = new Set();

  for (const [groupe, definition] of Object.entries(config.groupes)) {
    const { resultat, sectionsManquantes } = transposerGroupe(sections, definition);
    dossier[groupe] = resultat;
    sectionsManquantes.forEach((s) => manquantes.add(s));
  }

  if (manquantes.size > 0) {
    dossier.erreurs = [...manquantes].map((s) => ({
      structure: s,
      message: `Section ${s} absente ou vide (vérifiez openhr.sections côté connecteur et le rattachement au processus)`
    }));
  }
  return dossier;
}

module.exports = { lireDossierCollaborateur };
