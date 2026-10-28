#!/usr/bin/env node
/**
 * fetch-educmad.mjs — Télécharge les annales du NOUVEAU BAC (séries L, S, OSE)
 * depuis EDUCMAD (mediatheque.accesmad.org), cours 1757-1765.
 *
 * Sortie : assets/pdfs/<S|L|OSE>/<matiere>/<annee>[_corrige|_bacblanc]_<resId>.pdf
 * plus scripts/manifest_educmad.json.
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "http://mediatheque.accesmad.org/educmad/";
const OUT_DIR = path.join(ROOT, "assets", "pdfs");
const SCRAPE = process.env.SCRAPE_DIR ?? "/tmp/bac_scrape";

const COURS = {
  1757: { serie: "OSE", matiere: "mathematiques" },
  1758: { serie: "S", matiere: "mathematiques" },
  1759: { serie: "L", matiere: "mathematiques" },
  1760: { serie: "OSE", matiere: "sciences_physiques" },
  1761: { serie: "L", matiere: "sciences_de_la_vie_et_de_la_terre" },
  1762: { serie: "S", matiere: "sciences_physiques" },
  1763: { serie: "S", matiere: "sciences_de_la_vie_et_de_la_terre" },
  1764: { serie: "OSE", matiere: "sciences_de_la_vie_et_de_la_terre" },
  1765: { serie: "L", matiere: "sciences_physiques" },
};

const CONCURRENCY = 5;

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Classe une ressource : énoncé officiel, corrigé ou bac blanc. */
function classifier(titre) {
  const t = titre.toLowerCase();
  if (t.includes("blanc")) return "bacblanc";
  if (t.includes("corrig")) return "corrige";
  return "sujet";
}

function detecterAnnee(titre) {
  return Number(titre.match(/(20[12]\d)/)?.[1] ?? 0);
}

async function downloadOne({ rid, titre, pdfPath, cible }) {
  const { serie, matiere } = cible;
  const genre = classifier(titre);
  const annee = detecterAnnee(titre);
  const suffixe = genre === "sujet" ? "" : `_${genre}`;
  const dir = path.join(OUT_DIR, serie, matiere);
  const file = path.join(dir, `${annee}${suffixe}_${rid}.pdf`);
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");

  if (!annee) {
    console.warn(`⚠ année introuvable dans « ${titre} » — ignoré`);
    return null;
  }
  if (await exists(file)) {
    console.log(`· déjà présent   ${rel}`);
    return { rid, serie, matiere, annee, genre, titre, file: rel, status: "kept" };
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
      return { rid, serie, matiere, annee, genre, titre, file: rel, status: "downloaded" };
    } catch (err) {
      if (attempt === 3) {
        console.error(`✗ ÉCHEC ${titre} : ${err.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function main() {
  // Re-scrappe les pages de ressources pour fraîcheur, ou réutilise educ_resources.txt
  const lignes = (await readFile(path.join(SCRAPE, "educ_resources.txt"), "utf8"))
    .split("\n")
    .filter((l) => l.trim());

  const jobs = [];
  for (const ligne of lignes) {
    const [rid, titre, pdfPath] = ligne.split("|");
    if (!pdfPath) continue;
    // détecte le cours cible via le titre « Série X - Matière : ... »
    let cible = null;
    for (const [cid, info] of Object.entries(COURS)) {
      const c = info;
      const t = titre.toLowerCase();
      const serieMatch = t.includes(`série ${c.serie.toLowerCase()}`) || t.includes(`serie ${c.serie.toLowerCase()}`);
      const matMatch =
        (c.matiere === "mathematiques" && t.includes("math")) ||
        (c.matiere === "sciences_physiques" && (t.includes("physique") || t.includes("spc") || t.includes(" pc "))) ||
        (c.matiere === "sciences_de_la_vie_et_de_la_terre" && t.includes("svt"));
      if (serieMatch && matMatch) {
        cible = c;
        break;
      }
    }
    if (!cible) {
      console.warn(`⚠ sans cours cible (rid ${rid}) : ${titre}`);
      continue;
    }
    jobs.push({ rid, titre, pdfPath, cible });
  }

  console.log(`${jobs.length} PDF à télécharger.\n`);
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
  await writeFile(path.join(ROOT, "scripts", "manifest_educmad.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nTerminé : ${results.length} PDF.`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
