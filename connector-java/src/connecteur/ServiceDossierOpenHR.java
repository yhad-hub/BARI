package connecteur;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.StringTokenizer;

import org.apache.commons.configuration.PropertiesConfiguration;

import com.hraccess.openhr.HRApplication;
import com.hraccess.openhr.HRSessionFactory;
import com.hraccess.openhr.IHRRole;
import com.hraccess.openhr.IHRSession;
import com.hraccess.openhr.IHRUser;
import com.hraccess.openhr.beans.HRDataSourceParameters;
import com.hraccess.openhr.dossier.HRDataSect;
import com.hraccess.openhr.dossier.HRDossier;
import com.hraccess.openhr.dossier.HRDossierCollection;
import com.hraccess.openhr.dossier.HRDossierCollectionParameters;
import com.hraccess.openhr.dossier.HRDossierFactory;
import com.hraccess.openhr.dossier.HRKey;
import com.hraccess.openhr.dossier.HROccur;
import com.hraccess.openhr.dossier.HROccurListIterator;

/**
 * Lecture du dossier collaborateur via l'API Java OpenHR (HRa Suite 9).
 *
 * Mise en oeuvre conforme au Guide du développeur OpenHR :
 *  - une session OpenHR unique, connectée au démarrage de l'application
 *    (l'ouverture de session est coûteuse : construction du dictionnaire) ;
 *  - un utilisateur de service connecté avec identifiant + mot de passe
 *    (table UC10 ou Login Module du site), et un de ses rôles pour la
 *    confidentialité — on n'utilise PAS l'utilisateur de session
 *    (accès sans confidentialité, critique en matière de sécurité) ;
 *  - une collection de dossiers créée PAR REQUÊTE : le chargement d'un
 *    dossier remplace le précédent au sein d'une collection, elle ne doit
 *    donc pas être partagée entre requêtes concurrentes.
 *
 * Une session déconnectée ne peut pas être reconnectée (idem pour un
 * utilisateur, cf. guide) : en cas de coupure, une nouvelle session et une
 * nouvelle connexion utilisateur sont recréées automatiquement à la
 * prochaine requête.
 */
public class ServiceDossierOpenHR implements ServiceDossier {

    private Properties conf;

    private IHRSession session;
    private IHRUser utilisateur;
    private IHRRole role;

    private String nomProcessus;      // processus GD, ex. FS001 (doit être dans session.process_list)
    private String structureDonnees;  // structure de données du dossier salarié, ex. ZY
    private String reglementation;    // valeur de SOCCLE pour la recherche par matricule
    private List sections;            // codes des informations à lire, ex. 00, 07, 10...

    public void demarrer(Properties configuration) throws Exception {
        this.conf = configuration;

        // Log de l'API OpenHR (Log4J, cf. guide)
        HRApplication.configureLogs(conf.getProperty("log4j.configuration", "conf/log4j.properties"));

        nomProcessus = conf.getProperty("openhr.processus", "FS001");
        structureDonnees = conf.getProperty("openhr.structure", "ZY");
        reglementation = conf.getProperty("openhr.reglementation", "");

        sections = new ArrayList();
        StringTokenizer tokenizer = new StringTokenizer(conf.getProperty("openhr.sections", "00"), ",");
        while (tokenizer.hasMoreTokens()) {
            sections.add(tokenizer.nextToken().trim());
        }

        // Échec au démarrage = configuration à corriger : on ne le masque pas.
        connecter();
    }

