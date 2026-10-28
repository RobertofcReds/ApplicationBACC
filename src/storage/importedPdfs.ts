import { Directory, File, Paths } from "expo-file-system";
import { addImporte, getImportes, removeImporte, type ImporteEntry } from "./storage";

const IMPORTS_DIRNAME = "pdfs_importes";

/** Répertoire local (persistant) des PDF importés par l'utilisateur. */
function dir() {
  return new Directory(Paths.document, IMPORTS_DIRNAME);
}

/**
 * Ouvre le sélecteur système, copie le PDF choisi dans le stockage local
 * de l'app et l'enregistre dans le registre AsyncStorage.
 */
export async function importPdfFromDevice(): Promise<{ ok: boolean; message: string; entry?: ImporteEntry }> {
  let src: File | null = null;
  try {
    const res: unknown = await File.pickFileAsync({ mimeTypes: ["application/pdf"] });
    const picked = res as { result?: File | null; canceled?: boolean } | null;
    if (!picked || picked.canceled || !picked.result) {
      return { ok: false, message: "Import annulé." };
    }
    src = picked.result;
  } catch {
    return { ok: false, message: "Sélecteur indisponible sur cet appareil." };
  }
  const rawName = src.name ?? `import-${Date.now()}.pdf`;
  const safe = (rawName.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_") || `import-${Date.now()}`).replace(/\.pdf$/i, "");

  const d = dir();
  if (!d.exists) d.create({ intermediates: true });
  const dest = new File(d, `${safe}.pdf`);
  if (dest.exists) dest.delete();
  await src.copy(dest, { overwrite: true });

  const entry: ImporteEntry = {
    id: `imp_${Date.now()}`,
    titre: safe.replace(/_+/g, " ").trim(),
    file: `${safe}.pdf`,
    date: Date.now(),
    tailleKo: Math.round((src.size ?? 0) / 1024),
  };
  await addImporte(entry);
  return { ok: true, message: `« ${entry.titre} » ajouté.`, entry };
}

/** URI locale d'un PDF importé, undefined si le fichier a disparu. */
export function importedUri(entry: ImporteEntry): string | undefined {
  try {
    const f = new File(dir(), entry.file);
    return f.exists ? f.uri : undefined;
  } catch {
    return undefined;
  }
}

/** Supprime un PDF importé (fichier + entrée du registre). */
export async function deleteImportedPdf(entry: ImporteEntry): Promise<void> {
  try {
    const f = new File(dir(), entry.file);
    if (f.exists) f.delete();
  } catch {
    // fichier déjà absent : on purge quand même le registre
  }
  await removeImporte(entry.id);
}

export type { ImporteEntry };
export { getImportes };
