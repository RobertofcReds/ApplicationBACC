import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useTheme } from "../src/theme/ThemeProvider";
import {
  APP_NAME,
  APP_VERSION,
  DEVELOPPEUR,
  EMAIL_SUPPORT,
  ENTREPRISE,
} from "../src/version";
import { catalog } from "../src/data/catalog";

const annees = catalog.series
  .flatMap((s) => s.matieres.map((m) => [m.anneeMin, m.anneeMax]))
  .flat();
const anneeMin = Math.min(...annees);
const anneeMax = Math.max(...annees);
const nbSeries = catalog.series.length;

export default function AProposScreen() {
  const t = useTheme();

  const partager = () => {
    void Share.share({
      message: `${APP_NAME} — ${catalog.totalDocs} sujets officiels du Baccalauréat de Madagascar (${anneeMin} → ${anneeMax}), 100 % hors ligne. Développé par ${DEVELOPPEUR} — ${ENTREPRISE}.`,
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: "À propos" }} />
      <ScrollView style={[styles.scroll, { backgroundColor: t.colors.fond }]}>
        <View style={styles.contenu}>
          {/* ---------- Carte identité ---------- */}
          <View style={[styles.hero, { backgroundColor: t.colors.vertFonce }]}>
            <View style={styles.heroLogo}>
              <Ionicons name="school" size={34} color="#fff" />
            </View>
            <Text style={styles.heroNom}>{APP_NAME}</Text>
            <Text style={styles.heroVersion}>Version {APP_VERSION}</Text>
            <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.14)" }]}>
              <Ionicons name="wifi-outline" size={13} color="#CFE8DC" />
              <Text style={styles.heroBadgeTexte}>100 % hors ligne</Text>
            </View>
          </View>

          {/* ---------- Chiffres clés ---------- */}
          <View style={styles.statsRow}>
            {[
              { valeur: `${catalog.totalDocs}`, label: "sujets officiels" },
              { valeur: `${nbSeries}`, label: "séries" },
              { valeur: `${anneeMin}→${anneeMax}`, label: "sessions" },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCarte,
                  { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
                  t.ombre,
                ]}
              >
                <Text style={[styles.statValeur, { color: t.colors.vertClair }]}>{s.valeur}</Text>
                <Text style={[styles.statLabel, { color: t.colors.texteSecondaire }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ---------- Développeur ---------- */}
          <View
            style={[
              styles.carte,
              { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
              t.ombre,
            ]}
          >
            <Text style={[styles.sectionTitre, { color: t.colors.texteSecondaire }]}>DÉVELOPPEUR</Text>
            <View style={styles.devRow}>
              <View style={[styles.devAvatar, { backgroundColor: t.colors.iconeFond }]}>
                <Ionicons name="person" size={24} color={t.colors.vertClair} />
              </View>
              <View style={styles.devTextes}>
                <Text style={[styles.devNom, { color: t.colors.texte }]}>{DEVELOPPEUR}</Text>
                <Text style={[styles.devEntreprise, { color: t.colors.texteSecondaire }]}>
                  {ENTREPRISE}
                </Text>
              </View>
            </View>
            <Text style={[styles.devMessage, { color: t.colors.texteSecondaire }]}>
              Application conçue pour donner à chaque élève malgache un accès libre et gratuit aux
              annales officielles du Baccalauréat, où qu'il soit, avec ou sans connexion Internet.
            </Text>
          </View>

          {/* ---------- Sources des sujets ---------- */}
          <View
            style={[
              styles.carte,
              { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
              t.ombre,
            ]}
          >
            <Text style={[styles.sectionTitre, { color: t.colors.texteSecondaire }]}>SOURCES</Text>
            <View style={styles.sourceRow}>
              <Ionicons name="document-attach-outline" size={17} color={t.colors.vertClair} />            <Text style={[styles.sourceTexte, { color: t.colors.texte }]}
            >
                CSJ Mahamasina — sessions 1998 → 2018
            </Text>
            </View>
            <View style={styles.sourceRow}>
              <Ionicons name="document-attach-outline" size={17} color={t.colors.vertClair} />            <Text style={[styles.sourceTexte, { color: t.colors.texte }]}
            >
                EDUCMAD — nouveau BAC (L, S, OSE), séries A, C, D et BAC technique (génie civil, industriel)
            </Text>
            </View>
            <View style={styles.sourceRow}>
              <Ionicons name="document-attach-outline" size={17} color={t.colors.vertClair} />
              <Text style={[styles.sourceTexte, { color: t.colors.texte }]}
              >
                epreuvesetcorriges.com — sujets de la session 2026
              </Text>
            </View>
            <Text style={[styles.sourceNote, { color: t.colors.texteSecondaire }]}>
              Sujets officiels uniquement — les corrigés seront ajoutés dans une future version.
            </Text>
          </View>

          {/* ---------- Contact & partage ---------- */}
          <View
            style={[
              styles.carte,
              { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
              t.ombre,
            ]}
          >
            <Text style={[styles.sectionTitre, { color: t.colors.texteSecondaire }]}>ASSISTANCE</Text>
            <Pressable
              android_ripple={{ color: t.colors.bordure }}
              onPress={() => void Linking.openURL(`mailto:${EMAIL_SUPPORT}?subject=${encodeURIComponent("BAC Madagascar — assistance")}`)}
              style={styles.contactRow}
            >
              <Ionicons name="mail-outline" size={18} color={t.colors.vertClair} />
              <Text style={[styles.contactTexte, { color: t.colors.texte }]}>{EMAIL_SUPPORT}</Text>
            </Pressable>
            <Pressable
              android_ripple={{ color: t.colors.bordure }}
              onPress={partager}
              style={[styles.contactRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.bordure }]}
            >
              <Ionicons name="share-social-outline" size={18} color={t.colors.vertClair} />
              <Text style={[styles.contactTexte, { color: t.colors.texte }]}>
                Partager l'application
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.pied, { color: t.colors.texteSecondaire }]}>
            © 2026 {ENTREPRISE} — Tous droits réservés{"\n"}
            Développé par {DEVELOPPEUR}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  contenu: { padding: 16, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  heroNom: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroVersion: { color: "#9FC7B7", fontSize: 13 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  heroBadgeTexte: { color: "#CFE8DC", fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statCarte: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 2,
  },
  statValeur: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 11 },
  carte: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },
  sectionTitre: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  devRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  devAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  devTextes: { flex: 1, gap: 1 },
  devNom: { fontSize: 16, fontWeight: "700" },
  devEntreprise: { fontSize: 13 },
  devMessage: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  sourceRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 8 },
  sourceTexte: { flex: 1, fontSize: 13, lineHeight: 18 },
  sourceNote: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  contactTexte: { fontSize: 14, fontWeight: "500" },
  pied: { fontSize: 12, textAlign: "center", marginTop: 22, lineHeight: 18 },
});
