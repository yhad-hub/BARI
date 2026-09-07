#!/bin/sh
# Compile le connecteur OpenHR.
# - Sans JAR dans lib/ : compile uniquement le mode mock (ServiceDossierOpenHR exclu).
# - Avec les JARs OpenHR (et dépendances : commons-configuration, log4j, ...)
#   dans lib/ : compile aussi l'implémentation réelle.
set -e
cd "$(dirname "$0")"
mkdir -p build

CP=$(ls lib/*.jar 2>/dev/null | tr '\n' ':')

SOURCES="src/connecteur/Json.java src/connecteur/ServiceDossier.java \
src/connecteur/ServiceDossierMock.java src/connecteur/ConnecteurOpenHR.java"

if [ -n "$CP" ]; then
    echo "JARs détectés dans lib/ : compilation avec l'implémentation OpenHR réelle."
    SOURCES="$SOURCES src/connecteur/ServiceDossierOpenHR.java"
else
    echo "Aucun JAR dans lib/ : compilation en mode mock uniquement."
fi

javac -encoding UTF-8 -cp "$CP" -d build $SOURCES
echo "Compilation terminée. Lancement :"
echo "  java -cp \"build:lib/*\" connecteur.ConnecteurOpenHR conf/connecteur.properties"
