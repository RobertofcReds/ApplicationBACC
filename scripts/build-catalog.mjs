#!/usr/bin/env node
/**
 * build-catalog.mjs — Scanne assets/pdfs/ et génère :
 *  - src/data/catalog.json  (séries VIRTUELLES fusionnées, sans doublon, sans corrigés)
 *  - src/data/assetMap.ts   (table de require() statique pour Metro)
 *
 * Séries affichées : A, C, D, L, S, OSE + TECHNIQUE.
 * Les dossiers réels (A, A2, A-C-D, A-L, C-D, CD…) sont fusionnés dans la ou les
 * séries virtuelles auxquelles ils appartiennent. Un même PDF peut donc servir
 * plusieurs séries (ex. « Séries C & D » apparaît dans C et dans D) — il n'est
 * embarqué qu'une seule fois (require() du même fichier).
 *
 * Les corrigés (fichiers *_corrige_*.pdf) sont EXCLUS à la demande de l'utilisateur.
 */
import { readdir, writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PDF_DIR = path.join(ROOT, "assets", "pdfs");
const OUT_DATA = path.join(ROOT, "src", "data");

/* ------------------------- Séries virtuelles ------------------------- */

const VIRTUAL_SERIES = [
  { id: "A", label: "Série A", dirs: ["A", "A2", "A-C-D", "A-L"] },
  { id: "C", label: "Série C", dirs: ["C", "C-D", "A-C-D"] },
  { id: "D", label: "Série D", dirs: ["D", "C-D", "A-C-D"] },
  { id: "L", label: "Série L", dirs: ["L", "A-L"] },
  { id: "S", label: "Série S", dirs: ["S"] },
  { id: "OSE", label: "Série OSE", dirs: ["OSE"] },
  { id: "TECHNIQUE", label: "Bac Technique", dirs: ["TECHNIQUE"] },
];

/* --------------------------- Libellés matières --------------------------- */

const MATIERE_LABELS = {
  malagasy: "Malagasy",
  francais: "Français",
  mathematiques: "Mathématiques",
  philosophie: "Philosophie",
  anglais: "Anglais",
  sciences_physiques: "Sciences Physiques",
  sciences_de_la_vie_et_de_la_terre: "SVT",
  histoire_geographie: "Histoire-Géographie",
  education_civique: "Éducation Civique",
  sciences_economiques_et_sociales: "Sciences Éco. et Sociales",
  espagnol: "Espagnol",
  allemand: "Allemand",
  eps: "Éducation Physique",

  // Épreuves du BAC technique
  analyse: "Analyse",
  analyse_de_reparation: "Analyse de Réparation",
  analyse_et_organisation_de_production: "Analyse et Organisation de Production",
  automatisme: "Automatisme",
  dessin: "Dessin",
  dessin_et_technologie_de_construction: "Dessin et Technologie de Construction",
  dessin_industriel: "Dessin Industriel",
  electronique: "Électronique",
  electrotechnique: "Électrotechnique",
  entrepreneuriat: "Entrepreneuriat",
  etude_d_equipement: "Étude d'Équipement",
  etude_de_realisation: "Étude de Réalisation",
  geometrie_descriptive: "Géométrie Descriptive",
  hydraulique: "Hydraulique",
  mecanique: "Mécanique",
  mecanique_rdm: "Mécanique / RDM",
  mesures_et_essais: "Mesures et Essais",
  methodes_d_usinage: "Méthodes d'Usinage",
  morex: "Morex",
  schema: "Schéma",
  technologie: "Technologie",
  technologie_d_automobile: "Technologie d'Automobile",
  technologie_generale: "Technologie Générale",
  technologie_professionnelle: "Technologie Professionnelle",
  topographie: "Topographie",
  tracage: "Traçage",
  tracage_et_geometrie_descriptive: "Traçage et Géométrie Descriptive",
};

function labelMatiere(slug) {
  if (MATIERE_LABELS[slug]) return MATIERE_LABELS[slug];
  // repli : « mon_slug » → « Mon slug »
  return slug
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ------------------------------ Scan PDFs ------------------------------ */

async function collectPdfs(dir, base = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) files.push(...(await collectPdfs(path.join(dir, e.name), rel)));
    else if (e.name.toLowerCase().endsWith(".pdf")) files.push(rel);
  }
  return files;
}

/** « 2015_118.pdf », « 2021_corrige_46227.pdf », « 2023_bacblanc_57660.pdf ». */
function parseNom(name) {
  const m = name.match(/(\d{4})(?:_(corrige|bacblanc))?_(\d+)\.pdf$/i);
  if (!m) return null;
  const genre = (m[2] ?? "sujet").toLowerCase();
  return { annee: Number(m[1]), genre, id: Number(m[3]) };
}

/* ------------------------------- Génération ------------------------------- */

