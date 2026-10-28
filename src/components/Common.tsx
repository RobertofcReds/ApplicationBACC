import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Rechercher une série, matière, année…",
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.colors.carte, borderColor: t.colors.bordure }]}>
      <Ionicons name="search" size={18} color={t.colors.texteSecondaire} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.texteSecondaire}
        style={[styles.input, { color: t.colors.texte }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable hitSlop={10} onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={18} color={t.colors.texteSecondaire} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color ?? t.colors.vert }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, titre, texte }: { icon: keyof typeof Ionicons.glyphMap; titre: string; texte: string }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={52} color={t.colors.texteSecondaire} />
      <Text style={[styles.emptyTitre, { color: t.colors.texte }]}>{titre}</Text>
      <Text style={[styles.emptyTexte, { color: t.colors.texteSecondaire }]}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitre: { fontSize: 17, fontWeight: "700" },
  emptyTexte: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
