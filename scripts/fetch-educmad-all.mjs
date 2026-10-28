#!/usr/bin/env node
/**
 * fetch-educmad-all.mjs — Télécharge toutes les annales listées dans
 * .scrape/em_all_resources.txt (rid|titre|courseId) :
 *  - cours généraux A-C-D / L-S-OSE → assets/pdfs/<SERIE>/<matiere>/
 *  - cours techniques (1370-1372)   → assets/pdfs/TECHNIQUE/<matiere>/
 *
 * Les corrigés sont ignorés (demande utilisateur : sujets uniquement).
 * Idempotent : les fichiers déjà présents ne sont pas retéléchargés.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "http://mediatheque.accesmad.org/educmad/";
const OUT_DIR = path.join(ROOT, "assets", "pdfs");
const SRC = path.join(ROOT, ".scrape", "em_all_resources.txt");
const CONCURRENCY = 5;
const COURS_TECH = new Set([1370, 1371, 1372]);

const FILIERES = /\b(CCBTP|PCBTP|DMPCBTP|TMA|MEMA|TMEL|TMF|TOM|TAMB|TFFI|TPFM|EN)\b/g;

/** Slugs techniques normalisés (cohérents avec le dossier assets/pdfs/TECHNIQUE). */
const TECH_MAP = {
  sujet_bacc_maths: "mathematiques",
  automatisme_schema: "automatisme",
  electronique_theorique: "electronique",
  etude_dequipement: "etude_d_equipement",
  hydraulique_pc: "hydraulique",
  initiation_a_l_entrepreneuriat: "entrepreneuriat",
  methodes_dusinages: "methodes_d_usinage",
  morex_pc: "morex",
  technologie_professionnelletmf: "technologie_professionnelle",
  mesures_essais: "mesures_et_essais",
  technologie_pc: "technologie",
};

function ascii(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/** Matière d'un document technique : titre sans filière ni année. */
function matiereTech(titre) {
  let t = titre.replace(/\b(19|20)\d{2}\b/g, " ");
  t = t.replace(FILIERES, " ");
  const slug = ascii(t);
  return (TECH_MAP[slug] ?? slug) || null;
}

/** Normalise une matière générale vers le slug du catalogue existant. */
function matiereSlug(titre) {
  const t = titre.toLowerCase();
  if (t.startsWith("mlg") || t.includes("malagasy")) return "malagasy";
  if (t.startsWith("frs") || t.includes("français") || t.includes("francais")) return "francais";
  if (t.startsWith("ang") || t.includes("anglais")) return "anglais";
  if (t.startsWith("philo")) return "philosophie";
  if (t.includes("histo")) return "histoire_geographie";
  if (t.includes("math")) return "mathematiques";
  if (t.includes("physique") || t.includes("spc") || /\bpc\b/.test(t)) return "sciences_physiques";
  if (t.includes("svt") || t.includes("vie et de la terre")) return "sciences_de_la_vie_et_de_la_terre";
  if (t.includes("ses") || t.includes("économ") || t.includes("econom")) return "sciences_economiques_et_sociales";
  if (t.includes("espagnol")) return "espagnol";
  if (t.includes("allemand")) return "allemand";
  if (t.includes("physique et sportive") || t.startsWith("eps")) return "eps";
  return null;
}

/** Série générale détectée dans le titre (« série C-D », « série L »…). */
function serieSlug(titre) {
  const t = titre.toLowerCase().replace(/ssion/g, "session");
  const m = t.match(/s[ée]rie[s]?\s+([a-z0-9-]+)/);
  if (!m) return null;
  let v = m[1].toUpperCase();
  if (v === "CD") v = "C-D"; // variante d'écriture EDUCMAD
  return v;
}

/** Résout l'URL du PDF derrière une page ressource Moodle. */
async function resoudrePdf(rid) {
  const pageUrl = `${BASE}mod/resource/view.php?id=${rid}&redirect=1`;
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        redirect: "follow",
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ctype = res.headers.get("content-type") ?? "";
      if (ctype.includes("pdf") || (res.url && res.url.includes("pluginfile"))) {
        return { buf: Buffer.from(await res.arrayBuffer()), urlFinal: res.url };
      }
      // Page HTML : cherche le lien pluginfile
      const html = await res.text();
      const m = html.match(/href="([^"]*pluginfile\.php[^"]*)"/);
      if (m) {
        const res2 = await fetch(m[1].replaceAll("&amp;", "&"), {
          headers: { Referer: pageUrl, "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(60_000),
        });
        if (!res2.ok) throw new Error(`HTTP ${res2.status} (pluginfile)`);
        return { buf: Buffer.from(await res2.arrayBuffer()), urlFinal: m[1] };
      }
      throw new Error("pluginfile introuvable");
    } catch (e) {
      if (a === 3) throw e;
      await new Promise((r) => setTimeout(r, 800 * a));
    }
  }
}

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne({ rid, titre, cours }) {
  if (/corrig/i.test(titre)) return { rid, skip: "corrige" };
  const annee = Number(titre.match(/\b(19|20)\d{2}\b/)?.[0] ?? 0);
  const isTech = COURS_TECH.has(Number(cours));
  const matiere = isTech ? matiereTech(titre) : matiereSlug(titre);
  const serie = isTech ? "TECHNIQUE" : serieSlug(titre);
  if (!annee || !matiere || (!isTech && !serie)) {
    console.warn(`⚠ ignoré (rid ${rid}) : ${titre}`);
    return { rid, skip: "non-classable" };
  }
  const dir = path.join(OUT_DIR, serie, matiere);
  const file = path.join(dir, `${annee}_${rid}.pdf`);
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  if (await exists(file)) {
    return { rid, serie, matiere, annee, file: rel, status: "kept" };
  }
  try {
    const { buf } = await resoudrePdf(rid);
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("non-PDF");
    await mkdir(dir, { recursive: true });
    await writeFile(file, buf);
    console.log(`✓ ${rel} (${Math.round(buf.length / 1024)} Ko)`);
    return { rid, serie, matiere, annee, file: rel, status: "downloaded" };
  } catch (e) {
    console.error(`✗ ÉCHEC (rid ${rid}) ${titre} : ${e.message}`);
    return { rid, skip: "echec" };
  }
}

async function main() {
  const { readFile } = await import("node:fs/promises");
  const lignes = (await readFile(SRC, "utf8")).split("\n").filter((l) => l.trim());
  const jobs = lignes
    .map((l) => {
      const [rid, titre, cours] = l.split("|");
      return rid && titre && cours ? { rid, titre, cours } : null;
    })
    .filter(Boolean);
  console.log(`${jobs.length} ressources à traiter.\n`);
  const results = [];
  let i = 0;
  let nOk = 0, nSkip = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < jobs.length) {
        const r = await downloadOne(jobs[i++]);
        results.push(r);
        if (r.skip) nSkip++;
        else nOk++;
      }
    })
  );
  const dl = results.filter((r) => r.status === "downloaded").length;
  const kept = results.filter((r) => r.status === "kept").length;
  console.log(`\nTerminé : ${dl} téléchargés, ${kept} déjà présents, ${nSkip} ignorés (corrigés/non classables).`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
