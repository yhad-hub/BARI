#!/bin/sh
# Lance le connecteur OpenHR (Linux/Unix).
cd "$(dirname "$0")"
exec java -cp "build:lib/*" connecteur.ConnecteurOpenHR conf/connecteur.properties
