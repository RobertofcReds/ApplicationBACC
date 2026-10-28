import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import catalogJson from "../src/data/catalog.json";

const ROOT = path.resolve(__dirname, "..");

type Doc = { assetKey: string; file: string; genre?: string };
type Serie = { id: string; label: string; matieres: { id: string; docs: Doc[] }[] };
const meta = catalogJson as { totalDocs: number; packRequis?: boolean; series: Serie[] };
const series = meta.series;

/** Séries virtuelles attendues après la fusion v1.5 (aucune série redondante). */
const SERIES_ATTENDUES = ["A", "C", "D", "L", "S", "OSE", "TECHNIQUE"].sort();

function iterDocs(cb: (doc: Doc, serie: string) => void) {
  for (const s of series) for (const m of s.matieres) for (const d of m.docs) cb(d, s.id);
}

describe("catalogue embarqué", () => {
  it("expose les 7 séries virtuelles (A, C, D, L, S, OSE, TECHNIQUE) sans doublon", () => {
    expect(series.map((s) => s.id).sort()).toEqual(SERIES_ATTENDUES);
    expect(series).toHaveLength(7);
  });

  it("chaque document pointe vers un PDF réellement présent sur le disque", () => {
    let n = 0;
    iterDocs((doc) => {
      n++;
      const p = path.join(ROOT, doc.file);
      expect(existsSync(p), `fichier manquant : ${doc.file}`).toBe(true);
      expect(statSync(p).size, `fichier vide : ${doc.file}`).toBeGreaterThan(1000);
    });
    expect(n).toBe(meta.totalDocs);
    expect(n).toBeGreaterThan(500); // 407 historiques + technique + 2026
  });

  it("ne contient plus aucun corrigé (sujets uniquement, à la demande)", () => {
    iterDocs((doc) => {
      expect(doc.genre, `corrigé encore présent : ${doc.assetKey}`).not.toBe("corrige");
      expect(/_corrige_/.test(doc.file), `fichier corrigé référencé : ${doc.file}`).toBe(false);
    });
  });

  it("les clés sont uniques et appartiennent à la série qui les expose", () => {
    const cles = new Set<string>();
    iterDocs((doc, serie) => {
      expect(cles.has(doc.assetKey), `clé dupliquée : ${doc.assetKey}`).toBe(false);
      cles.add(doc.assetKey);
      expect(doc.assetKey.startsWith(`${serie}/`), `clé hors série : ${doc.assetKey}`).toBe(true);
    });
  });

  it("assetMap.ts est cohérent avec le catalogue (mode tout-embarqué)", () => {
    expect(meta.packRequis).toBe(false);
    const src = readFileSync(path.join(ROOT, "src", "data", "assetMap.ts"), "utf8");
    const keys = [...src.matchAll(/"([^"]+)":\s*require\(/g)].map((m) => m[1]);
    expect(keys).toHaveLength(meta.totalDocs);
    iterDocs((doc) => {
      expect(keys).toContain(doc.assetKey);
    });
    for (const m of src.matchAll(/require\("(\.\.[^"]+)"\)/g)) {
      const p = path.resolve(ROOT, "src", "data", m[1]);
      expect(existsSync(p), `module manquant : ${m[1]}`).toBe(true);
    }
  });
});
