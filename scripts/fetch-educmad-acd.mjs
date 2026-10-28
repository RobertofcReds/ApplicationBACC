#!/usr/bin/env node
/**
 * fetch-educmad-acd.mjs — Télécharge les annales A/C/D récentes (2019-2026)
 * depuis EDUCMAD à partir du scrape .scrape/educ_acd.txt (rid|titre|chemin_pdf).
 *
 * Sortie : assets/pdfs/<SERIE>/<matiere>/<annee>[_corrige|_bacblanc]_<rid>.pdf
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "http://mediatheque.accesmad.org/educmad/";
const OUT_DIR = path.join(ROOT, "assets", "pdfs");
const SCRAPE = path.join(ROOT, ".scrape", "educ_acd.txt");
const CONCURRENCY = 5;

/** Normalise une matière vers le slug du catalogue existant. */
function matiereSlug(titre) {
  const t = titre.toLowerCase();
  if (t.startsWith("mlg") || t.includes("malagasy")) return "malagasy";
  if (t.startsWith("frs") || t.includes("français") || t.includes("francais")) return "francais";
  if (t.startsWith("ang") || t.includes("anglais")) return "anglais";
  if (t.startsWith("philo")) return "philosophie";
  if (t.includes("histo") || t.includes("histoire")) return "histoire_geographie";
  if (t.includes("math")) return "mathematiques";
  if (t.includes("physique") || t.includes("spc") || t.includes(" pc ")) return "sciences_physiques";
  if (t.includes("svt") || t.includes("vie et de la terre") || t.includes("vie de la terre")) return "sciences_de_la_vie_et_de_la_terre";
  if (t.includes("ses") || t.includes("économie") || t.includes("economie")) return "sciences_economiques_et_sociales";
  if (t.includes("espagnol")) return "espagnol";
  if (t.includes("allemand")) return "allemand";
  if (t.includes("eps") || t.includes("physique et sportive")) return "eps";
  return null;
}

/** Détecte la série depuis le titre (« série C-D », « série A-C-D », « série L », etc.). */
function serieSlug(titre) {
  const t = titre.toLowerCase().replace(/ssion/g, "session");
  const m = t.match(/s[ée]rie[s]?\s+([a-z0-9-]+)/);
  if (!m) return null;
  return m[1].toUpperCase();
}

function classifier(titre) {
  const t = titre.toLowerCase();
  if (t.includes("blanc")) return "bacblanc";
  if (t.includes("corrig")) return "corrige";
  return "sujet";
}

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne({ rid, titre, pdfPath }) {
  const matiere = matiereSlug(titre);
  const serie = serieSlug(titre);
  const annee = Number(titre.match(/(20[12]\d)/)?.[1] ?? 0);
  if (!matiere || !serie || !annee) {
    console.warn(`⚠ ignoré (rid ${rid}) : ${titre}`);
    return null;
  }
  const genre = classifier(titre);
  const suffixe = genre === "sujet" ? "" : `_${genre}`;
  const dir = path.join(OUT_DIR, serie, matiere);
  const file = path.join(dir, `${annee}${suffixe}_${rid}.pdf`);
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");

  if (await exists(file)) {
    console.log(`· déjà présent   ${rel}`);
    return { rid, serie, matiere, annee, genre, file: rel, status: "kept" };
  }

  const url = `${BASE}${pdfPath}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Referer: `${BASE}mod/resource/view.php?id=${rid}` },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("non-PDF");
      await mkdir(dir, { recursive: true });
      await writeFile(file, buf);
      console.log(`✓ ${rel} (${Math.round(buf.length / 1024)} Ko)`);
      return { rid, serie, matiere, annee, genre, file: rel, status: "downloaded" };
    } catch (err) {
      if (attempt === 3) {
        console.error(`✗ ÉCHEC (rid ${rid}) ${titre} : ${err.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function main() {
  const lignes = (await readFile(SCRAPE, "utf8")).split("\n").filter((l) => l.trim());
  const jobs = lignes
    .map((l) => {
      const [rid, titre, pdfPath] = l.split("|");
      return rid && titre && pdfPath ? { rid, titre, pdfPath } : null;
    })
    .filter(Boolean);

  console.log(`${jobs.length} ressources à traiter.\n`);
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < jobs.length) {
        const r = await downloadOne(jobs[i++]);
        if (r) results.push(r);
      }
    })
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: BASE,
    count: results.length,
    sujets: results,
  };
  await writeFile(
    path.join(ROOT, "scripts", "manifest_educmad_acd.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  console.log(`\nTerminé : ${results.length} PDF.`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
