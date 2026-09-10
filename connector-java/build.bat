@echo off
rem Compile le connecteur OpenHR (Windows).
rem - Sans JAR dans lib\ : compile uniquement le mode mock.
rem - Avec les JARs OpenHR (et dependances) dans lib\ : compile aussi
rem   l'implementation reelle.
setlocal enabledelayedexpansion
cd /d "%~dp0"
if not exist build mkdir build

set "CP="
for %%j in (lib\*.jar) do set "CP=!CP!%%j;"

set "SRC=src\connecteur\Json.java src\connecteur\ServiceDossier.java src\connecteur\ServiceDossierMock.java src\connecteur\ConnecteurOpenHR.java"

if defined CP (
    echo JARs detectes dans lib\ : compilation avec l'implementation OpenHR reelle.
    set "SRC=!SRC! src\connecteur\ServiceDossierOpenHR.java"
) else (
    echo Aucun JAR dans lib\ : compilation en mode mock uniquement.
    set "CP=."
)

javac -encoding UTF-8 -cp "!CP!" -d build !SRC!
if errorlevel 1 (
    echo ECHEC de la compilation.
    exit /b 1
)
echo Compilation terminee. Lancement : run.bat
endlocal
