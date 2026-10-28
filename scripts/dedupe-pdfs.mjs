#!/usr/bin/env node
/**
 * dedupe-pdfs.mjs — Supprime les PDF identiques dans assets/pdfs/.
 *
 * Le CSJ expose la même épreuve sous plusieurs niveaux (ex. « Série C-D » listée
 * en bacC ET bacD) : les fichiers téléchargés sont donc des copies exactes.
 * On garde un seul fichier par clé (serie/matiere/annee) — vérifié par md5.
 *
 * Usage : node scripts/dedupe-pdfs.mjs
 */
import { readdir, readFile, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PDF_DIR = path.join(ROOT, "assets", "pdfs");

async function collect(dir, base = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) files.push(...(await collect(path.join(dir, e.name), rel)));
    else if (e.name.toLowerCase().endsWith(".pdf")) files.push(rel);
  }
  return files;
}

async function main() {
  const files = await collect(PDF_DIR);
  const groups = new Map(); // clé sans id -> {hash, kept, dupes[]}

  for (const rel of files) {
    const key = rel.replace(/_\d+\.pdf$/i, ".pdf");
    const buf = await readFile(path.join(PDF_DIR, rel));
    const hash = createHash("md5").update(buf).digest("hex");

    const g = groups.get(key);
    if (!g) {
      groups.set(key, { hash, kept: rel });
    } else if (g.hash === hash) {
      g.dupes = g.dupes ?? [];
      g.dupes.push(rel);
    } else {
      console.error(`✗ CONFLIT (contenus différents, conservés) : ${g.kept} ≠ ${rel}`);
    }
  }

  let removed = 0;
  for (const g of groups.values()) {
    for (const dup of g.dupes ?? []) {
      await unlink(path.join(PDF_DIR, dup));
      console.log(`✗ doublon supprimé : ${dup}`);
      removed++;
    }
  }
  console.log(`\n${removed} doublon(s) supprimé(s), ${files.length - removed} fichiers conservés.`);
}

main().catch((err) => {
  console.error("Erreur fatale :", err.message);
  process.exit(1);
});
