package connecteur;

import java.util.Map;
import java.util.Properties;

/**
 * Service de lecture du dossier collaborateur.
 *
 * Deux implémentations :
 *  - ServiceDossierOpenHR : la vraie, bâtie sur l'API Java OpenHR livrée avec
 *    HR Access (nécessite les JARs OpenHR dans lib/) ;
 *  - ServiceDossierMock : dossier fictif, pour développer sans serveur HRa.
 */
public interface ServiceDossier {

    /** Initialise le service (connexion de la session OpenHR, etc.). */
    void demarrer(Properties configuration) throws Exception;

    /**
     * Lit un dossier collaborateur.
     *
     * @param cle    "nudoss" (clé technique) ou "matricule" (clé fonctionnelle)
     * @param valeur la valeur de la clé
     * @return une Map sérialisable en JSON :
     *         { "nudoss": ..., "sections": { "00": [ { rubrique: valeur, ... } ], ... } }
     *         ou null si le dossier n'existe pas.
     */
    Map lireDossier(String cle, String valeur) throws Exception;

    /** Libère les ressources (déconnexion utilisateur et session OpenHR). */
    void arreter();
}