    /** Ouvre une nouvelle session OpenHR et connecte l'utilisateur de service. */
    private synchronized void connecter() throws Exception {
        session = HRSessionFactory.getFactory().createSession(
                new PropertiesConfiguration(conf.getProperty("openhr.configuration", "conf/openhr.properties")));

        utilisateur = session.connectUser(
                conf.getProperty("openhr.utilisateur"),
                conf.getProperty("openhr.motdepasse"));

        String formeCanonique = conf.getProperty("openhr.role");
        role = utilisateur.getRole(formeCanonique);
        if (role == null) {
            throw new IllegalStateException("L'utilisateur de service ne possède pas le rôle <"
                    + formeCanonique + "> (vérifiez openhr.role et le paramétrage sécurité HRa)");
        }
        System.out.println("Session OpenHR connectée (utilisateur <" + utilisateur.getUserId()
                + ">, rôle <" + formeCanonique + ">)");
    }

    /**
     * Garantit une connexion utilisable avant chaque lecture. Une session ou
     * un utilisateur déconnecté ne pouvant être reconnecté, on recrée le tout.
     */
    private synchronized void assurerConnexion() throws Exception {
        if (session != null && session.isConnected()
                && utilisateur != null && utilisateur.isConnected()) {
            return;
        }
        System.out.println("Session OpenHR indisponible : reconnexion...");
        fermerSansErreur();
        connecter();
    }

    public Map lireDossier(String cle, String valeur) throws Exception {
        assurerConnexion();

        HRDossierCollection collection = creerCollection();

        HRDossier dossier;
        if ("matricule".equals(cle)) {
            // Clé fonctionnelle du dossier salarié : (réglementation, matricule)
            dossier = collection.loadDossier(new HRKey(reglementation, valeur));
        } else {
            // Clé technique : numéro de dossier (NUDOSS)
            dossier = collection.loadDossier(Integer.parseInt(valeur));
        }
        if (dossier == null) {
            return null; // clé invalide : dossier inexistant (ou non visible du rôle)
        }

        Map resultat = new LinkedHashMap();
        resultat.put("nudoss", new Integer(dossier.getNudoss()));
        resultat.put("reglementation", dossier.getRuleSystem());

        Map sectionsJson = new LinkedHashMap();
        for (Iterator it = sections.iterator(); it.hasNext();) {
            String nomSection = (String) it.next();
            HRDataSect section = dossier.getDataSectionByName(nomSection);
            List occurrences = new ArrayList();
            if (section != null && section.hasOccurs()) {
                for (HROccurListIterator occs = section.getOccurs(); occs.hasNext();) {
                    HROccur occurrence = (HROccur) occs.next();
                    occurrences.add(new LinkedHashMap(occurrence.getValues()));
                }
            }
            sectionsJson.put(nomSection, occurrences);
        }
        resultat.put("sections", sectionsJson);
        return resultat;
    }

    /**
     * Crée une collection de dossiers en lecture pour cette requête.
     * Le rôle porte la confidentialité ; la conversation principale suffit
     * (pas d'information paramètre utilisée en lecture).
     */
    private HRDossierCollection creerCollection() {
        HRDossierCollectionParameters parametres = new HRDossierCollectionParameters();
        parametres.setType(HRDossierCollectionParameters.TYPE_NORMAL);
        parametres.setProcessName(nomProcessus);
        parametres.setDataStructureName(structureDonnees);
        for (Iterator it = sections.iterator(); it.hasNext();) {
            parametres.addDataSection(new HRDataSourceParameters.DataSection((String) it.next()));
        }
        return new HRDossierCollection(parametres,
                utilisateur.getMainConversation(),
                role,
                new HRDossierFactory(HRDossierFactory.TYPE_DOSSIER));
    }

    /** Ferme utilisateur et session en avalant les erreurs de déconnexion. */
    private void fermerSansErreur() {
        try {
            if (utilisateur != null && utilisateur.isConnected()) {
                utilisateur.disconnect();
            }
        } catch (Exception e) {
            System.err.println("Déconnexion utilisateur : " + e.getMessage());
        }
        try {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        } catch (Exception e) {
            System.err.println("Déconnexion session : " + e.getMessage());
        }
        utilisateur = null;
        session = null;
        role = null;
    }

    public void arreter() {
        fermerSansErreur();
    }
}
