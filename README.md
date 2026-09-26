# MTR Fare — Low Data (V6)

Static GitHub Pages fare checker styled after the user's MTR ETA app.

## Services
- MTR, including Airport Express
- Light Rail
- No MTR Bus page

## Local-data architecture
The browser does not query the MTR fare API or DATA.GOV.HK. GitHub Actions downloads the official MTR CSV snapshots into `data/raw/`, then builds:

- `data/mtr.json` — complete MTR + Airport Express tables, all source fare columns retained
- `data/light-rail.json` — complete Light Rail tables, all source fare columns retained
- `data/fare/mtr/*.json` — small per-origin MTR query shards
- `data/fare/ael/*.json` — small per-origin Airport Express query shards
- `data/fare/light-rail/*.json` — small per-origin Light Rail query shards

The app displays only Adult Octopus fare. The per-origin shards keep each fare search small and the `數據 / Data` counter adds the actual UTF-8 JSON payload bytes used by fare searches, always displayed in KB.

A current Airport Express fallback snapshot is bundled so Airport / AsiaWorld-Expo fares work even before the first Action run. GitHub Actions refreshes the fallback from the official Airport Express CSV.

## Map
`assets/mtr-system-map.pdf` is downloaded from the exact official MTR route-map PDF during the Pages build. `scripts/build_map_assets.py` renders that same PDF and auto-generates the visible station click layer. If the local generated map has not yet been built in a direct ZIP preview, the page falls back to MTR’s official system-map image online so the preview is never blank; after the GitHub build the Pages site uses the exact PDF-derived map stored locally.

There is intentionally no separate “Open local official PDF” button.

## Deploy
1. Unzip this folder and upload **all** files/folders to the root of a GitHub repository, including `.github/`.
2. GitHub → **Settings → Pages → Source → GitHub Actions**.
3. Open **Actions → Build local MTR fare databases and deploy Pages → Run workflow** once if it does not start automatically.
4. Wait for the workflow to finish before testing the final Pages URL.

The workflow also runs monthly to refresh MTR open-data snapshots.

## v6.1 build-and-deploy fix

The current official `routemap.pdf` may expose station-name lettering as vector
outlines instead of searchable PDF text. PyMuPDF can therefore render the exact
map correctly while finding zero station names. The map builder now keeps the
checked-in 98-point hotspot layer whenever PDF text extraction yields fewer than
80 reliable station positions, instead of aborting the entire Pages deployment.

## V6.2 fixes

- Airport/AWE to the MTR network now shows all three Airport Express city-terminal Adult Octopus choices: Tsing Yi $73, Kowloon $105, Hong Kong $120. Airport ↔ AsiaWorld-Expo remains $6.5.
- Fare-search data meter now shows the payload for the most recent fare lookup rather than accumulating the whole database across many searches. `重計 / Recount` resets the current-session measurement.
- Heavy-rail and Light Rail lookups use compact per-origin Adult-Octopus shards; the complete official tables with every fare column remain stored in `data/mtr.json` and `data/light-rail.json`.
- Light Rail stop IDs are normalised (e.g. `001` = `1`) and fare-column detection accepts multiple official naming styles.
- The service-worker cache is bumped and no longer stores failed/404 map or fare-shard responses. This clears the stale-cache condition that could show a broken map or "fare data not synced" after a successful rebuild.
- The official route-map PNG is lazy-loaded. If that rendered image cannot load, the local official PDF is displayed directly as the fallback instead of an external website image.
