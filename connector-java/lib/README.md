# Librairies OpenHR

Déposez ici le JAR de l'API OpenHR **livré avec votre installation HR Access**
ainsi que ses dépendances (également livrées avec l'API) :

- `openhr-*.jar` (API `com.hraccess.openhr`)
- `commons-configuration-*.jar` (Apache Commons Configuration)
- `log4j-*.jar` (Jakarta Log4J)
- les autres JARs livrés avec l'API selon votre version

Ces librairies sont propriétaires (Sopra HR) et ne doivent **pas être
commitées** dans ce dépôt. Sans elles, `build.sh` compile le connecteur en
mode mock uniquement.
