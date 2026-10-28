import { FlatList, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { EmptyState } from "../../src/components/Common";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useFavoris } from "../../src/storage/storage";
import { DocCard } from "../../src/components/DocCard";

export default function FavorisScreen() {
  const t = useTheme();
  const router = useRouter();
  const { favoris, ready, toggle } = useFavoris();

  return (
    <>
      <Stack.Screen options={{ title: "Mes favoris" }} />
      <View style={[styles.root, { backgroundColor: t.colors.fond }]}>
        {ready && favoris.length === 0 ? (
          <EmptyState
            icon="star-outline"
            titre="Aucun favori"
            texte="Touchez l'étoile sur un sujet pour le retrouver ici, même hors ligne."
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            data={favoris}
            keyExtractor={(f) => f.assetKey}
            renderItem={({ item }) => (
              <DocCard
                titre={item.titre}
                sousTitre={`${item.serie} · ${item.matiere} · ${item.annee}`}
                favori
                onToggleFavori={() => toggle(item)}
                onPress={() =>
                  router.push({ pathname: "/pdf/[key]", params: { key: item.assetKey } })
                }
              />
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingTop: 14, paddingBottom: 24 },
});
