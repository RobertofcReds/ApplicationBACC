#!/usr/bin/env node
/**
 * fetch-epreuvesetcorriges.mjs — Télécharge les sujets BAC 2026 (Madagascar)
 * depuis epreuvesetcorriges.com via la liste .scrape/ec_all_articles.txt.
 *
 * Sortie : assets/pdfs/<SERIE>/<matiere>/2026_<id>.pdf
 * Les corrigés sont ignorés (sujets uniquement, à la demande de l'utilisateur).
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "https://epreuvesetcorriges.com";
const OUT_DIR = path.join(ROOT, "assets", "pdfs");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

/** Matières reconnues dans les slugs du site. */
function matiereSlug(slug) {
  const s = slug.toLowerCase();
  if (s.includes("malagasy")) return "malagasy";
  if (s.includes("francais") || s.includes("français")) return "francais";
  if (s.includes("anglais")) return "anglais";
  if (s.includes("philosophie")) return "philosophie";
  if (s.includes("histoire") || s.includes("histo-geo")) return "histoire_geographie";
  if (s.includes("mathematiques") || s.includes("maths")) return "mathematiques";
  if (s.includes("sciences-physiques")) return "sciences_physiques";
  if (s.includes("svt")) return "sciences_de_la_vie_et_de_la_terre";
  if (s.includes("economique") || s.includes("ses")) return "sciences_economiques_et_sociales";
  if (s.includes("espagnol")) return "espagnol";
  if (s.includes("allemand")) return "allemand";
  return null;
}

/** Série dans le slug (« serie-a1-a2 » → A, « serie-s » → S…). */
function serieSlug(slug) {
  const m = slug.toLowerCase().match(/serie-(a1-a2|a1|a2|a-c-d|c-d|[a-z]+)/);
  if (!m) return null;
  let v = m[1].toUpperCase();
  if (v === "A1-A2" || v === "A1" || v === "A2") v = "A"; // série A (A1+A2 fusionnées)
  if (v === "A-C-D") return "A-C-D";
  if (v === "C-D") return "C-D";
  if (/^[ALCDS]$/.test(v)) return v;
  if (v === "OSE") return "OSE";
  return null;
}

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const lignes = (await readFile(path.join(ROOT, ".scrape", "ec_all_articles.txt"), "utf8"))
    .split("\n")
    .filter((l) => l.trim());
  console.log(`${lignes.length} articles à traiter.\n`);

  let ok = 0, skip = 0;
  for (const chemin of lignes) {
    const slug = chemin.split("/").pop() ?? "";
    const id = chemin.match(/\/(\d+)-/)?.[1] ?? "0";
    const annee = Number(slug.match(/bac-(20\d{2})/)?.[1] ?? 0);
    if (/corrig/i.test(slug)) {
      console.log(`· corrigé ignoré : ${slug}`);
      skip++;
      continue;
    }
    const matiere = matiereSlug(slug);
    const serie = serieSlug(slug);
    if (!annee || !matiere || !serie) {
      console.log(`⚠ non classable : ${slug}`);
      skip++;
      continue;
    }
    const dir = path.join(OUT_DIR, serie, matiere);
    const file = path.join(dir, `${annee}_${id}.pdf`);
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    if (await exists(file)) {
      console.log(`· déjà présent ${rel}`);
      ok++;
      continue;
    }
    try {
      const res = await fetch(`${BASE}${chemin}/download`, {
        headers: { "User-Agent": UA, Referer: `${BASE}${chemin}` },
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("non-PDF");
      await mkdir(dir, { recursive: true });
      await writeFile(file, buf);
      console.log(`✓ ${rel} (${Math.round(buf.length / 1024)} Ko)`);
      ok++;
    } catch (e) {
      console.error(`✗ ÉCHEC ${slug} : ${e.message}`);
      skip++;
    }
  }
  console.log(`\nTerminé : ${ok} OK, ${skip} ignorés/échecs.`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
