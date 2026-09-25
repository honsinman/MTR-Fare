# MTR Fare V5 — low-data GitHub Pages PWA

This version follows the supplied MTR ETA visual language and keeps all runtime fare lookups inside the GitHub Pages repository.

## Pages
- `/` — MTR fare + exact official MTR PDF map with clickable station labels
- `/lite/` — same MTR fare UI without the map
- `/light-rail/` — Light Rail, station-only selection

MTR Bus has been removed.

## Data architecture
The phone never calls the MTR website/API for a fare lookup. GitHub Actions downloads the official CSV snapshots, stores them in `data/raw/`, and builds:
- `data/mtr.json`
- `data/light-rail.json`

All columns from the official fare CSVs are retained in the database. The UI displays Adult Octopus only.

## Airport Express
The app stores the official Airport Express fare table separately. For an Airport → ordinary MTR destination lookup, the shown paid segment uses the Airport Express fare to Tsing Yi and the onward MTR leg is treated as a free connecting MTR journey, subject to the official interchange conditions. Direct Airport ↔ Hong Kong/Kowloon/Tsing Yi selections show their corresponding official AEL fare.

## Official map
The workflow downloads the exact MTR `routemap.pdf`, renders the same PDF page to PNG, and generates clickable station hit areas from the station-name text positions in that same PDF. This removes the old hand-estimated map coordinates.

## GitHub Pages
1. Upload all files to the repository root.
2. Settings → Pages → Source: **GitHub Actions**.
3. Run **Build local MTR fare databases and deploy Pages** once, or just push to `main`.
4. The site is deployed only after the database/map build succeeds.

The scheduled job refreshes the stored official snapshots monthly.