async function main() {
  const relFiles = await collectPdfs(PDF_DIR);
  if (relFiles.length === 0) {
    console.error("Aucun PDF dans assets/pdfs — lancez d'abord les scripts fetch-*.");
    process.exit(1);
  }

  // Titres réels (épreuves détaillées) issus des manifestes EDUCMAD : rid -> titre
  const titres = new Map();
  for (const mf of ["manifest_educmad.json", "manifest_educmad_acd.json"]) {
    try {
      const data = JSON.parse(await readFile(path.join(ROOT, "scripts", mf), "utf8"));
      for (const s of data.sujets ?? []) {
        if (s.titre) titres.set(String(s.rid), s.titre);
      }
    } catch {
      // manifeste absent : on garde les titres génériques
    }
  }

  // virtual -> matiere -> docs[]
  const virtuels = new Map(VIRTUAL_SERIES.map((v) => [v.id, new Map()]));
  const assetEntries = [];
  const clesVues = new Set();
  let nCorrige = 0;

  for (const rel of relFiles) {
    const [serieDir, matiereDir, fileName] = rel.split("/");
    const parsed = parseNom(fileName);
    if (!parsed) {
      console.warn(`⚠ nom non reconnu, ignoré : ${rel}`);
      continue;
    }
    const { annee, genre, id } = parsed;
    if (genre === "corrige") {
      nCorrige++;
      continue; // corrigés exclus (sujets uniquement)
    }
    const slug = matiereDir;
    const suffixe = genre === "sujet" ? "" : `_${genre}`;
    const genreLabel =
      genre === "corrige" ? "Corrigé" : genre === "bacblanc" ? "Bac blanc" : "Session";

    // Séries virtuelles cibles pour ce dossier réel
    const cibles = VIRTUAL_SERIES.filter((v) => v.dirs.includes(serieDir));
    if (cibles.length === 0) {
      console.warn(`⚠ dossier hors séries virtuelles : ${rel}`);
      continue;
    }

    for (const v of cibles) {
      // Clé unique par série virtuelle ; suffixe d'origine en cas de collision
      let assetKey = `${v.id}/${slug}/${annee}${suffixe}_${id}`;
      if (clesVues.has(assetKey)) assetKey = `${v.id}/${slug}/${annee}${suffixe}_${id}_${serieDir}`;
      if (clesVues.has(assetKey)) {
        console.warn(`⚠ clé dupliquée, ignorée : ${assetKey}`);
        continue;
      }
      clesVues.add(assetKey);
      assetEntries.push([assetKey, `../../assets/pdfs/${rel}`]);

      const titreReel = titres.get(String(id));
      const titre = titreReel
        ? titreReel.replace(/^\s*[^:|]+:\s*/, "").trim()
        : `${labelMatiere(slug)} — ${genreLabel} ${annee}`;

      const matieres = virtuels.get(v.id);
      if (!matieres.has(slug)) matieres.set(slug, []);
      matieres.get(slug).push({
        id: `${v.id}-${serieDir}-${slug}-${annee}${suffixe}-${id}`,
        annee,
        genre,
        sourceId: id,
        file: `assets/pdfs/${rel}`,
        assetKey,
        titre,
      });
    }
  }

  // Sérialisation ordonnée
  const seriesOut = VIRTUAL_SERIES.map((v) => {
    const matieres = virtuels.get(v.id);
    return {
      id: v.id,
      label: v.label,
      matieres: [...matieres.keys()]
        .sort((a, b) => labelMatiere(a).localeCompare(labelMatiere(b)))
        .map((slug) => {
          const docs = matieres
            .get(slug)
            .sort((a, b) => b.annee - a.annee || a.genre.localeCompare(b.genre) || a.sourceId - b.sourceId);
          return {
            id: slug,
            label: labelMatiere(slug),
            docs,
            anneeMin: docs.at(-1).annee,
            anneeMax: docs[0].annee,
          };
        }),
    };
  }).filter((s) => s.matieres.length > 0);

  const totalDocs = seriesOut.reduce(
    (n, s) => n + s.matieres.reduce((m, mat) => m + mat.docs.length, 0),
    0
  );

  const catalog = {
    generatedAt: new Date().toISOString(),
    totalDocs,
    packRequis: false,
    series: seriesOut,
  };

  await mkdir(OUT_DATA, { recursive: true });
  await writeFile(path.join(OUT_DATA, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");

  const assetMapTs = `/**
 * GÉNÉRÉ AUTOMATIQUEMENT par scripts/build-catalog.mjs — ne pas éditer à la main.
 * Table de correspondance assetKey -> module PDF (require statique pour Metro).
 */
export const assetMap: Record<string, number> = {
${assetEntries
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, mod]) => `  "${key}": require("${mod}"),`)
  .join("\n")}
};
`;
  await writeFile(path.join(OUT_DATA, "assetMap.ts"), assetMapTs);

  console.log(
    `Catalogue généré : ${totalDocs} documents, ${seriesOut.length} séries virtuelles, ${nCorrige} corrigés exclus.`
  );
  for (const s of seriesOut) {
    const n = s.matieres.reduce((m, mat) => m + mat.docs.length, 0);
    console.log(`  ${s.label.padEnd(14)} ${String(n).padStart(4)} docs — ${s.matieres.length} matières`);
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
