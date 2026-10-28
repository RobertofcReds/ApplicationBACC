import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { catalog } from "../../src/data/catalog";
import { useTheme } from "../../src/theme/ThemeProvider";

const SERIES_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  A: "book",
  C: "calculator",
  D: "medkit",
  L: "library",
  S: "flask",
  OSE: "briefcase",
  TECHNIQUE: "construct",
};

export default function SeriesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Adaptation aux petits écrans
  const compact = width < 360;
  const gap = compact ? 8 : 12;
  const padding = compact ? 10 : 16;
  const iconSize = compact ? 40 : 48;
  const contentStyle = useMemo(
    () => ({ paddingHorizontal: padding, paddingTop: 14, paddingBottom: 24 }),
    [padding]
  );

  return (
    <>
      <Stack.Screen options={{ title: "Séries du BAC" }} />
      <FlatList
        style={{ flex: 1, backgroundColor: t.colors.fond }}
        contentContainerStyle={contentStyle}
        data={catalog.series}
        keyExtractor={(s) => s.id}
        ItemSeparatorComponent={() => <View style={{ height: gap }} />}
        renderItem={({ item }) => {
          const nb = item.matieres.reduce((n, m) => n + m.docs.length, 0);
          const anneeMin = Math.min(...item.matieres.map((m) => m.anneeMin));
          const anneeMax = Math.max(...item.matieres.map((m) => m.anneeMax));
          const plage = anneeMin === anneeMax ? `${anneeMin}` : `${anneeMin}–${anneeMax}`;
          return (
            <Pressable
              android_ripple={{ color: t.colors.bordure, foreground: true }}
              onPress={() =>
                router.push({ pathname: "/serie/[serie]", params: { serie: item.id } })
              }
              style={[
                styles.carte,
                {
                  backgroundColor: t.colors.carte,
                  borderColor: t.colors.bordure,
                  padding: compact ? 12 : 14,
                },
                t.ombre,
              ]}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor: t.colors.iconeFond,
                    width: iconSize,
                    height: iconSize,
                    borderRadius: compact ? 10 : 12,
                  },
                ]}
              >
                <Ionicons
                  name={SERIES_ICONS[item.id] ?? "school"}
                  size={compact ? 21 : 25}
                  color={t.colors.vertClair}
                />
              </View>
              <View style={styles.textes}>
                <Text
                  numberOfLines={1}
                  style={[styles.titre, { color: t.colors.texte, fontSize: compact ? 14 : 16 }]}
                >
                  {item.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.meta, { color: t.colors.texteSecondaire, fontSize: compact ? 12 : 13 }]}
                >
                  {nb} sujet{nb > 1 ? "s" : ""} · {item.matieres.length} matière
                  {item.matieres.length > 1 ? "s" : ""} · {plage}
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
  carte: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  icon: { alignItems: "center", justifyContent: "center" },
  textes: { flex: 1, gap: 2 },
  titre: { fontWeight: "800", letterSpacing: 0.1 },
  meta: {},
});
