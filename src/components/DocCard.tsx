import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import type { DocRef } from "../storage/storage";

export type DocCardProps = {
  titre: string;
  sousTitre: string;
  meta?: string;
  favori?: boolean;
  progression?: { page: number; pages: number } | undefined;
  onPress: () => void;
  onToggleFavori?: () => void;
  onLongPress?: () => void;
};

function DocCardBase({
  titre,
  sousTitre,
  meta,
  favori,
  progression,
  onPress,
  onToggleFavori,
  onLongPress,
}: DocCardProps) {
  const t = useTheme();

  const pct =
    progression && progression.pages > 0
      ? Math.min(100, Math.round((progression.page / progression.pages) * 100))
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: t.colors.bordure, foreground: true }}
      style={[
        styles.card,
        { backgroundColor: t.colors.carte, borderColor: t.colors.bordure },
        t.ombre,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.colors.iconeFond }]}>
        <Ionicons name="document-text" size={21} color={t.colors.vertClair} />
      </View>

      <View style={styles.textes}>
        <Text numberOfLines={2} style={[styles.titre, { color: t.colors.texte }]}>
          {titre}
        </Text>
        <Text numberOfLines={1} style={[styles.sousTitre, { color: t.colors.texteSecondaire }]}>
          {sousTitre}
        </Text>
        {meta ? (
          <Text numberOfLines={1} style={[styles.meta, { color: t.colors.texteSecondaire }]}>
            {meta}
          </Text>
        ) : null}
        {pct !== undefined ? (
          <View style={styles.progWrap}>
            <View style={[styles.progBar, { backgroundColor: t.colors.bordure }]}>
              <View style={[styles.progFill, { backgroundColor: t.colors.vertClair, width: `${pct}%` }]} />
            </View>
            <Text style={[styles.progText, { color: t.colors.texteSecondaire }]}>
              {pct}% · page {progression?.page}/{progression?.pages}
            </Text>
          </View>
        ) : null}
      </View>

      {onToggleFavori ? (
        <Pressable
          hitSlop={14}
          onPress={onToggleFavori}
          style={({ pressed }) => [styles.etoile, pressed && { opacity: 0.5, transform: [{ scale: 0.9 }] }]}
        >
          <Ionicons
            name={favori ? "star" : "star-outline"}
            size={23}
            color={favori ? t.colors.jaune : t.colors.texteSecondaire}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const DocCard = memo(DocCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textes: { flex: 1, gap: 2 },
  titre: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  sousTitre: { fontSize: 12.5 },
  meta: { fontSize: 12 },
  etoile: { padding: 6, marginLeft: 2 },
  progWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  progBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 2 },
  progText: { fontSize: 11, fontWeight: "500" },
});
