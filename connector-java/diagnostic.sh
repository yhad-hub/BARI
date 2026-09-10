#!/bin/sh
# Diagnostic de mise en service du connecteur OpenHR (Linux/Unix).
# Lancez-le sur la machine cible et collez la sortie complète dans la
# conversation avec Claude : aucun secret n'est affiché.
cd "$(dirname "$0")"
echo "===== DIAGNOSTIC CONNECTEUR OPENHR ====="
echo "--- Date : $(date)"
echo "--- OS : $(uname -a 2>/dev/null)"

echo "--- Java :"
java -version 2>&1 | head -3
javac -version 2>&1 | head -1

echo "--- Reseau vers le serveur OpenHR (10.128.38.8:8192) :"
if command -v nc >/dev/null 2>&1; then
    nc -vz -w 5 10.128.38.8 8192 2>&1
else
    (exec 3<>/dev/tcp/10.128.38.8/8192) 2>&1 && echo "Port 8192 JOIGNABLE" || echo "Port 8192 INJOIGNABLE"
fi

echo "--- JARs presents dans lib/ :"
ls -1 lib/*.jar 2>/dev/null || echo "(aucun JAR : mode mock uniquement)"

echo "--- Configuration (sans secrets) :"
grep -E "^(port|mock|openhr\.(processus|structure|reglementation|sections|role))" conf/connecteur.properties 2>/dev/null
grep -E "^(session\.(languages|process_list|work_directory)|openhr_server\.|[a-z]+_message_sender\.(security|port))" conf/openhr.properties 2>/dev/null
WORKDIR=$(grep -E "^session.work_directory" conf/openhr.properties 2>/dev/null | cut -d= -f2)
[ -n "$WORKDIR" ] && { [ -d "$WORKDIR" ] && echo "Repertoire de travail OK : $WORKDIR" || echo "ATTENTION : repertoire de travail INEXISTANT : $WORKDIR"; }
UTIL=$(grep -E "^openhr.utilisateur=" conf/connecteur.properties | cut -d= -f2)
MDP=$(grep -E "^openhr.motdepasse=" conf/connecteur.properties | cut -d= -f2)
[ -n "$UTIL" ] && echo "openhr.utilisateur : renseigne" || echo "openhr.utilisateur : VIDE"
[ -n "$MDP" ] && echo "openhr.motdepasse : renseigne" || echo "openhr.motdepasse : VIDE"

echo "--- Compilation :"
./build.sh 2>&1 | grep -v "^Picked up"

echo "--- Demarrage (20 s max) :"
java -cp "build:lib/*" connecteur.ConnecteurOpenHR conf/connecteur.properties > /tmp/diag-connecteur.log 2>&1 &
PID=$!
sleep 8
echo "--- /sante :"
curl -s --max-time 5 http://localhost:8091/sante 2>&1 || echo "(connecteur injoignable sur le port 8091)"
echo ""
echo "--- Lecture du dossier de test (matricule MMA01090) :"
curl -s --max-time 20 "http://localhost:8091/collaborateur/MMA01090?cle=matricule" 2>&1 | head -c 2000
echo ""
kill $PID 2>/dev/null
echo "--- Log du connecteur (100 dernieres lignes) :"
tail -100 /tmp/diag-connecteur.log
echo "===== FIN DU DIAGNOSTIC ====="
