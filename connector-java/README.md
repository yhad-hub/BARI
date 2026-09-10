# Connecteur OpenHR (Java)

Service HTTP qui lit le dossier collaborateur HR Access via l'**API Java
OpenHR** (protocole propriétaire sur sockets TCP — voir `docs/OPENHR.md` à la
racine du dépôt) et l'expose en JSON pour la page web Fiche collaborateur.

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/collaborateur/{nudoss}` | Dossier par clé technique (NUDOSS) |
| GET | `/collaborateur/{matricule}?cle=matricule` | Dossier par clé fonctionnelle (réglementation configurée + matricule) |
| GET | `/sante` | État du connecteur |

Réponse (200) :

```json
{
  "nudoss": 1000,
  "reglementation": "HRA",
  "sections": {
    "00": [ { "SOCCLE": "HRA", "MATCLE": "123456" } ],
    "07": [ { "NOMUSE": "MARTIN", "PRENOM": "Sophie" } ]
  }
}
```

Chaque section contient la liste de ses occurrences (rubrique → valeur). La
correspondance rubriques → champs de la page est faite côté serveur Node
(`config/openhr.config.js`).

## Compilation et lancement

Prérequis : JDK 8 ou supérieur.

```bash
# Linux / Unix
./build.sh                   # sans lib/ : mode mock seulement
./run.sh

# Windows
build.bat
run.bat

# Test
curl http://localhost:8091/collaborateur/00012345
```

## Passage en mode réel

1. Déposer les JARs OpenHR livrés avec votre installation dans `lib/`
   (voir `lib/README.md`) puis relancer `./build.sh`.
2. Renseigner `conf/openhr.properties` (serveur OpenHR, ports des message
   senders, répertoire de travail — créez-le) d'après la topologie de votre
   site ; en production, activer la sécurisation SSL décrite dans le fichier.
3. Renseigner `conf/connecteur.properties` : `mock=false`, utilisateur de
   service + mot de passe + rôle (forme canonique `MODELE(PARAM)`),
   processus (par défaut `FS001`), réglementation, et la liste des sections
   à lire (rattachées explicitement au processus, sinon elles seront vides).
4. Relancer le connecteur puis le serveur Node avec `MOCK_MODE=false`.

## Points de conception (issus du Guide du développeur OpenHR)

- **Une seule session OpenHR** pour l'application, connectée au démarrage
  (l'ouverture construit le dictionnaire, opération coûteuse).
- **Utilisateur réel + rôle**, pas l'« utilisateur de session » : ce dernier
  court-circuite la confidentialité et exige une sécurisation SSL2 — inutile
  ici puisqu'on ne fait que consulter.
- **Une collection de dossiers par requête** : le chargement d'un dossier
  remplace le précédent dans une collection, elle ne se partage donc pas
  entre requêtes concurrentes.
- Lecture seule : aucun `commit()` n'est jamais émis.
- **Reconnexion automatique** : une session/connexion utilisateur fermée ne
  pouvant être rouverte, le connecteur en recrée une à la requête suivante
  si la précédente est tombée (redémarrage du serveur OpenHR, coupure...).
