import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { findSerie, MATIERE_ICONS } from "../../../src/data/catalog";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function SerieScreen() {
  const { serie: serieId } = useLocalSearchParams<{ serie: string }>();
  const router = useRouter();
  const t = useTheme();
  const serie = findSerie(serieId ?? "");

  if (!serie) {
    return (
      <>
        <Stack.Screen options={{ title: "Série introuvable" }} />
        <View style={[styles.root, { backgroundColor: t.colors.fond }]}>
          <Text style={{ color: t.colors.texte }}>Cette série n'existe pas.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: serie.label }} />
      <FlatList
        style={{ flex: 1, backgroundColor: t.colors.fond }}
        contentContainerStyle={styles.content}
        data={serie.matieres}
        keyExtractor={(m) => m.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const plage =
            item.anneeMin === item.anneeMax ? `${item.anneeMin}` : `${item.anneeMin} → ${item.anneeMax}`;
          return (
            <Pressable
              android_ripple={{ color: t.colors.bordure, foreground: true }}
              onPress={() =>
                router.push({
                  pathname: "/serie/[serie]/[matiere]",
                  params: { serie: serie.id, matiere: item.id },
                })
              }
              style={[
                styles.carte,
                { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
                t.ombre,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: t.colors.iconeFond }]}>
                <Ionicons
                  name={(MATIERE_ICONS[item.id] ?? "book") as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={t.colors.vertClair}
                />
              </View>
              <View style={styles.textes}>
                <Text style={[styles.titre, { color: t.colors.texte }]}>{item.label}</Text>
                <Text style={[styles.meta, { color: t.colors.texteSecondaire }]}>
                  {item.docs.length} sujet{item.docs.length > 1 ? "s" : ""} · {plage}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.colors.texteSecondaire} />
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingTop: 14, paddingBottom: 24 },
  carte: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  icon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  textes: { flex: 1, gap: 2 },
  titre: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 13 },
});
