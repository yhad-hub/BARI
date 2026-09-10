@echo off
rem Lance le connecteur OpenHR (Windows).
cd /d "%~dp0"
java -cp "build;lib\*" connecteur.ConnecteurOpenHR conf\connecteur.properties
