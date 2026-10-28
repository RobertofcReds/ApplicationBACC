import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../../src/components/Common";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useImportes } from "../../src/storage/storage";
import { deleteImportedPdf, importPdfFromDevice } from "../../src/storage/importedPdfs";
import { DocCard } from "../../src/components/DocCard";
import { catalog } from "../../src/data/catalog";

export default function ImportesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { importes, ready } = useImportes();
  const [busy, setBusy] = useState(false);

  const importerPdf = async () => {
    setBusy(true);
    try {
      const res = await importPdfFromDevice();
      if (res.ok) {
        Alert.alert("Import réussi", res.message);
      } else if (res.message !== "Import annulé.") {
        Alert.alert("Import", res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const supprimer = (entry: { id: string; titre: string; file: string }) => {
    Alert.alert("Supprimer", `Supprimer « ${entry.titre} » du stockage local ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteImportedPdf(entry as never);
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Sujets & imports" }} />
      <View style={[styles.root, { backgroundColor: t.colors.fond }]}>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          data={importes}
          keyExtractor={(e) => e.id}
          ListHeaderComponent={
            <View style={styles.header}>
              {/* ---------- Carte info : sujets officiels déjà embarqués ---------- */}
              <View
                style={[styles.carteInfo, { backgroundColor: t.colors.carte, borderColor: t.colors.bordure }]}
              >
                <View style={styles.infoTitre}>
                  <Ionicons name="checkmark-circle" size={24} color={t.colors.vertClair} />
                  <Text style={[styles.infoNom, { color: t.colors.texte }]}>
                    {catalog.totalDocs} sujets officiels inclus
                  </Text>
                </View>
                <Text style={[styles.infoTexte, { color: t.colors.texteSecondaire }]}>
                  Tous les sujets du BAC (sessions 1998 → 2023) sont déjà embarqués dans
                  l'application — aucun téléchargement nécessaire. Retrouvez-les dans l'onglet
                  « Séries du BAC ».
                </Text>
              </View>

              {/* ---------- Mes PDF personnels ---------- */}
              <Text style={[styles.sectionTitre, { color: t.colors.texte }]}>Mes PDF personnels</Text>
              <Pressable
                onPress={importerPdf}
                disabled={busy}
                android_ripple={{ color: t.colors.bordure }}
                style={[styles.bouton, { backgroundColor: t.colors.vertClair, opacity: busy ? 0.6 : 1 }]}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.boutonTexte}>Importer un PDF du téléphone</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            ready ? (
              <EmptyState
                icon="document-outline"
                titre="Aucun PDF personnel"
                texte="Ajoutez vos propres sujets ou corrigés : ils restent stockés localement dans l'app."
              />
            ) : null
          }
          renderItem={({ item }) => (
            <DocCard
              titre={item.titre}
              sousTitre={`PDF importé · ${item.tailleKo} Ko`}
              onPress={() =>
                router.push({ pathname: "/pdf/[key]", params: { key: `imp:${item.id}` } })
              }
              onLongPress={() => supprimer(item)}
            />
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingTop: 14, paddingBottom: 24 },
  header: { marginBottom: 8 },
  carteInfo: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  infoTitre: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoNom: { fontSize: 16, fontWeight: "800", flex: 1 },
  infoTexte: { fontSize: 13, lineHeight: 19 },
  sectionTitre: { fontSize: 17, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  bouton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  boutonTexte: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
