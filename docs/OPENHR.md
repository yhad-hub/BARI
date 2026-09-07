# OpenHR — synthèse du Guide du développeur et application au projet

Synthèse du **Guide du développeur OpenHR** (HRa Suite 9, réf.
`F OPENH 0900 3 GD XXX`, Sopra HR Software) : les concepts nécessaires pour
comprendre et faire évoluer le connecteur Java de ce projet
(`connector-java/`). Le guide complet et la **javadoc** livrée avec l'API
restent les références.

## 1. Ce qu'est OpenHR (et ce qu'il n'est pas)

OpenHR est une **API Java** (`com.hraccess.openhr`) livrée avec HR Access,
qui permet de créer des « applications clientes OpenHR » accédant en
lecture/écriture et en temps réel aux données du serveur HR Access, **en
réutilisant la logique fonctionnelle existante** (programmes COBOL) et la
**confidentialité** (rôles définis via Design Center).

Points structurants :

- Ce n'est **pas un web service SOAP/REST** : l'API communique avec le
  **serveur OpenHR** (application Java autonome, aussi appelée
  « dispatcher ») de manière synchrone **par sockets TCP**, avec un
  protocole propriétaire de messages texte. Le serveur OpenHR déclenche les
  programmes COBOL du serveur HR Access.
- L'API est **générique et pilotée par le modèle de données** (comme JDBC) :
  elle manipule n'importe quel dossier dès lors qu'elle dispose du modèle
  (le « dictionnaire »), construit à partir des processus déclarés.
- Conçue pour le **mode TP (temps réel)** : volumes raisonnables ; pour du
  volume, passer par le batch.

## 2. Concepts et objets principaux

