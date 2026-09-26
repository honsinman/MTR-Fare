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
