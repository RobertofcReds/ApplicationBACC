#!/usr/bin/env node
/**
 * scrape-educmad-courses.mjs — Scrappe les pages cours EDUCMAD et liste
 * toutes les ressources (rid | titre | courseId) dans .scrape/em_all_resources.txt
 *
 * Cours couverts :
 *  - Annales bacc A-C-D « autres matières » : 130..138, 2152
 *  - Annales bacc A-C-D « sciences » :       816..821
 *  - Annales bacc L-S-OSE :                  1757..1765
 *  - Baccalauréat général (parent) :         1353
 *  - Annales Bacc Techniques :               1370, 1371, 1372
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "http://mediatheque.accesmad.org/educmad/";
const OUT = path.join(ROOT, ".scrape", "em_all_resources.txt");
const CACHE = path.join(ROOT, ".scrape", "courses");

const COURSES = [
  130, 131, 132, 134, 135, 136, 137, 138, 2152,
  816, 817, 818, 819, 820, 821,
  1757, 1758, 1759, 1760, 1761, 1762, 1763, 1764, 1765,
  1353,
  1370, 1371, 1372,
];

async function fetchPage(url) {
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (a === 3) throw e;
      await new Promise((r) => setTimeout(r, 700 * a));
    }
  }
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à");
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  const lignes = [];
  let totalRessources = 0;

  for (const cid of COURSES) {
    const url = `${BASE}course/view.php?id=${cid}`;
    const html = await fetchPage(url);
    await writeFile(path.join(CACHE, `${cid}.html`), html);
    const seen = new Set();
    const re =
      /mod\/resource\/view\.php\?id=(\d+)"[^>]*>[\s\S]{0,300}?instancename">\s*([\s\S]*?)\s*<span class="accesshide/g;
    for (const m of html.matchAll(re)) {
      const rid = m[1];
      const titre = decode(m[2].replace(/<[^>]+>/g, "").trim());
      if (!titre || seen.has(rid)) continue;
      seen.add(rid);
      lignes.push(`${rid}|${titre}|${cid}`);
      totalRessources++;
    }
    console.log(`${String(cid).padEnd(5)} : ${seen.size} ressources`);
  }

  await writeFile(OUT, lignes.join("\n") + "\n");
  console.log(`\nTotal : ${totalRessources} ressources → ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
