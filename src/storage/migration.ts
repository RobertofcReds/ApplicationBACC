/**
 * migration.ts — Migration automatique des clés legacy après la fusion des
 * séries (v1.5). Les favoris et l'historique enregistrés avec les anciennes
 * clés (ex. « A2/malagasy/2015_123 », « C-D/francais/2023_57660 ») sont
 * re-mappés vers les nouvelles clés de séries virtuelles (A, C, D, L, S, OSE,
 * TECHNIQUE) en retrouvant le document par (sourceId, année, matière).
 * Les favoris de corrigés sont abandonnés (les corrigés ne sont plus embarqués).
 */
import { allDocs } from "../data/catalog";
import {
  ecraserFavoris,
  ecraserHistorique,
  getFavoris,
  getHistorique,
  lireStore,
  ecrireStore,
  type DocRef,
  type HistoriqueEntry,
} from "./storage";

const K_MIGRATION = "bac.mg.migration.v15";

/** Extrait (dossier série, matière, année, genre, id) d'une clé legacy ou actuelle. */
function parserCle(assetKey: string) {
  const m = assetKey.match(/^([^/]+)\/([^/]+)\/(\d{4})(?:_(corrige|bacblanc))?_(\d+)(?:_.*)?$/);
  if (!m) return null;
  return {
    serieDir: m[1],
    matiere: m[2],
    annee: Number(m[3]),
    genre: m[4] ?? "sujet",
    sourceId: Number(m[5]),
  };
}

type DocIndex = { assetKey: string; titre: string; serieLabel: string; matiereLabel: string };
let indexParDoc: Map<string, DocIndex>;
let clesActuelles: Set<string>;

function indexer() {
  if (indexParDoc) return { indexParDoc, clesActuelles };
  indexParDoc = new Map();
  clesActuelles = new Set();
  for (const d of allDocs()) {
    clesActuelles.add(d.assetKey);
    const cle = `${d.sourceId}|${d.annee}|${d.matiere}`;
    if (!indexParDoc.has(cle)) {
      indexParDoc.set(cle, {
        assetKey: d.assetKey,
        titre: d.titre,
        serieLabel: d.serieLabel,
        matiereLabel: d.matiereLabel,
      });
    }
  }
  return { indexParDoc, clesActuelles };
}

function remapper<T extends DocRef>(entry: T): T | null {
  const { indexParDoc: idx, clesActuelles: actuelles } = indexer();
  if (actuelles.has(entry.assetKey)) return entry; // déjà à jour

  const p = parserCle(entry.assetKey);
  if (!p) return null; // clé imparsable
  if (p.genre === "corrige") return null; // corrigés supprimés
  const nouveau = idx.get(`${p.sourceId}|${p.annee}|${p.matiere}`);
  if (!nouveau) return null; // document disparu du catalogue
  return {
    ...entry,
    assetKey: nouveau.assetKey,
    titre: nouveau.titre,
    serie: nouveau.serieLabel,
    matiere: nouveau.matiereLabel,
  };
}

/** Fait tourner la migration une seule fois (no-op si déjà faite). */
export async function migrerCles(): Promise<void> {
  try {
    const dejaFait = await lireStore<boolean>(K_MIGRATION, false);
    if (dejaFait) return;

    const favoris = await getFavoris();
    const historique = await getHistorique();

    const favorisVus = new Set<string>();
    const favorisNew = favoris
      .map(remapper)
      .filter((f): f is DocRef => !!f)
      .filter((f) => !favorisVus.has(f.assetKey) && favorisVus.add(f.assetKey));

    const histVus = new Set<string>();
    const histNew = historique
      .map(remapper)
      .filter((h): h is HistoriqueEntry => !!h)
      .filter((h) => !histVus.has(h.assetKey) && histVus.add(h.assetKey));

    if (favorisNew.length !== favoris.length) await ecraserFavoris(favorisNew);
    if (histNew.length !== historique.length) await ecraserHistorique(histNew);

    await ecrireStore(K_MIGRATION, true);
  } catch {
    // migration best-effort : ne bloque jamais le démarrage
  }
}
