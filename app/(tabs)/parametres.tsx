import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useTheme } from "../../src/theme/ThemeProvider";
import { APP_VERSION, DEVELOPPEUR, ENTREPRISE, EMAIL_SUPPORT } from "../../src/version";
import {
  clearFavoris,
  clearHistorique,
  useFavoris,
  useHistorique,
  useModeTheme,
  type ModeTheme,
} from "../../src/storage/storage";

const OPTIONS_THEME: { valeur: ModeTheme; label: string; detail: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  {
    valeur: "system",
    label: "Défaut du téléphone",
    detail: "Suit automatiquement le mode de votre appareil",
    icone: "phone-portrait-outline",
  },
  { valeur: "clair", label: "Clair", detail: "Toujours en apparence claire", icone: "sunny-outline" },
  { valeur: "sombre", label: "Sombre", detail: "Toujours en apparence sombre", icone: "moon-outline" },
];

export default function ParametresScreen() {
  const t = useTheme();
  const router = useRouter();
  const { mode, setMode } = useModeTheme();
  const { favoris } = useFavoris();
  const { historique } = useHistorique();

  const demanderEffacement = (titre: string, message: string, action: () => Promise<void>) => {
    Alert.alert(titre, message, [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: () => void action() },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Paramètres" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: t.colors.fond }}
        contentContainerStyle={styles.content}
      >
        {/* ---------------- Apparence ---------------- */}
        <Text style={[styles.sectionTitre, { color: t.colors.texteSecondaire }]}>APPARENCE</Text>
        <View
          style={[
            styles.carte,
            { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
            t.ombre,
          ]}
        >
          {OPTIONS_THEME.map((opt, i) => {
            const actif = mode === opt.valeur;
            return (
              <Pressable
                key={opt.valeur}
                onPress={() => setMode(opt.valeur)}
                android_ripple={{ color: t.colors.bordure }}
                style={[
                  styles.option,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.bordure },
                ]}
              >
                <View style={[styles.iconeBox, { backgroundColor: t.colors.iconeFond }]}>
                  <Ionicons
                    name={opt.icone}
                    size={19}
                    color={actif ? t.colors.vertClair : t.colors.texteSecondaire}
                  />
                </View>
                <View style={styles.optionTextes}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: actif ? t.colors.texte : t.colors.texteSecondaire },
                      actif && { fontWeight: "700" as const },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionDetail, { color: t.colors.texteSecondaire }]}>
                    {opt.detail}
                  </Text>
                </View>
                {actif ? (
                  <Ionicons name="checkmark-circle" size={20} color={t.colors.vertClair} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* ---------------- Données ---------------- */}
        <Text style={[styles.sectionTitre, { color: t.colors.texteSecondaire }]}>DONNÉES</Text>
        <View
          style={[
            styles.carte,
            { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
            t.ombre,
          ]}
        >
          <Pressable
            android_ripple={{ color: t.colors.bordure }}
            disabled={favoris.length === 0}
            onPress={() =>
              demanderEffacement(
                "Effacer les favoris",
                `Vos ${favoris.length} favori${favoris.length > 1 ? "s" : ""} sera${favoris.length > 1 ? "ont" : ""} retiré${favoris.length > 1 ? "s" : ""}. Cette action est irréversible.`,
                clearFavoris
              )
            }
            style={styles.option}
          >
            <View style={[styles.iconeBox, { backgroundColor: t.colors.iconeFond }]}>
              <Ionicons name="star-outline" size={19} color={t.colors.vertClair} />
            </View>
            <View style={styles.optionTextes}>
              <Text style={[styles.optionLabel, { color: t.colors.texte }]}>Mes favoris</Text>
              <Text style={[styles.optionDetail, { color: t.colors.texteSecondaire }]}>
                {favoris.length === 0
                  ? "Aucun favori enregistré"
                  : `${favoris.length} favori${favoris.length > 1 ? "s" : ""} enregistré${favoris.length > 1 ? "s" : ""}`}
              </Text>
            </View>
            {favoris.length > 0 ? (
              <Ionicons name="trash-outline" size={18} color={t.colors.danger} />
            ) : null}
          </Pressable>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.bordure }} />

          <Pressable
            android_ripple={{ color: t.colors.bordure }}
            disabled={historique.length === 0}
            onPress={() =>
              demanderEffacement(
                "Effacer l'historique",
                "Tout l'historique de lecture sera effacé. Cette action est irréversible.",
                clearHistorique
              )
            }
            style={styles.option}
          >
            <View style={[styles.iconeBox, { backgroundColor: t.colors.iconeFond }]}>
              <Ionicons name="time-outline" size={19} color={t.colors.vertClair} />
            </View>
            <View style={styles.optionTextes}>
              <Text style={[styles.optionLabel, { color: t.colors.texte }]}>Historique de lecture</Text>
              <Text style={[styles.optionDetail, { color: t.colors.texteSecondaire }]}>
                {historique.length === 0
                  ? "Aucune lecture enregistrée"
                  : `${historique.length} sujet${historique.length > 1 ? "s" : ""} consulté${historique.length > 1 ? "s" : ""}`}
              </Text>
            </View>
            {historique.length > 0 ? (
              <Ionicons name="trash-outline" size={18} color={t.colors.danger} />
            ) : null}
          </Pressable>
        </View>

        {/* ---------------- À propos ---------------- */}
        <Text style={[styles.sectionTitre, { color: t.colors.texteSecondaire }]}>À PROPOS</Text>
        <View
          style={[
            styles.carte,
            { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
            t.ombre,
          ]}
        >
          <Pressable
            android_ripple={{ color: t.colors.bordure }}
            onPress={() => router.push("/a-propos")}
            style={styles.option}
          >
            <View style={[styles.iconeBox, { backgroundColor: t.colors.iconeFond }]}>
              <Ionicons name="information-circle-outline" size={19} color={t.colors.vertClair} />
            </View>
            <View style={styles.optionTextes}>
              <Text style={[styles.optionLabel, { color: t.colors.texte }]}>À propos de l'application</Text>
              <Text style={[styles.optionDetail, { color: t.colors.texteSecondaire }]}>
                Développeur, sources des sujets, assistance
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.texteSecondaire} />
          </Pressable>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.bordure }} />

          <Pressable
            android_ripple={{ color: t.colors.bordure }}
            onPress={() => void Linking.openURL(`mailto:${EMAIL_SUPPORT}`)}
            style={styles.option}
          >
            <View style={[styles.iconeBox, { backgroundColor: t.colors.iconeFond }]}>
              <Ionicons name="mail-outline" size={19} color={t.colors.vertClair} />
            </View>
            <View style={styles.optionTextes}>
              <Text style={[styles.optionLabel, { color: t.colors.texte }]}>Contact & assistance</Text>
              <Text style={[styles.optionDetail, { color: t.colors.texteSecondaire }]}>{EMAIL_SUPPORT}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.texteSecondaire} />
          </Pressable>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.bordure }} />

          <View style={styles.option}>
            <View style={[styles.iconeBox, { backgroundColor: t.colors.iconeFond }]}>
              <Ionicons name="rocket-outline" size={19} color={t.colors.vertClair} />
            </View>
            <View style={styles.optionTextes}>
              <Text style={[styles.optionLabel, { color: t.colors.texte }]}>Version</Text>
              <Text style={[styles.optionDetail, { color: t.colors.texteSecondaire }]}>
                {APP_VERSION} — {ENTREPRISE}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.pied, { color: t.colors.texteSecondaire }]}>
          Développé avec ❤ par {DEVELOPPEUR}{"\n"}
          {ENTREPRISE} © 2026
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 6, paddingBottom: 40 },
  sectionTitre: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 18,
  },
  carte: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  iconeBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextes: { flex: 1, gap: 1 },
  optionLabel: { fontSize: 15, fontWeight: "500" },
  optionDetail: { fontSize: 12, lineHeight: 16 },
  pied: { fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 18 },
});
