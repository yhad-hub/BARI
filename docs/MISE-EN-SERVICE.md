# Mise en service — checklist et dépannage

Guide pas à pas pour brancher la Fiche collaborateur sur votre HR Access
Suite 9, depuis une machine du réseau où le serveur OpenHR
(`10.128.38.8:8192`) est joignable.

## Prérequis

- [ ] **JDK 8+** (`java -version`, `javac -version`) et **Node.js ≥ 18** (`node -v`)
- [ ] Accès réseau au serveur OpenHR : `Test-NetConnection 10.128.38.8 -Port 8192`
      (PowerShell) ou `nc -vz 10.128.38.8 8192` (Linux)
- [ ] Les **JARs de l'API OpenHR** livrés avec votre installation HRa
      (API + commons-configuration + log4j…) — voir `connector-java/lib/README.md`
- [ ] Un **compte de service HRa** (identifiant + mot de passe) qui se voit
      attribuer à la connexion le rôle `EMPLOYEE(MMA01090)` (paramétré dans
      `conf/connecteur.properties`)
- [ ] Le processus **FS001** (ou celui configuré) : qualification « Gestion
      de dossiers », déclaré au niveau de la plate-forme physique, **compilé**,
      et les sections lues (`openhr.sections`) **rattachées explicitement** à
      ce processus

## Étape 1 — Récupérer le code

```bash
git clone https://github.com/yhad-hub/BARI.git
cd BARI
```

## Étape 2 — Compiler et valider le connecteur en mode mock

```bash
cd connector-java
./build.sh          # Windows : build.bat
./run.sh            # Windows : run.bat
# Dans un autre terminal :
curl http://localhost:8091/sante          # attendu : {"statut":"ok","mock":true}
curl http://localhost:8091/collaborateur/1000
```

## Étape 3 — Passer le connecteur en mode réel

1. Copier les JARs OpenHR dans `connector-java/lib/` puis **recompiler**
   (`build.sh` / `build.bat` — il doit afficher « compilation avec
   l'implémentation OpenHR réelle »).
2. `conf/openhr.properties` : vérifier `openhr_server.server=10.128.38.8`,
   les ports des message senders (8192), et **créer le répertoire** de
   `session.work_directory` (adapter le chemin sous Windows, ex.
   `C:/connecteur-openhr/work`).
3. `conf/connecteur.properties` : `mock=false`, `openhr.utilisateur`,
   `openhr.motdepasse` (ne jamais commiter ce fichier renseigné).
4. Relancer et tester avec le dossier visible du rôle :
   ```bash
   curl "http://localhost:8091/collaborateur/MMA01090?cle=matricule"
   ```
   Au premier démarrage, la construction du dictionnaire peut prendre du
   temps ; le fichier `*.dic` mis en cache dans le répertoire de travail
   accélère les démarrages suivants.

## Étape 4 — Brancher la page web

```bash
cd ..                       # racine du dépôt
npm install
cp .env.example .env        # MOCK_MODE=false, CONNECTOR_URL=http://localhost:8091
MOCK_MODE=false npm start
```

Ouvrir `http://localhost:3000/?matricule=MMA01090` : la fiche doit
s'afficher. Ajuster ensuite les codes de sections/rubriques
(`config/openhr.config.js` + `openhr.sections` du connecteur) d'après le
dictionnaire de votre site — en particulier **affectation** et **contrat**
(placeholders `AF`/`CO` à remplacer).

## Étape 5 — Déclarer la page dans HRa Suite 9

Item de menu ou lien de page guidée de type URL externe :
`http://<serveur-page>:3000/?nudoss=[NUDOSS]` (ou `?matricule=[MATCLE]`).

## Dépannage

| Symptôme | Cause probable | Correction |
|---|---|---|
| Le connecteur ne démarre pas : timeout / connexion refusée à la création de session | Serveur OpenHR injoignable (IP/port, pare-feu) ou nature de message sur un autre port | Vérifier l'accès réseau ; demander à l'exploitation les ports réels des trois natures de messages (normal/sensitive/privilegied) et l'état du serveur OpenHR (console HRaSpace) |
| Erreur SSL à la connexion | Le serveur OpenHR exige SSL/SSL2 sur certains canaux | Aligner `*_message_sender.security` et les keystores dans `openhr.properties` sur la configuration du serveur (Guide de gestion de la sécurité) |
| Erreur sur `session.process_list` / processus inconnu | FS001 absent, non compilé, ou pas de qualification « Gestion de dossiers » | Faire déclarer/compiler le processus, ou configurer un processus GD existant du site (`openhr.processus` + `session.process_list`) |
| `AuthenticationException` à la connexion utilisateur | Identifiant/mot de passe invalides (UC10 ou Login Module) | Vérifier le compte de service ; si le site utilise un Login Module spécifique, renseigner `session.login_module_hint` dans `openhr.properties` |
| « L'utilisateur de service ne possède pas le rôle <EMPLOYEE(MMA01090)> » | Le rôle n'est pas attribué à ce compte à la connexion | Attribution explicite (UC15) ou via le traitement de résolution des rôles ; vérifier la forme canonique exacte |
| `404 Dossier introuvable ou non visible du rôle` | NUDOSS/matricule inexistant, mauvaise réglementation (`openhr.reglementation` ≠ SOCCLE du dossier), ou confidentialité du rôle | Tester avec le dossier du rôle (`MMA01090`) ; vérifier SOCCLE ; pour consulter d'autres dossiers, utiliser un rôle RH au périmètre plus large |
| Sections vides + avertissement « Section X absente ou vide » sur la page | Section non rattachée explicitement au processus, ou code de section inexistant sur votre site | Rattacher l'information au processus (puis recompiler le processus) ou corriger les codes dans `openhr.sections` et `config/openhr.config.js` |
| Erreurs système aléatoires après une modification Design Center | Dictionnaire local déphasé | Supprimer le fichier `*.dic` du répertoire de travail et redémarrer le connecteur (reconstruction du dictionnaire) |
| Caractères accentués altérés dans les valeurs | Page de code des messages différente entre client et serveur | Renseigner `openhr_server.encoding` dans `openhr.properties` avec la page de code du serveur OpenHR |
| Premier appel très lent | Construction initiale du dictionnaire | Normal ; les démarrages suivants réutilisent le cache `*.dic` |

Pour diagnostiquer finement : passer `log4j.rootCategory=DEBUG, A1` dans
`connector-java/conf/log4j.properties` (échanges de messages visibles), et
côté serveur, la politique de log d'OpenHR Server est modifiable à chaud via
la console `hr-admin-console` si la fonction y est déclarée.
