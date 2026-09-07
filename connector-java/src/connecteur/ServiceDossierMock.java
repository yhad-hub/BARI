package connecteur;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Implémentation de démonstration : renvoie un dossier fictif avec les
 * sections standard du dossier salarié (ZY), sans aucun appel à OpenHR.
 * Permet de tester le connecteur et la page web hors infrastructure HRa.
 */
public class ServiceDossierMock implements ServiceDossier {

    public void demarrer(Properties configuration) {
        // rien à initialiser
    }

    public Map lireDossier(String cle, String valeur) {
        Map resultat = new LinkedHashMap();
        resultat.put("nudoss", "matricule".equals(cle) ? "1000" : valeur);
        resultat.put("reglementation", "HRA");

        Map sections = new LinkedHashMap();
        sections.put("00", occurrence(new String[][] {
                { "SOCCLE", "HRA" }, { "MATCLE", "matricule".equals(cle) ? valeur : "123456" } }));
        sections.put("07", occurrence(new String[][] {
                { "NOMUSE", "MARTIN" }, { "NOMPAT", "MARTIN" }, { "PRENOM", "Sophie" } }));
        sections.put("10", occurrence(new String[][] {
                { "DATNAI", "1988-04-12" }, { "VILNAI", "Lyon" } }));
        sections.put("12", occurrence(new String[][] {
                { "NATION", "Française" } }));
        sections.put("0F", occurrence(new String[][] {
                { "ZONADA", "12 rue de la République" }, { "CDPOST", "69002" }, { "VILLE", "Lyon" } }));
        resultat.put("sections", sections);
        return resultat;
    }

    private List occurrence(String[][] rubriques) {
        Map valeurs = new LinkedHashMap();
        for (int i = 0; i < rubriques.length; i++) {
            valeurs.put(rubriques[i][0], rubriques[i][1]);
        }
        List occurrences = new ArrayList();
        occurrences.add(valeurs);
        return occurrences;
    }

    public void arreter() {
        // rien à libérer
    }
}
