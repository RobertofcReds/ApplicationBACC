import { FlatList, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { findSerie } from "../../../../src/data/catalog";
import { DocCard } from "../../../../src/components/DocCard";
import { EmptyState } from "../../../../src/components/Common";
import { useTheme } from "../../../../src/theme/ThemeProvider";
import { useFavoris } from "../../../../src/storage/storage";
import { useHistorique } from "../../../../src/storage/storage";

export default function MatiereScreen() {
  const { serie: serieId, matiere: matiereId } = useLocalSearchParams<{ serie: string; matiere: string }>();
  const router = useRouter();
  const t = useTheme();
  const { favoris, toggle } = useFavoris();
  const { historique } = useHistorique();

  const serie = findSerie(serieId ?? "");
  const matiere = serie?.matieres.find((m) => m.id === matiereId);

  if (!serie || !matiere) {
    return (
      <>
        <Stack.Screen options={{ title: "Introuvable" }} />
        <View style={[styles.root, { backgroundColor: t.colors.fond }]}>
          <Text style={{ color: t.colors.texte }}>Matière introuvable.</Text>
        </View>
      </>
    );
  }

  const favKeys = new Set(favoris.map((f) => f.assetKey));
  const hist = new Map(historique.map((h) => [h.assetKey, h]));

  return (
    <>
      <Stack.Screen options={{ title: `${matiere.label} — ${serie.label}` }} />
      <FlatList
        style={{ flex: 1, backgroundColor: t.colors.fond }}
        contentContainerStyle={styles.content}
        data={matiere.docs}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={
          <EmptyState icon="document-outline" titre="Aucun sujet" texte="Aucun document pour cette matière." />
        }
        renderItem={({ item }) => (
          <DocCard
            titre={item.titre}
            sousTitre={
              item.genre === "corrige"
                ? `Corrigé · Session ${item.annee}`
                : item.genre === "bacblanc"
                  ? `Bac blanc · Session ${item.annee}`
                  : `Session ${item.annee}`
            }
            favori={favKeys.has(item.assetKey)}
            progression={
              hist.has(item.assetKey)
                ? { page: hist.get(item.assetKey)!.page, pages: hist.get(item.assetKey)!.pages }
                : undefined
            }
            onPress={() => {
              router.push({
                pathname: "/pdf/[key]",
                params: { key: item.assetKey, serie: serie.id, matiere: matiere.id, annee: String(item.annee) },
              });
            }}
            onToggleFavori={() => toggle({
              assetKey: item.assetKey,
              titre: item.titre,
              serie: serie.label,
              matiere: matiere.label,
              annee: item.annee,
            })}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingTop: 14, paddingBottom: 24 },
});
