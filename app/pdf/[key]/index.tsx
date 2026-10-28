import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Pdf from "react-native-pdf";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveDoc } from "../../../src/data/catalog";
import { getImportes, type ImporteEntry } from "../../../src/storage/storage";
import { importedUri } from "../../../src/storage/importedPdfs";
import { usePdfUri } from "../../../src/storage/usePdfUri";
import { useFavoris, recordOuverture, recordPage, type DocRef } from "../../../src/storage/storage";
import { useTheme } from "../../../src/theme/ThemeProvider";

type Mode = {
  type: "catalogue";
  assetKey: string;
  file: string;
  titre: string;
  serie: string;
  matiere: string;
  annee: number;
} | { type: "importe"; id: string; entry: ImporteEntry };

export default function PdfScreen() {
  const params = useLocalSearchParams<{ key: string }>();
  const key = params.key ?? "";
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { favoris, toggle } = useFavoris();
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | undefined>();

  const mode: Mode | undefined = useMemo(() => {
    if (key.startsWith("imp:")) {
      return undefined; // résolu de façon asynchrone dans un effet
    }
    const doc = resolveDoc(key);
    if (!doc) return undefined;
    return {
      type: "catalogue",
      assetKey: doc.assetKey,
      file: doc.file,
      titre: doc.titre,
      serie: doc.serieLabel,
      matiere: doc.matiereLabel,
      annee: doc.annee,
    };
  }, [key]);

  const [importe, setImporte] = useState<ImporteEntry | undefined>();
  useEffect(() => {
    let alive = true;
    if (!key.startsWith("imp:")) return;
    const id = key.slice(4);
    getImportes().then((list) => {
      if (!alive) return;
      const entry = list.find((e) => e.id === id);
      if (entry) setImporte(entry);
      else setErr("PDF importé introuvable (fichier supprimé ?).");
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const assetKey = mode?.type === "catalogue" ? mode.assetKey : undefined;
  const relFile = mode?.type === "catalogue" ? mode.file : undefined;
  const { uri: bundleUri, error: bundleError } = usePdfUri(assetKey, relFile);

  const [importeUri, setImporteUri] = useState<string | undefined>();
  useEffect(() => {
    if (!importe) return;
    setImporteUri(importedUri(importe));
  }, [importe]);

  const titre = mode?.type === "catalogue" ? mode.titre : (importe?.titre ?? "PDF importé");
  const uri = mode?.type === "catalogue" ? bundleUri : importeUri;
  const error = mode?.type === "catalogue" ? bundleError : err;

  const ref: DocRef | undefined = mode?.type === "catalogue"
    ? {
        assetKey: mode.assetKey,
        titre: mode.titre,
        serie: mode.serie,
        matiere: mode.matiere,
        annee: mode.annee,
      }
    : importe
      ? {
          assetKey: key,
          titre: importe.titre,
          serie: "Importé",
          matiere: "PDF personnel",
          annee: new Date(importe.date).getFullYear(),
        }
      : undefined;

  const estFavori = !!ref && favoris.some((f) => f.assetKey === ref.assetKey);

  // Enregistre l'ouverture dès que le document est prêt
  useEffect(() => {
    if (mode?.type === "catalogue" && ref) {
      recordOuverture(ref, 1, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.assetKey]);

  const onPageChanged = useCallback(
    (page: number, pages: number) => {
      setPage(page);
      setPages(pages);
      if (ref) recordPage(ref, page, pages);
    },
    [ref]
  );

  const width = Dimensions.get("window").width;

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: titre }} />
        <View style={[styles.centre, { backgroundColor: t.colors.fond }]}>
          <Ionicons name="alert-circle" size={48} color={t.colors.danger} />
          <Text style={[styles.erreur, { color: t.colors.texte }]}>{error}</Text>
        </View>
      </>
    );
  }

  if (!uri) {
    return (
      <>
        <Stack.Screen options={{ title: titre }} />
        <View style={[styles.centre, { backgroundColor: t.colors.fond }]}>
          <ActivityIndicator size="large" color={t.colors.vert} />
          <Text style={[styles.chargement, { color: t.colors.texteSecondaire }]}>Chargement du PDF…</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: titre }} />
      <View style={[styles.root, { backgroundColor: "#2B2B2B" }]}>
        <Pdf
          source={{ uri }}
          onLoadComplete={(numberOfPages) => setPages(numberOfPages)}
          onPageChanged={onPageChanged}
          onError={(e) => setErr(String(e))}
          page={1}
          enablePaging={false}
          enableAntialiasing
          fitPolicy={2}
          style={[styles.pdf, { width, height: "100%" }]}
        />

        {/* Barre flottante : favori + indicateur de page */}
        <View
          pointerEvents="box-none"
          style={[styles.barre, { bottom: insets.bottom + 12 }]}
        >
          <View style={[styles.pillule, { backgroundColor: "rgba(15,17,15,0.85)" }]}>
            <Text style={styles.pageTexte}>
              {pages > 0 ? `Page ${page} / ${pages}` : "…"}
            </Text>
          </View>
          <Pressable
            onPress={() => ref && toggle(ref)}
            style={[styles.boutonFav, { backgroundColor: "rgba(15,17,15,0.85)" }]}
          >
            <Ionicons name={estFavori ? "star" : "star-outline"} size={22} color={estFavori ? "#F2B705" : "#fff"} />
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.boutonFav, { backgroundColor: "rgba(15,17,15,0.85)" }]}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  pdf: { flex: 1 },
  erreur: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  chargement: { fontSize: 14 },
  barre: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pillule: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pageTexte: { color: "#fff", fontSize: 13, fontWeight: "600" },
  boutonFav: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});
