# 📚 BAC Madagascar — Sujets du Baccalauréat 100 % hors ligne

Application mobile (Android/iOS) qui donne accès à **596 sujets officiels du Baccalauréat de Madagascar** (général + **BAC technique**) en PDF (sessions 1998 → **2026**), consultables **sans aucune connexion Internet**.

> **v1.3 — mode tout-embarqué** (APK ~373 Mo) : les 407 sujets sont embarqués dans l'APK,
> comme en v1.1 — aucun pack à importer, tout est disponible dès l'installation, 100 %
> hors ligne. L'onglet **Sujets & imports** permet d'ajouter vos propres PDF personnels
> (le pack zip de la v1.2 n'est plus utilisé). Favoris et « Reprendre la lecture » se
> mettent à jour en temps réel.
> Pour produire une APK légère : `LIGHT_BUILD=1 node scripts/build-catalog.mjs` puis rebuild.

Séries couvertes (sans doublon) : **A, C, D, L, S, OSE + BAC Technique** (génie civil, industriel, Maths GC-IND-AGRI — 38 épreuves techniques)
Matières : Malagasy, Français, Mathématiques, Philosophie, Anglais, Sciences Physiques, SVT, Histoire-Géographie, Sciences Éco. et Sociales, Espagnol, Allemand + épreuves techniques (Dessin, Technologie, Électrotechnique, Mécanique/RDM, Topographie…)

Inclut les **sujets de la session 2026** (Malagasy, Maths, SVT, Sciences Physiques, Philosophie — séries A, C, D, L, S, OSE).
**Sujets officiels uniquement** — les corrigés seront ajoutés dans une future version.

## ✨ Fonctionnalités

- **100 % hors ligne** : les PDF sont embarqués dans l'APK (aucun serveur, aucun tracking)
- **Recherche globale** par série, matière ou année (« maths 2015 », « série C philosophie »…)
- **Lecteur PDF intégré** (zoom, défilement fluide) avec **reprise automatique de lecture**
- **Favoris** et **historique de lecture** persistants (AsyncStorage local), mis à jour **en temps réel**
- **Onglet Paramètres** : apparence **Clair / Sombre / Défaut du téléphone**, gestion des données (favoris, historique), contact
- **À propos** : chiffres du catalogue, sources des sujets, développeur et partage
- **Import de PDF** depuis le téléphone (corrigés, annales personnelles) — stockés localement
- Thème clair / sombre automatique

## 🚀 Démarrage

```bash
npm install
npm start          # Expo Dev Server (tester sur téléphone via Expo Go)
```

> Les PDF sont déjà dans `assets/pdfs/`. Pour utiliser Expo Go, le bundle de test est limité ;
> préférez un build de développement (`npx expo run:android`) pour tester le lecteur complet.

## 🗂️ Scripts de données

| Commande | Rôle |
|---|---|
| `npm run fetch:annales` | Télécharge les sujets (catalogue public CSJ Mahamasina) vers `assets/pdfs/` |
| `npm run dedupe:pdfs` | Supprime les PDF identiques (même épreuve listée sous 2 niveaux) |
| `npm run catalogue` | Régénère `src/data/catalog.json` + `src/data/assetMap.ts` |
| `npm run data` | Enchaîne les trois (mise à jour complète des annales) |

### Ajouter une session future (ex. BAC 2025)

1. Récupérez le(s) PDF officiel(s).
2. Déposez-les dans `assets/pdfs/<serie>/<matiere>/<annee>_<id>.pdf`
   (ex. `assets/pdfs/D/mathematiques/2025_300.pdf`).
3. `npm run catalogue` — le catalogue et la table d'assets se régénèrent.
4. `npm test` vérifie que chaque entrée pointe vers un fichier réel.

## 🏗️ Build APK installable

### En local (déjà configuré sur ce poste)

Le JDK 17 + SDK Android portables sont installés dans `tools/` (hors git) :

```bash
export JAVA_HOME="$(pwd)/tools/jdk-17.0.13+11"
export ANDROID_HOME="$(pwd)/tools/android-sdk"
cd android && ./gradlew assembleRelease --no-daemon
# → android/app/build/outputs/apk/release/app-release.apk
```

Le premier build compile tout (NDK inclus, ~1h15) ; les suivants sont incrémentaux (~2-5 min).
L'APK est signé en clé de debug — installable sur tout appareil Android 7.0+.

### Via le cloud (EAS)

```bash
npm i -g eas-cli
eas login
npm run build:apk            # build cloud (EAS)
```

Le profil `preview` produit un **APK** (`distribution: internal`) installable directement
sur n'importe quel téléphone Android — parfait pour une diffusion hors Play Store.

Taille d'APK attendue : **~373 Mo** (267 Mo de PDF embarqués + runtime React Native).

## 🧪 Qualité

```bash
npm run typecheck   # tsc --noEmit
npm test            # cohérence catalogue ↔ fichiers ↔ assetMap
```

## 📄 Sources & crédits

- Sujets : [CSJ Mahamasina](https://csjmahamasina.com/sujets) (Centre Scolaire Jesuite)
- Catalogue national : plateforme.education.mg (MEN Madagascar)
- Les sujets d'examen officiels circulent librement à des fins pédagogiques.
- Aucune donnée personnelle ne quitte l'appareil.

## 🗺️ Structure

```
app/                    # expo-router : (tabs)/, serie/[serie]/[matiere]/, pdf/[key]/
src/data/               # catalog.json + assetMap.ts (générés) + catalog.ts
src/storage/            # favoris, historique, imports, hook usePdfUri
src/components/         # DocCard, SearchBar, EmptyState, Badge
src/theme/              # thème clair/sombre
scripts/                # fetch-annales, dedupe-pdfs, build-catalog (+ manifest.json)
assets/pdfs/            # 184 PDF réels (serie/matiere/annee_id.pdf)
__tests__/              # vitest : cohérence du catalogue
```
