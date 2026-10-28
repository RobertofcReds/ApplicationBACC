#!/usr/bin/env node
/**
 * fetch-annales.mjs — Télécharge les sujets du Baccalauréat de Madagascar (PDF)
 * depuis le catalogue public du CSJ Mahamasina et les range dans assets/pdfs/.
 *
 * Structure de sortie : assets/pdfs/<serie>/<matiere>/<annee>_<id>.pdf
 * Le manifeste scripts/manifest.json recense chaque fichier téléchargé.
 *
 * Usage : node scripts/fetch-annales.mjs [--force]
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const API = "https://csjmahamasina.com/getSujets";
const BASE_PDF = "https://csjmahamasina.com/pdf/";
const OUT_DIR = path.join(ROOT, "assets", "pdfs");

const CONCURRENCY = 6;
const RETRIES = 3;
const TIMEOUT_MS = 30_000;

const force = process.argv.includes("--force");

/** Normalise une matière en identifiant de dossier. */
function slugMatiere(m) {
  return m
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

/** Extrait {serie, matiere, annee} du libellé « Bacc Série X Madagascar - Matière - Session YYYY ». */
function parseSujet(s) {
  const name = s.sujet_display_name ?? "";
  const serieM = name.match(/Série\s+([A-Z0-9-]+)/i);
  const matiere = name.split(" - ")[1]?.trim() || "Inconnu";
  const annee = Number(name.match(/(\d{4})/)?.[1] ?? 0);
  if (!serieM || !annee) return null;
  return {
    id: s.id,
    serie: serieM[1].toUpperCase(),
    matiere,
    matiereSlug: slugMatiere(matiere),
    annee,
    pdf: s.sujet_path_name_pdf,
  };
}

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Télécharge un PDF avec retries ; retourne true si écrit, false si ignoré/échec. */
async function downloadOne(s) {
  const dir = path.join(OUT_DIR, s.serie, s.matiereSlug);
  const file = path.join(dir, `${s.annee}_${s.id}.pdf`);
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");

  if (!force && (await exists(file))) {
    console.log(`· déjà présent   ${rel}`);
    return { ...s, file: rel, status: "kept" };
  }

  const url = `${BASE_PDF}${s.pdf}.pdf`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
        throw new Error("contenu non-PDF");
      }
      await mkdir(dir, { recursive: true });
      await writeFile(file, buf);
      console.log(`✓ ${rel} (${Math.round(buf.length / 1024)} Ko)`);
      return { ...s, file: rel, status: "downloaded" };
    } catch (err) {
      if (attempt === RETRIES) {
        console.error(`✗ ÉCHEC ${s.serie}/${s.matiereSlug}/${s.annee} : ${err.message}`);
        return { ...s, file: rel, status: "failed", error: String(err.message) };
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

/** Exécute les téléchargements avec une concurrence limitée. */
async function downloadAll(sujets) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < sujets.length) {
      const s = sujets[index++];
      results.push(await downloadOne(s));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

async function main() {
  console.log("Récupération du catalogue CSJ Mahamasina…");
  const res = await fetch(API, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`API inaccessible : HTTP ${res.status}`);
  const raw = await res.json();
  const parsed = raw.map(parseSujet).filter(Boolean);
  console.log(`${parsed.length} sujets exploitables sur ${raw.length}.\n`);

  const results = await downloadAll(parsed);

  const ok = results.filter((r) => r.status !== "failed");
  const failed = results.filter((r) => r.status === "failed");
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: API,
    count: ok.length,
    sujets: ok.map(({ id, serie, matiere, annee, file }) => ({ id, serie, matiere, annee, file })),
  };
  await writeFile(path.join(ROOT, "scripts", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\nTerminé : ${ok.length} PDF prêts, ${failed.length} échec(s).`);
  if (failed.length) {
    console.log("Échecs consignés ci-dessus — relancez le script pour retenter.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
