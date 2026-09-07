# Documentation OpenHR — guide pratique pour ce projet

OpenHR est la couche d'API d'**HR Access Suite 9** (Sopra HR Software). C'est
un composant serveur (service Java, répertoire `$SIGACS/openhr` sur le serveur
HRa) qui expose le dossier salarié et les traitements HRa aux applications
tierces, notamment sous forme de **web services SOAP**, avec la sécurité et
les habilitations du SIRH appliquées côté serveur — c'est ce qui en fait le
point d'entrée recommandé pour une page comme la nôtre, plutôt qu'un accès
SQL direct à la base.

> ⚠️ La documentation technique OpenHR est **propriétaire** : elle n'est pas
> publiée sur le web. Elle est livrée avec le produit et disponible sur le
> portail support Sopra HR. Ce guide indique où la trouver et comment se
> débrouiller en attendant avec le WSDL de votre propre serveur.

## 1. Où trouver la documentation officielle

| Source | Contenu | Accès |
|---|---|---|
| **Portail support Sopra HR** (`support.hraccess.com`, espace client Sopra HR) | Index documentaire Suite 9 (référence `H91Xxxxx`), dont le **Guide OpenHR** (fonctionnement et usage de l'API) et les guides d'interopérabilité/web services | Compte client Sopra HR requis — voir votre administrateur SIRH ou votre contact Sopra HR |
| **Livraison produit sur le serveur HRa** | Le répertoire d'installation (`$SIGACS/openhr`, et la documentation livrée avec la Suite) contient la configuration (`conf/dispatcher.properties`…) et souvent les guides PDF | Équipe d'exploitation HRa |
| **WSDL exposé par votre serveur** | La **référence exacte** des opérations, messages et types disponibles sur *votre* installation (versions et paramétrages varient d'un site à l'autre) | Voir §2 |
| **Formations Sopra HR** | Le [catalogue de formation Sopra HR](https://www.soprasteria.com/docs/librariesprovider2/sopra-hr-documents/formation/2024---formations/catalogue-hra-formation-2024-_vf_120124.pdf) et la plateforme eLearning incluent des modules interopérabilité/développement | Via votre société |
| **Blog communautaire « HR Access … and Me »** | Retours d'expérience d'exploitation d'OpenHR (console HRaSpace, logs, montées de version Java) — utile pour l'administration, pas une référence d'API | [hraccessandme.blogspot.com](http://hraccessandme.blogspot.com/2011/03/ajouter-openhr-la-console-hraspace.html) |

Ce qu'il faut demander à votre contact Sopra HR ou à l'équipe SIRH :
- le **Guide OpenHR** de votre version de la Suite 9 ;
- le **guide des web services / interopérabilité** ;
- le **dictionnaire de données** du dossier salarié de votre site (structures
  d'information et rubriques réellement déployées, y compris les spécifiques).

## 2. Récupérer le WSDL sur votre serveur (la référence pratique)

Le contrat exact du service est décrit par le WSDL exposé par votre serveur
OpenHR. Depuis une machine du réseau où tourne HRa :

```bash
# L'URL exacte dépend de votre topologie (port, contexte) — demandez-la à
# l'exploitation, ou repérez le contexte openhr dans la console HRaSpace.
curl -s "http://<serveur-hra>:<port>/<contexte-openhr>/services?wsdl"
```

Le WSDL vous donne, pour votre installation :
- l'**URL d'endpoint** à mettre dans `OPENHR_ENDPOINT` (fichier `.env`) ;
- les **noms exacts des opérations** de lecture du dossier (lecture
  d'occurrences d'une structure d'information) et leurs espaces de noms ;
- la **forme des messages** (balises d'identification, de dossier, de
  structure, de rubriques).

Pour explorer et tester les appels sans coder, importez ce WSDL dans
[SoapUI](https://www.soapui.org/) : il génère automatiquement des requêtes
d'exemple pour chaque opération.

## 3. Adapter ce projet à votre WSDL

Une fois le WSDL en main, trois choses à ajuster ici :

1. **`.env`** — `OPENHR_ENDPOINT`, `OPENHR_USER`, `OPENHR_PASSWORD`,
   `OPENHR_ROLE` (compte de service et rôle selon le paramétrage sécurité de
   votre site), puis `MOCK_MODE=false`.
2. **`src/openhrClient.js` → `construireEnveloppe()`** — le gabarit SOAP
   livré est générique ; alignez les balises et espaces de noms sur ceux du
   WSDL de votre site. Le parseur de réponse est tolérant (recherche en
   profondeur des nœuds `occurrence` et des rubriques), mais si vos réponses
   utilisent d'autres noms de balises, adaptez `extraireChamps()`.
3. **`config/openhr.config.js` → `structures`** — remplacez les codes de
   structures d'information et de rubriques par ceux de votre dossier
   salarié (le dictionnaire de données de votre site fait foi ; les SI
   peuvent être standard ou spécifiques selon le paramétrage).

## 4. Tester la connexion pas à pas

```bash
# 1. Le serveur OpenHR répond-il ? (depuis le réseau HRa)
curl -s -o /dev/null -w "%{http_code}\n" "http://<serveur-hra>:<port>/<contexte-openhr>/services?wsdl"

# 2. Un appel SOAP manuel (adapter l'enveloppe à votre WSDL)
curl -s -X POST "http://<serveur-hra>:<port>/<contexte-openhr>/services/..." \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H "SOAPAction: ..." \
  --data-binary @requete.xml

# 3. Puis via ce projet
MOCK_MODE=false npm start
curl -s "http://localhost:3000/api/collaborateur/<NUDOSS>"
```

En cas d'échec, regardez les **logs OpenHR côté serveur HRa** : la politique
de log (INFO/DEBUG) peut être modifiée à chaud via la console d'administration
(`hr-admin-console`) si OpenHR y a été déclaré (fonction OpenHR dans la
topologie + `global.names` dans `$SIGACS/openhr/conf/dispatcher.properties`).

## 5. Notions HRa utiles pour lire la documentation

- **NUDOSS** : identifiant technique interne du dossier salarié (attribué par
  séquence base de données depuis la V7). C'est le paramètre que notre page
  reçoit dans l'URL (`?nudoss=...`).
- **Matricule (MATCLE)** : identifiant « métier » du salarié, porté par le
  dossier.
- **Structures d'information (SI)** : blocs de données du dossier salarié
  (état civil, adresse, affectation, contrat…), composés de **rubriques**
  (champs) et porteurs d'**occurrences** (éventuellement historisées par
  date d'effet). Les codes exacts dépendent du paramétrage du site — d'où la
  table de correspondance dans `config/openhr.config.js`.
- **Rôle / population** : le compte utilisé pour l'appel OpenHR détermine ce
  que le service accepte de renvoyer (habilitations HRa appliquées côté
  serveur).
