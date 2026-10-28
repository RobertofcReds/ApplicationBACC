import { unzip, subscribe, type ZipProgressEvent } from "react-native-zip-archive";
import { Directory, File, Paths } from "expo-file-system";

const PACK_NAME = "bac-madagascar-pack.zip";
const UNPACK_DIRNAME = "pack_pdfs";
const UNPACK_SUBDIR = "pdfs"; // nom du dossier racine à l'intérieur du zip

/** Version du pack (bump à chaque import/suppression) pour réactivité UI. */
let packVersion = 0;
export function getPackVersion(): number {
  return packVersion;
}

/** Dossier local (persistant) où le pack est dézippé. */
function packDir(): Directory {
  return new Directory(Paths.document, UNPACK_DIRNAME);
}

/** Dossier racine des PDF une fois le pack installé : pack_pdfs/pdfs/. */
function packRoot(): Directory {
  return new Directory(packDir(), UNPACK_SUBDIR);
}

/** Vrai si le pack est déjà installé (dossier pdfs/ présent). */
export function isPackInstalled(): boolean {
  try {
    return packRoot().exists;
  } catch {
    return false;
  }
}

/**
 * Importe le fichier .zip choisi par l'utilisateur puis le dézippe localement.
 * La progression (0→100) est suivie via l'événement global de la lib.
 */
export async function importPack(
  onProgress?: (pct: number) => void
): Promise<{ ok: boolean; message: string }> {
  let picked: { result?: File; canceled?: boolean } | null = null;
  try {
    picked = (await File.pickFileAsync({
      mimeTypes: ["application/zip", "application/x-zip-compressed"],
    })) as { result?: File; canceled?: boolean } | null;
  } catch {
    return { ok: false, message: "Sélecteur indisponible sur cet appareil." };
  }
  if (!picked || picked.canceled || !picked.result) {
    return { ok: false, message: "Import annulé." };
  }

  const src = picked.result as File;

  // Progression : la lib émet des événements globaux pendant le dézippage
  const sub = subscribe((event: ZipProgressEvent) => {
    if (onProgress && event?.filePath === src.uri) {
      onProgress(Math.round(event.progress * 100));
    }
  });

  try {
    const target = new Directory(Paths.document, `pack_tmp_${Date.now()}`);
    await unzip(src.uri, target.uri, "UTF-8");
    sub.remove();

    // Le zip contient « pdfs/… » → on déplace ce dossier vers pack_pdfs/pdfs
    const finalDir = packDir();
    if (finalDir.exists) finalDir.delete();
    const inner = new Directory(target, UNPACK_SUBDIR);
    const dest = finalDir;
    dest.create({ intermediates: true });
    if (inner.exists) {
      for (const item of inner.list()) {
        item.move(dest);
      }
    } else {
      // variante : le zip contient directement serie/matiere/…
      for (const item of target.list()) {
        item.move(dest);
      }
    }
    target.delete();
    packVersion++;
    onProgress?.(100);
    return { ok: true, message: `Pack installé : ${countPdfs()} sujets disponibles.` };
  } catch (e) {
    sub.remove();
    return { ok: false, message: `Dézippage impossible : ${String(e)}` };
  }
}

/** Compte les PDF du pack installé. */
export function countPdfs(): number {
  try {
    let n = 0;
    const walk = (dir: Directory): void => {
      for (const item of dir.list()) {
        if (item instanceof Directory) walk(item);
        else if (item instanceof File && item.name.toLowerCase().endsWith(".pdf")) n++;
      }
    };
    walk(packRoot());
    return n;
  } catch {
    return 0;
  }
}

/** Supprime le pack installé (libère le stockage). */
export function removePack(): void {
  try {
    const d = packDir();
    if (d.exists) d.delete();
    packVersion++;
  } catch {
    // déjà absent
  }
}

/**
 * URI locale d'un PDF du pack.
 * relPath = chemin du catalogue, ex. « assets/pdfs/S/francais/2023_57582.pdf »
 * → fichier installé : pack_pdfs/pdfs/S/francais/2023_57582.pdf
 */
export function packPdfUri(relPath: string): string | undefined {
  try {
    const rel = relPath.replace(/^assets\/pdfs\//, "");
    const f = new File(packRoot(), rel);
    return f.exists ? f.uri : undefined;
  } catch {
    return undefined;
  }
}

export { PACK_NAME };
