@echo off
rem Diagnostic de mise en service du connecteur OpenHR (Windows).
rem Lancez-le sur la machine cible et collez la sortie complete dans la
rem conversation avec Claude : aucun secret n'est affiche.
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ===== DIAGNOSTIC CONNECTEUR OPENHR =====
echo --- Date : %date% %time%
ver

echo --- Java :
java -version 2>&1
javac -version 2>&1

echo --- Reseau vers le serveur OpenHR (10.128.38.8:8192) :
powershell -NoProfile -Command "(Test-NetConnection 10.128.38.8 -Port 8192 -WarningAction SilentlyContinue).TcpTestSucceeded"

echo --- JARs presents dans lib\ :
dir /b lib\*.jar 2>nul || echo (aucun JAR : mode mock uniquement)

echo --- Configuration (sans secrets) :
findstr /r "^port ^mock ^openhr\.processus ^openhr\.structure ^openhr\.reglementation ^openhr\.sections ^openhr\.role" conf\connecteur.properties
findstr /r "^session\. ^openhr_server\. _message_sender\.security _message_sender\.port" conf\openhr.properties | findstr /v password | findstr /v motdepasse

echo --- Compilation :
call build.bat

echo --- Demarrage :
start "connecteur" /b cmd /c "java -cp "build;lib\*" connecteur.ConnecteurOpenHR conf\connecteur.properties > %TEMP%\diag-connecteur.log 2>&1"
timeout /t 8 /nobreak >nul
echo --- /sante :
curl -s --max-time 5 http://localhost:8091/sante
echo.
echo --- Lecture du dossier de test (matricule MMA01090) :
curl -s --max-time 20 "http://localhost:8091/collaborateur/MMA01090?cle=matricule"
echo.
rem Arret du seul processus java du connecteur (surtout pas de tous les java.exe !)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" | Where-Object { $_.CommandLine -like '*ConnecteurOpenHR*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo --- Log du connecteur :
type "%TEMP%\diag-connecteur.log"
echo ===== FIN DU DIAGNOSTIC =====
endlocal
