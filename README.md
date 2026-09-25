# MTR Fare Audit — low-data GitHub Pages app

A phone-first static fare checker based on the user's MTR ETA visual style.

## What is included

- **MTR / Airport Express**: line-first, station-second selection. Every line and station in the selector is a tappable button. The displayed result is **Adult Octopus / audit fare only**.
- **Light Rail**: route and stop selection with a separate local database.
- **MTR Bus**: route and stop selection with a separate local database.
- **Map version**: the home page uses a raster render of the **exact MTR route-map PDF file**, with a transparent clickable hotspot on every MTR/AEL station. The underlying map artwork is not redrawn.
- **Lite version**: `/lite/` has no route map and therefore uses less data.
- **Traditional Chinese / English**: one round `EN / 繁` button changes the interface language.
- **No Data page**.

## Runtime data rule

The phone app does **not** call MTR, DATA.GOV.HK, or any third-party fare API/site when a fare is calculated.

At runtime it reads only these same-origin files stored in this GitHub repository / GitHub Pages deployment:

- `data/mtr.json`
- `data/light-rail.json`
- `data/mtr-bus.json`

The raw monthly CSV snapshots are also stored under `data/raw/` after the build runs. The compact JSON databases retain **all columns and all fare values** from the source CSVs. The UI deliberately displays only the audit fare requested by the user.

## Why the old “GitHub 車費資料庫尚未建立” message appeared

V3 shipped placeholder JSON and expected a separate database Action to be run later. Opening the site before that Action completed therefore produced the warning.

**V4 changes the deployment order:** the single GitHub Actions workflow downloads the official snapshots, builds all three local databases, saves them back into the repository, renders the local official map, and only then deploys GitHub Pages. There is no separate “Build local MTR database” step for the user to run.

## Upload to GitHub

1. Create/open a GitHub repository.
2. Upload **the contents of this ZIP** to the repository root (keep `.github/`).
3. Commit/push to `main` (or `master`).
4. In **Settings → Pages**, set **Source = GitHub Actions**.
5. Open **Actions → Build local fare databases and deploy Pages** and wait for the first run to finish. It is triggered automatically by the first push; `Run workflow` is only a fallback.
6. Open the Pages URL shown by the successful deployment.

After the first successful run, the database JSON, raw CSV snapshots, official PDF, and the PNG rendered from that PDF are physically stored in the repository. The workflow checks for refreshed MTR data monthly.

## Fare/database sources used by the build

The GitHub workflow downloads and stores these files before deploying:

- `mtr_lines_fares.csv`
- `airport_express_fares.csv`
- `mtr_lines_and_stations.csv`
- `light_rail_fares.csv`
- `light_rail_routes_and_stops.csv`
- `mtr_bus_fares.csv`
- `mtr_bus_routes.csv`
- `mtr_bus_stops.csv`
- MTR route map: `https://www.mtr.com.hk/archive/en/services/routemap.pdf`

The browser itself does not download those external URLs.

## Airport Express connection

The app contains the AEL + MTR connection calculation needed for audit display. Eligibility in actual travel still depends on MTR's current payment method, transfer station, transfer-time and journey conditions. Check the current MTR rules if using the result for travel rather than database auditing.

## Low-data behaviour

Each service page loads only its own local database. The map is loaded only on the map version. After the page/database has been cached, pressing **計算車費 / Calculate Fare** performs a local lookup and creates no new fare-query network request.
