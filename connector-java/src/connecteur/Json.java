package connecteur;

import java.util.Iterator;
import java.util.Map;

/** Sérialisation JSON minimaliste (Map / Iterable / scalaires), sans dépendance. */
public final class Json {

    private Json() {
    }

    public static String versJson(Object valeur) {
        StringBuffer sb = new StringBuffer();
        ecrire(sb, valeur);
        return sb.toString();
    }

    private static void ecrire(StringBuffer sb, Object valeur) {
        if (valeur == null) {
            sb.append("null");
        } else if (valeur instanceof Map) {
            sb.append('{');
            boolean premier = true;
            for (Iterator it = ((Map) valeur).entrySet().iterator(); it.hasNext();) {
                Map.Entry entree = (Map.Entry) it.next();
                if (!premier) {
                    sb.append(',');
                }
                premier = false;
                ecrireChaine(sb, String.valueOf(entree.getKey()));
                sb.append(':');
                ecrire(sb, entree.getValue());
            }
            sb.append('}');
        } else if (valeur instanceof Iterable) {
            sb.append('[');
            boolean premier = true;
            for (Iterator it = ((Iterable) valeur).iterator(); it.hasNext();) {
                if (!premier) {
                    sb.append(',');
                }
                premier = false;
                ecrire(sb, it.next());
            }
            sb.append(']');
        } else if (valeur instanceof Number || valeur instanceof Boolean) {
            sb.append(valeur.toString());
        } else {
            // Dates, Timestamps et autres types HRa : sérialisés en texte
            ecrireChaine(sb, valeur.toString());
        }
    }

    private static void ecrireChaine(StringBuffer sb, String texte) {
        sb.append('"');
        for (int i = 0; i < texte.length(); i++) {
            char c = texte.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        String hex = Integer.toHexString(c);
                        sb.append("\\u");
                        for (int j = hex.length(); j < 4; j++) {
                            sb.append('0');
                        }
                        sb.append(hex);
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append('"');
    }
}