| Concept HRa | Interface/Classe API | Rôle |
|---|---|---|
| Session | `IHRSession` (via `HRSessionFactory.createSession(Configuration)`) | Conversation de travail avec le serveur HRa ; **une par application**, connectée au démarrage (construction du dictionnaire = coûteux). Ne peut être reconnectée. |
| Dictionnaire | `IHRDictionary` | Référentiel local du modèle de données (structures, informations, rubriques, liens, types de dossier), construit depuis `session.process_list`, mis en cache (`*.dic`) et rafraîchi de façon différentielle. |
| Utilisateur | `IHRUser` (via `session.connectUser(login, motDePasse)`) | Connexion = session virtuelle côté serveur (table MX10) + résolution des rôles (MX20). Récupérable par `session.retrieveUser(vsesid)` (SSO natif). |
| Rôle | `IHRRole` (`user.getRole("MODELE(PARAM)")`) | Porte la **confidentialité** ; toute requête sur données applicatives est émise au titre d'un rôle. |
| Conversation | `IHRConversation` (`user.getMainConversation()`) | Requise par l'API ; n'a d'utilité réelle qu'avec des « informations paramètres » (ex. embauche). La conversation principale « 0000 » suffit en lecture. |
| Collection de dossiers | `HRDossierCollection` (+ `HRDossierCollectionParameters`, `HRDossierFactory`) | Le « DAO » : chargement (`loadDossier(nudoss)` / `loadDossier(HRKey)` / `loadDossiers(sql)`), création, clonage, commit. ⚠️ Charger un dossier **remplace** le précédent dans la collection. |
| Dossier | `HRDossier` | Arbre : dossier → informations (`HRDataSect`) → occurrences (`HROccur`) → rubriques. Identifié par clé technique (NUDOSS) ou fonctionnelle (arguments de tri de l'information 00, ex. SOCCLE+MATCLE). |
| Occurrence | `HROccur` | Lecture/écriture typée : `getString/getDate/getInteger...("RUBRIQUE")`, `getValues()` ; `setXxx` puis `dossier.commit()`. |
| BLOBs | `IHRBlob` (via `HROccur`) | Documents liés à une rubrique de rôle BLOB (tables BX10/BX20 ou volume d'archivage). |
| Extraction de données | `HRExtractionSource` / `HRTechnicalExtractionSource` / `HRExtractionTemplate` | Lecture SQL bas niveau (via COBOL BHS/BNP), en lecture seule ; mots-clés portables `<QB>`, `<QE>`, `<DAYDATE>`, `<USERLANG>`… |

## 3. Configuration de la session (`openhr.properties`)

Configuration minimale (Commons Configuration) :

```properties
session.languages=F,U            # 7.30.50+ (avant : session.language=F)
session.process_list=FS001       # processus "Gestion de dossiers", compilés
session.work_directory=/opt/connecteur-openhr/work
openhr_server.server=10.11.12.13
normal_message_sender.security=disabled
normal_message_sender.port=8800
sensitive_message_sender.security=disabled
sensitive_message_sender.port=8800
privilegied_message_sender.security=disabled
privilegied_message_sender.port=8800
```

Trois « message senders » selon la nature des messages, à sécuriser
différemment (voir §5). `openhr_server.timeout` fixe le délai des requêtes.
La liste complète des propriétés est au chapitre « La session » du guide.

## 4. Lecture d'un dossier — le cœur de notre connecteur

Mode opératoire (implémenté dans
`connector-java/src/connecteur/ServiceDossierOpenHR.java`) :

1. `HRApplication.configureLogs(log4j.properties)` puis
   `HRSessionFactory.getFactory().createSession(new PropertiesConfiguration("openhr.properties"))`.
2. `session.connectUser(utilisateur, motDePasse)` → `IHRUser`, puis
   `user.getRole("MODELE(PARAM)")`.
3. `HRDossierCollectionParameters` : `TYPE_NORMAL`, `setProcessName("FS001")`,
   `setDataStructureName("ZY")`, `addDataSection(new HRDataSourceParameters.DataSection("00"))`…
   ⚠️ Les informations lues doivent être **rattachées explicitement au
   processus**, lequel doit figurer dans `session.process_list`.
4. `new HRDossierCollection(parametres, user.getMainConversation(), role, new HRDossierFactory(TYPE_DOSSIER))`.
5. `collection.loadDossier(nudoss)` ou
   `collection.loadDossier(new HRKey(reglementation, matricule))` → `null` si
   la clé est invalide (ou dossier hors confidentialité du rôle).
6. `dossier.getDataSectionByName("10").getOccurs()` → itération sur les
   `HROccur`, `occur.getValues()` pour les valeurs de rubriques.

Paramétrage fin possible par information (`DataSection`) : restriction de
rubriques (`addItemName`), **filtre SQL** (`setSqlFilter("MOTIFA=<QB>RTT<QE>")`),
ordre inverse (`setReverseOrder`), **rubriques externes** (libellés de codes
réglementaires via `addExternal`, ex. libellé long ZD01 LIBLON), traitements
spécifiques.

Occurrences historisées : `getCurrentOccurs()` (en vigueur aujourd'hui),
`getCurrentOccurs(date)`, `getOccursInRange(debut, fin)` — utiles pour
n'afficher que l'affectation ou le contrat en vigueur.

## 5. Sécurité — points imposés par le guide

- **Utilisateur de session** (`session.getSessionUser()`) : accès **sans
  confidentialité** à toute la base ; fonctionnalité critique, réservée à des
  clients authentifiés en **SSL2** (mutuel). Notre connecteur ne l'utilise
  pas : utilisateur réel + rôle de consultation.
- **Natures de messages** et sécurisation en production :
  - `normal` : messages non sensibles — peut rester en clair ;
  - `sensitive` : la **connexion utilisateur véhicule un mot de passe** →
    **SSL** obligatoire en production ;
  - `privilegied` : utilisateur de session, topologie système (mots de passe
    FTP/JDBC) → **SSL2** obligatoire en production.
- La configuration du client doit correspondre à celle du **serveur OpenHR**
  (voir le Guide de gestion de la sécurité pour les certificats).
- Tables sensibles protégées côté serveur : UC10 (mots de passe → vue UC11),
  MX10/MX20/MX40/LO10 (identifiants de session virtuelle), EN30 (topologie).

## 6. Écriture (si la page devait un jour modifier des données)

- Modifications en mémoire (`occur.setXxx`, `createOccur`, `delete`) puis
  `dossier.commit()` → `ICommitResult` : erreurs **fonctionnelles** (poids
  1-5 : 1-2 avertissements, 3-4 avertissements avec confirmation —
  ignorables via `setIgnoreSeriousWarnings(true)`, 5 bloquantes) vs erreurs
  **techniques** (`HRDossierCollectionCommitException`).
- Modes de mise à jour : `NORMAL`, `SIMULATION` (transaction annulée),
  `NO_REPLY` (pas de resynchronisation → un seul commit possible).
- La transaction est bornée à **une requête serveur** (max 99 dossiers, une
  structure de données) : pas de transaction longue ni distribuée.
- Création de dossier avec paramètres (ex. embauche, information ZY3X) :
  mécanique de **double commit** via une conversation dédiée par thread.

## 7. Où trouver plus

- Le **Guide du développeur OpenHR** de votre version (portail support
  Sopra HR, index Suite 9) — source de cette synthèse.
- La **javadoc** livrée avec l'API (recommandée par le guide lui-même).
- Le **Guide de gestion de la sécurité** (Login Modules, certificats SSL) et
  le **Guide technique tous systèmes HR Design** (configuration du serveur
  OpenHR, ports, topologie).
- Le dictionnaire de données de votre site (Design Center) pour les codes
  exacts de sections et rubriques à reporter dans
  `config/openhr.config.js` et `connector-java/conf/connecteur.properties`.
