package connecteur;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.Charset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

/**
 * Connecteur OpenHR : petit serveur HTTP qui expose le dossier collaborateur
 * HR Access en JSON, à destination de la page web Fiche collaborateur.
 *
 *   GET /collaborateur/{valeur}            -> lecture par NUDOSS
 *   GET /collaborateur/{valeur}?cle=matricule -> lecture par matricule
 *   GET /sante                             -> état du connecteur
 *
 * Lancement : java -cp "build:lib/*" connecteur.ConnecteurOpenHR conf/connecteur.properties
 *
 * En mode mock (mock=true), aucune classe OpenHR n'est requise : l'implémentation
 * réelle est chargée par réflexion uniquement quand mock=false, ce qui permet de
 * compiler et tester le connecteur sans les JARs OpenHR.
 */
public class ConnecteurOpenHR {

    private static final Charset UTF8 = Charset.forName("UTF-8");

    public static void main(String[] args) throws Exception {
        String cheminConf = args.length > 0 ? args[0] : "conf/connecteur.properties";
        final Properties conf = new Properties();
        InputStream flux = new FileInputStream(cheminConf);
        try {
            conf.load(flux);
        } finally {
            flux.close();
        }

        final boolean mock = Boolean.parseBoolean(conf.getProperty("mock", "true"));
        final ServiceDossier service;
        if (mock) {
            service = new ServiceDossierMock();
        } else {
            // Chargée par réflexion : compilable/exécutable seulement avec les JARs OpenHR dans lib/
            service = (ServiceDossier) Class.forName("connecteur.ServiceDossierOpenHR")
                    .getDeclaredConstructor().newInstance();
        }
        service.demarrer(conf);
        Runtime.getRuntime().addShutdownHook(new Thread() {
            public void run() {
                service.arreter();
            }
        });

        int port = Integer.parseInt(conf.getProperty("port", "8091"));
        HttpServer serveur = HttpServer.create(new InetSocketAddress(port), 0);

        serveur.createContext("/collaborateur/", new HttpHandler() {
            public void handle(HttpExchange echange) throws IOException {
                try {
                    String chemin = echange.getRequestURI().getPath();
                    String valeur = chemin.substring("/collaborateur/".length());
                    String requete = echange.getRequestURI().getQuery();
                    String cle = (requete != null && requete.contains("cle=matricule")) ? "matricule" : "nudoss";

                    if (!valeur.matches("[A-Za-z0-9]{1,20}")) {
                        repondre(echange, 400, "{\"erreur\":\"Identifiant de dossier invalide.\"}");
                        return;
                    }

                    Map dossier = service.lireDossier(cle, valeur);
                    if (dossier == null) {
                        repondre(echange, 404, "{\"erreur\":\"Dossier introuvable ou non visible du r\\u00f4le.\"}");
                    } else {
                        repondre(echange, 200, Json.versJson(dossier));
                    }
                } catch (Exception e) {
                    System.err.println("Erreur de lecture du dossier : " + e);
                    Map erreur = new LinkedHashMap();
                    erreur.put("erreur", "Échec de la lecture du dossier via OpenHR.");
                    erreur.put("detail", String.valueOf(e.getMessage()));
                    repondre(echange, 502, Json.versJson(erreur));
                }
            }
        });

        serveur.createContext("/sante", new HttpHandler() {
            public void handle(HttpExchange echange) throws IOException {
                repondre(echange, 200, "{\"statut\":\"ok\",\"mock\":" + mock + "}");
            }
        });

        serveur.start();
        System.out.println("Connecteur OpenHR démarré sur le port " + port
                + (mock ? " (mode MOCK : données fictives)" : " (connecté à OpenHR)"));
    }

    private static void repondre(HttpExchange echange, int statut, String corps) throws IOException {
        byte[] octets = corps.getBytes(UTF8);
        echange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        echange.sendResponseHeaders(statut, octets.length);
        OutputStream sortie = echange.getResponseBody();
        try {
            sortie.write(octets);
        } finally {
            sortie.close();
        }
    }
}
