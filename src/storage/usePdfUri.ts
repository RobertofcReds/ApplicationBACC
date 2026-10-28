import { useEffect, useState } from "react";
import { Asset } from "expo-asset";
import { assetModule } from "../data/catalog";
import { getPackVersion, isPackInstalled, packPdfUri } from "./pack";

export type PdfUriState = { uri?: string; error?: string; loading: boolean };

const cache = new Map<string, string>();

/**
 * Résout l'URI locale d'un PDF :
 *  1) depuis le pack importé (pack_pdfs/) s'il est installé — prioritaire ;
 *  2) sinon depuis l'asset embarqué (mode build complet, sans LIGHT_BUILD).
 * Invalide le cache quand la version du pack change (import/suppression).
 */
export function usePdfUri(assetKey: string | undefined, file?: string): PdfUriState {
  const [state, setState] = useState<PdfUriState>({ loading: !!assetKey });
  const packVersion = getPackVersion();

  useEffect(() => {
    if (!assetKey || !file) return;
    let alive = true;

    // Le pack est prioritaire : le cache doit suivre sa version courante
    const cached = packVersion === 0 ? cache.get(assetKey) : undefined;
    if (cached) {
      setState({ uri: cached, loading: false });
      return;
    }

    // 1) Pack installé ?
    if (isPackInstalled()) {
      const uri = packPdfUri(file);
      if (uri) {
        cache.set(assetKey, uri);
        setState({ uri, loading: false });
        return;
      }
    }

    // 2) Asset embarqué (mode build complet uniquement)
    const mod = assetModule(assetKey);
    if (!mod) {
      setState({
        error:
          "Sujet absent du pack installé. Importez le pack complet (bac-madagascar-pack.zip) depuis l'onglet « Importés ».",
        loading: false,
      });
      return;
    }

    setState({ loading: true });
    (async () => {
      try {
        const asset = Asset.fromModule(mod);
        if (!asset.downloaded) await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!alive) return;
        if (!uri || !uri.startsWith("file://")) {
          setState({ error: "Chemin de PDF invalide.", loading: false });
          return;
        }
        cache.set(assetKey, uri);
        setState({ uri, loading: false });
      } catch (e) {
        if (alive) setState({ error: `Erreur de lecture : ${String(e)}`, loading: false });
      }
    })();

    return () => {
      alive = false;
    };
  }, [assetKey, file, packVersion]);

  return state;
}
