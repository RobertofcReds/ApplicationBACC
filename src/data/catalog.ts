/**
 * Accès typé au catalogue généré (src/data/catalog.json) et à assetMap.ts.
 * Le catalogue référence chaque PDF embarqué dans l'APK.
 */
import rawCatalog from "./catalog.json";
import { assetMap } from "./assetMap";

export type Doc = {
  id: string;
  annee: number;
  genre: string;
  sourceId: number;
  file: string;
  assetKey: string;
  titre: string;
};

export type Matiere = {
  id: string;
  label: string;
  docs: Doc[];
  anneeMin: number;
  anneeMax: number;
};

export type Serie = {
  id: string;
  label: string;
  matieres: Matiere[];
};

export type Catalog = {
  generatedAt: string;
  totalDocs: number;
  series: Serie[];
};

export const catalog = rawCatalog as Catalog;

export const MATIERE_ICONS: Record<string, string> = {
  malagasy: "language",
  francais: "language",
  mathematiques: "calculator",
  philosophie: "bulb-outline",
  anglais: "globe",
  sciences_physiques: "flask",
  sciences_de_la_vie_et_de_la_terre: "leaf",
  histoire_geographie: "earth",
  education_civique: "school",
  // Épreuves du BAC technique
  dessin: "pencil",
  dessin_industriel: "pencil",
  dessin_et_technologie_de_construction: "pencil",
  technologie: "construct",
  technologie_generale: "construct",
  technologie_professionnelle: "construct",
  technologie_d_automobile: "car-sport-outline",
  electrotechnique: "flash",
  electronique: "hardware-chip-outline",
  mecanique: "cog",
  mecanique_rdm: "cog",
  topographie: "map-outline",
  hydraulique: "water-outline",
  schema: "grid-outline",
  automatisme: "settings-outline",
  mesures_et_essais: "speedometer-outline",
  geometrie_descriptive: "square-outline",
  tracage: "compass-outline",
  tracage_et_geometrie_descriptive: "compass-outline",
  methodes_d_usinage: "build-outline",
  entrepreneuriat: "trending-up-outline",
  etude_d_equipement: "layers-outline",
  etude_de_realisation: "hammer-outline",
  morex: "cube-outline",
  analyse: "stats-chart-outline",
  analyse_de_reparation: "stats-chart-outline",
  analyse_et_organisation_de_production: "git-network-outline",
};

/** Tous les documents à plat (recherche globale). */
export function allDocs(): (Doc & { serie: string; serieLabel: string; matiere: string; matiereLabel: string })[] {
  const out: (Doc & { serie: string; serieLabel: string; matiere: string; matiereLabel: string })[] = [];
  for (const s of catalog.series) {
    for (const m of s.matieres) {
      for (const d of m.docs) {
        out.push({ ...d, serie: s.id, serieLabel: s.label, matiere: m.id, matiereLabel: m.label });
      }
    }
  }
  return out;
}

export function findSerie(id: string): Serie | undefined {
  return catalog.series.find((s) => s.id === id);
}

export function resolveDoc(assetKey: string) {
  for (const d of allDocs()) if (d.assetKey === assetKey) return d;
  return undefined;
}

/** Module require() du PDF pour expo-asset (chemin statique Metro). */
export function assetModule(assetKey: string): number | undefined {
  return assetMap[assetKey];
}
