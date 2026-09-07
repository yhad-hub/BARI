/**
 * Page Fiche collaborateur.
 *
 * Appelée depuis HR Access Suite 9 avec le dossier en paramètre d'URL :
 *   /?nudoss=00012345   (ou ?matricule=00012345)
 * Sans paramètre, l'utilisateur saisit le matricule dans le formulaire.
 */
(function () {
  'use strict';

  var LIBELLES = {
    etatCivil: {
      nomUsuel: 'Nom usuel',
      nomPatronymique: 'Nom de naissance',
      prenom: 'Prénom',
      dateNaissance: 'Date de naissance',
      villeNaissance: 'Ville de naissance',
      nationalite: 'Nationalité',
      sexe: 'Sexe',
      situationFamiliale: 'Situation familiale'
    },
    coordonnees: {
      adresseLigne1: 'Adresse',
      adresseLigne2: 'Complément',
      codePostal: 'Code postal',
      ville: 'Ville',
      pays: 'Pays',
      telephone: 'Téléphone',
      email: 'Email'
    },
    affectation: {
      societe: 'Société',
      etablissement: 'Établissement',
      uniteOrganisationnelle: 'Unité organisationnelle',
      poste: 'Poste',
      dateEffetAffectation: "Date d'effet"
    },
    contrat: {
      typeContrat: 'Type de contrat',
      dateDebutContrat: 'Date de début',
      dateFinContrat: 'Date de fin',
      tempsTravail: 'Temps de travail',
      classification: 'Classification'
    }
  };

  var elements = {
    formulaire: document.getElementById('formulaire-recherche'),
    champNudoss: document.getElementById('champ-nudoss'),
    message: document.getElementById('message'),
    chargement: document.getElementById('chargement'),
    fiche: document.getElementById('fiche'),
    avertissements: document.getElementById('avertissements'),
    indicateurMode: document.getElementById('indicateur-mode')
  };

  function afficherErreur(texte) {
    elements.message.textContent = texte;
    elements.message.hidden = false;
    elements.fiche.hidden = true;
  }

  function formaterDate(valeur) {
    if (!valeur) return '';
    // Dates HRa au format AAAA-MM-JJ ou AAAAMMJJ -> JJ/MM/AAAA
    var m = String(valeur).match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : valeur;
  }

  function remplirSection(idSection, donnees, libelles) {
    var dl = document.getElementById('section-' + idSection);
    dl.textContent = '';
    var rempli = false;

    Object.keys(libelles).forEach(function (champ) {
      var valeur = donnees[champ];
      if (valeur === undefined || valeur === '') return;
      if (champ.indexOf('date') === 0 || champ.indexOf('Date') > 0) {
        valeur = formaterDate(valeur);
      }
      var ligne = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = libelles[champ];
      var dd = document.createElement('dd');
      dd.textContent = valeur;
      ligne.appendChild(dt);
      ligne.appendChild(dd);
      dl.appendChild(ligne);
      rempli = true;
    });

    if (!rempli) {
      var vide = document.createElement('div');
      var dt2 = document.createElement('dt');
      dt2.textContent = 'Aucune donnée disponible';
      vide.appendChild(dt2);
      dl.appendChild(vide);
    }
  }

  function afficherFiche(dossier) {
    var ec = dossier.etatCivil || {};
    var nomComplet = [ec.prenom, ec.nomUsuel].filter(Boolean).join(' ') || 'Collaborateur';

    document.getElementById('identite-nom').textContent = nomComplet;
    document.getElementById('identite-poste').textContent =
      (dossier.affectation && dossier.affectation.poste) || '';
    document.getElementById('identite-matricule').textContent =
      ec.matricule || dossier.nudoss || '';

    var initiales = ((ec.prenom || ' ')[0] + (ec.nomUsuel || ' ')[0]).trim().toUpperCase();
    document.getElementById('avatar-initiales').textContent = initiales || '–';

    remplirSection('etatCivil', ec, LIBELLES.etatCivil);
    remplirSection('coordonnees', dossier.coordonnees || {}, LIBELLES.coordonnees);
    remplirSection('affectation', dossier.affectation || {}, LIBELLES.affectation);
    remplirSection('contrat', dossier.contrat || {}, LIBELLES.contrat);

    if (dossier.erreurs && dossier.erreurs.length > 0) {
      elements.avertissements.textContent =
        'Certaines sections n’ont pas pu être lues depuis OpenHR : ' +
        dossier.erreurs.map(function (e) { return e.structure; }).join(', ');
      elements.avertissements.hidden = false;
    } else {
      elements.avertissements.hidden = true;
    }

    elements.message.hidden = true;
    elements.fiche.hidden = false;
  }

  function chargerDossier(identifiant, cle) {
    elements.message.hidden = true;
    elements.fiche.hidden = true;
    elements.chargement.hidden = false;

    fetch('/api/collaborateur/' + encodeURIComponent(identifiant)
        + (cle === 'matricule' ? '?cle=matricule' : ''))
      .then(function (reponse) {
        return reponse.json().then(function (corps) {
          if (!reponse.ok) {
            throw new Error(corps.erreur || 'Erreur lors de la lecture du dossier.');
          }
          return corps;
        });
      })
      .then(afficherFiche)
      .catch(function (err) {
        afficherErreur(err.message);
      })
      .finally(function () {
        elements.chargement.hidden = true;
      });
  }

  elements.formulaire.addEventListener('submit', function (evt) {
    evt.preventDefault();
    var nudoss = elements.champNudoss.value.trim();
    if (nudoss) chargerDossier(nudoss);
  });

  // Indicateur de mode (mock / réel) dans le pied de page
  fetch('/api/sante')
    .then(function (r) { return r.json(); })
    .then(function (sante) {
      elements.indicateurMode.textContent = sante.mockMode
        ? 'Mode démonstration : données fictives (MOCK_MODE actif)'
        : 'Connecté au serveur HR Access via OpenHR';
    })
    .catch(function () { /* pied de page facultatif */ });

  // Lecture automatique du dossier passé en paramètre par HRa Suite 9 :
  // ?nudoss=... (clé technique) ou ?matricule=... (clé fonctionnelle)
  var params = new URLSearchParams(window.location.search);
  if (params.get('nudoss')) {
    elements.champNudoss.value = params.get('nudoss');
    chargerDossier(params.get('nudoss'), 'nudoss');
  } else if (params.get('matricule')) {
    elements.champNudoss.value = params.get('matricule');
    chargerDossier(params.get('matricule'), 'matricule');
  }
})();
