import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { catalog, allDocs } from "../../src/data/catalog";
import { DocCard } from "../../src/components/DocCard";
import { SearchBar, EmptyState, Badge } from "../../src/components/Common";
import { useTheme } from "../../src/theme/ThemeProvider";
import { useHistorique, type HistoriqueEntry } from "../../src/storage/storage";

type SearchHit = {
  key: string;
  titre: string;
  sousTitre: string;
  assetKey: string;
  serie: string;
  serieLabel: string;
  matiere: string;
  matiereLabel: string;
  annee: number;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Accueil() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { historique, ready } = useHistorique();

  const index = useMemo(() => allDocs().map((d) => ({ ...d, key: d.assetKey })), []);

  const hits = useMemo<SearchHit[]>(() => {
    const query = normalize(q.trim());
    if (query.length < 2) return [];
    const terms = query.split(/\s+/);
    return index
      .filter((d) => {
        const hay = normalize(`${d.serieLabel} ${d.matiereLabel} ${d.annee} ${d.titre}`);
        return terms.every((term) => hay.includes(term));
      })
      .slice(0, 30)
      .map((d) => ({
        key: d.key,
        titre: d.titre,
        sousTitre: `${d.serieLabel} · ${d.matiereLabel}`,
        assetKey: d.assetKey,
        serie: d.serie,
        serieLabel: d.serieLabel,
        matiere: d.matiere,
        matiereLabel: d.matiereLabel,
        annee: d.annee,
      }));
  }, [q, index]);

  return (
    <>
      <Stack.Screen options={{ title: "BAC Madagascar" }} />
      <View style={[styles.root, { backgroundColor: t.colors.fond, paddingBottom: insets.bottom }]}>
        <View style={styles.searchWrap}>
          <SearchBar value={q} onChangeText={setQ} />
        </View>

        {q.trim().length >= 2 ? (
          <FlatList
            data={hits}
            keyExtractor={(x) => x.key}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                titre="Aucun résultat"
                texte="Essayez « maths 2015 », « série C philosophie » ou « 2018 »."
              />
            }
            renderItem={({ item }) => (
              <DocCard
                titre={item.titre}
                sousTitre={`${item.serieLabel} · ${item.matiereLabel} · ${item.annee}`}
                onPress={() =>
                  router.push({ pathname: "/pdf/[key]", params: { key: item.assetKey } })
                }
              />
            )}
          />
        ) : (
          <FlatList
            data={historique}
            keyExtractor={(x) => x.assetKey}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.header}>
                <View style={styles.hero}>
                  <Text style={styles.heroTitre}>📚 Sujets du Baccalauréat de Madagascar</Text>
                  <Text style={styles.heroTexte}>
                    {catalog.totalDocs} sujets officiels (sessions 1998 → 2023, séries A · A2 · C · D · L · S · OSE) · 100 % hors ligne
                  </Text>
                  <View style={styles.heroBadges}>
                    <Badge label="Aucune connexion requise" color={t.colors.vertClair} />
                  </View>
                </View>

                <Text style={[styles.sectionTitre, { color: t.colors.texte }]}>Reprendre la lecture</Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon="time-outline"
                titre="Aucune lecture récente"
                texte="Ouvrez un sujet depuis l'onglet Séries : il apparaîtra ici pour reprendre là où vous vous êtes arrêté."
              />
            }
            renderItem={({ item }: { item: HistoriqueEntry }) => (
              <DocCard
                titre={item.titre}
                sousTitre={`${item.serie} · ${item.matiere} · ${item.annee}`}
                progression={{ page: item.page, pages: item.pages }}
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
  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  header: { marginBottom: 8 },
  hero: {
    backgroundColor: "#08291F",
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
    gap: 7,
  },
  heroTitre: { color: "#fff", fontSize: 19, fontWeight: "800", lineHeight: 25, letterSpacing: 0.2 },
  heroTexte: { color: "#CFE8DC", fontSize: 13, lineHeight: 20 },
  heroBadges: { flexDirection: "row", gap: 8, marginTop: 6 },
  sectionTitre: { fontSize: 18, fontWeight: "800", marginTop: 14, marginBottom: 10, letterSpacing: 0.2 },
});
