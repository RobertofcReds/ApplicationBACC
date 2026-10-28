import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const K_FAVORIS = "bac.mg.favoris.v1";
const K_HISTORIQUE = "bac.mg.historique.v1";
const K_PROGRESSION = "bac.mg.progression.v1";
const K_IMPORTES = "bac.mg.importes.v1";
const K_THEME = "bac.mg.theme.v1";

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage plein ou indisponible : on ignore silencieusement
  }
}

/** Accès générique en lecture (migration, diagnostics). */
export async function lireStore<T>(key: string, fallback: T): Promise<T> {
  return read(key, fallback);
}

/** Accès générique en écriture (migration). */
export async function ecrireStore(key: string, value: unknown): Promise<void> {
  await write(key, value);
}

/* ------------------------------------------------------------------ */
/* Bus d'événements : mise à jour TEMPS RÉEL de tous les écrans ouverts */
/* ------------------------------------------------------------------ */

export type StorageEvent = "favoris" | "historique" | "importes" | "theme";

type Listener = () => void;
const listeners = new Map<StorageEvent, Set<Listener>>();

export function onStorageChange(event: StorageEvent, fn: Listener): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
  };
}

function notify(event: StorageEvent): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of [...set]) {
    try {
      fn();
    } catch {
      // un écran démonté entre-temps : on ignore
    }
  }
}

/* ------------------------------------------------------------------ */
/* Favoris                                                            */
/* ------------------------------------------------------------------ */

export type DocRef = { assetKey: string; titre: string; serie: string; matiere: string; annee: number };

export async function getFavoris(): Promise<DocRef[]> {
  return read<DocRef[]>(K_FAVORIS, []);
}

export async function toggleFavori(ref: DocRef): Promise<boolean> {
  const list = await getFavoris();
  const idx = list.findIndex((f) => f.assetKey === ref.assetKey);
  let ajout: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    ajout = false;
  } else {
    list.unshift(ref);
    ajout = true;
  }
  await write(K_FAVORIS, list);
  notify("favoris");
  return ajout;
}

export function useFavoris() {
  const [favoris, setFavoris] = useState<DocRef[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setFavoris(await getFavoris());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    // Temps réel : se met à jour quand un autre écran modifie les favoris.
    return onStorageChange("favoris", refresh);
  }, [refresh]);

  const toggle = useCallback(async (ref: DocRef) => {
    const now = await toggleFavori(ref); // notify() déclenche refresh() ici aussi
    return now;
  }, []);

  return { favoris, ready, toggle };
}

/** Efface tous les favoris d'un coup (confirmation demandée côté UI). */
export async function clearFavoris(): Promise<void> {
  await write(K_FAVORIS, []);
  notify("favoris");
}

/** Remplace la liste des favoris (utilisé par la migration des clés). */
export async function ecraserFavoris(list: DocRef[]): Promise<void> {
  await write(K_FAVORIS, list);
  notify("favoris");
}

/* ------------------------------------------------------------------ */
/* Historique (dernière position de lecture par document)             */
/* ------------------------------------------------------------------ */

export type HistoriqueEntry = DocRef & { date: number; page: number; pages: number };

export async function getHistorique(): Promise<HistoriqueEntry[]> {
  return read<HistoriqueEntry[]>(K_HISTORIQUE, []);
}

export async function recordOuverture(ref: DocRef, page: number, pages: number): Promise<void> {
  const list = (await getHistorique()).filter((h) => h.assetKey !== ref.assetKey);
  list.unshift({ ...ref, date: Date.now(), page, pages });
  await write(K_HISTORIQUE, list.slice(0, 30));
  notify("historique");
}

export async function recordPage(ref: DocRef, page: number, pages: number): Promise<void> {
  const list = await getHistorique();
  const idx = list.findIndex((h) => h.assetKey === ref.assetKey);
  if (idx >= 0) {
    list[idx] = { ...list[idx], page, pages, date: Date.now() };
    await write(K_HISTORIQUE, list);
    notify("historique");
  }
}

export function useHistorique() {
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setHistorique(await getHistorique());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    // Temps réel : « Reprendre la lecture » se met à jour dès qu'un sujet est ouvert.
    return onStorageChange("historique", refresh);
  }, [refresh]);

  return { historique, ready, refresh };
}

/** Efface tout l'historique de lecture d'un coup (confirmation demandée côté UI). */
export async function clearHistorique(): Promise<void> {
  await write(K_HISTORIQUE, []);
  notify("historique");
}

/** Remplace la liste d'historique (utilisé par la migration des clés). */
export async function ecraserHistorique(list: HistoriqueEntry[]): Promise<void> {
  await write(K_HISTORIQUE, list);
  notify("historique");
}

export function useProgression(assetKey: string): number {
  const [page, setPage] = useState(1);
  useEffect(() => {
    getHistorique().then((list) => {
      const entry = list.find((h) => h.assetKey === assetKey);
      if (entry) setPage(entry.page);
    });
  }, [assetKey]);
  return page;
}

/* ------------------------------------------------------------------ */
/* PDF importés par l'utilisateur                                     */
/* ------------------------------------------------------------------ */

export type ImporteEntry = {
  id: string;
  titre: string;
  file: string; // chemin relatif dans le dossier documents de l'app
  date: number;
  tailleKo: number;
};

export async function getImportes(): Promise<ImporteEntry[]> {
  return read<ImporteEntry[]>(K_IMPORTES, []);
}

export async function addImporte(entry: ImporteEntry): Promise<void> {
  const list = await getImportes();
  list.unshift(entry);
  await write(K_IMPORTES, list);
  notify("importes");
}

export async function removeImporte(id: string): Promise<void> {
  const list = (await getImportes()).filter((i) => i.id !== id);
  await write(K_IMPORTES, list);
  notify("importes");
}

export function useImportes() {
  const [importes, setImportes] = useState<ImporteEntry[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setImportes(await getImportes());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    return onStorageChange("importes", refresh);
  }, [refresh]);

  return { importes, ready, refresh };
}

/* ------------------------------------------------------------------ */
/* Apparence : thème clair / sombre / défaut du téléphone              */
/* ------------------------------------------------------------------ */

export type ModeTheme = "system" | "clair" | "sombre";

export async function getModeTheme(): Promise<ModeTheme> {
  return read<ModeTheme>(K_THEME, "system");
}

export async function setModeTheme(mode: ModeTheme): Promise<void> {
  await write(K_THEME, mode);
  notify("theme");
}

export function useModeTheme(): {
  mode: ModeTheme;
  ready: boolean;
  setMode: (m: ModeTheme) => void;
} {
  const [mode, setModeState] = useState<ModeTheme>("system");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setModeState(await getModeTheme());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    return onStorageChange("theme", refresh);
  }, [refresh]);

  const setMode = useCallback((m: ModeTheme) => {
    setModeState(m); // réponse instantanée dans l'écran
    void setModeTheme(m); // notifie le ThemeProvider + les autres écrans
  }, []);

  return { mode, ready, setMode };
}
