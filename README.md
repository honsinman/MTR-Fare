# MTR FARE — low-data mobile fare audit

A static, phone-first MTR fare checker designed in the visual direction of the supplied MTR ETA UI.

## Two versions

- `map/` — station selectors + Calculate button + Adult Octopus fare result + data-usage strip + scalable clickable SVG MTR network map.
- `lite/` — the same fare checker without the map for the smallest interface and lowest rendering cost.
- `light-rail.html` — separate Light Rail Adult Octopus fare checker.

There is **no Data page**.

## Language

The single round button at the top right toggles the whole UI between Traditional Chinese and English (`EN` / `繁`).

## Fare data strategy

The app does not request MTR fare data on every search. The included GitHub Action downloads the official CSV files and stores them in this repository under `/data/`. The browser loads those same-origin files, then every fare calculation is a local in-memory lookup.

Official files synced:

- `mtr_lines_fares.csv`
- `airport_express_fares.csv`
- `light_rail_routes_and_stops.csv`
- `light_rail_fares.csv`

The workflow runs on the first push to `main`, can be run manually, and checks monthly for updates. It commits only when the official data changes.

## GitHub Pages setup

1. Upload the whole folder to a new GitHub repository.
2. Use `main` as the default branch.
3. Open **Actions → Sync official MTR fare data → Run workflow** if the first push did not already run it.
4. Open **Settings → Pages → Deploy from a branch → main / root**.
5. The root URL redirects to the map version. Use `/lite/` for the no-map version.

## Data usage

The strip below the result shows:

- **This lookup** — `0 B` network data for a fare calculation after the fare DB is already loaded.
- **Page** — browser-reported transfer bytes for the current page/session when available.
- **Fare DB** — the uncompressed bytes loaded into memory from the local GitHub fare files.

Browser caching / GitHub Pages HTTP caching can reduce subsequent page-load network usage further.

## MTR map

The clickable map is a lightweight SVG schematic so every station can be tapped and the map can be zoomed without downloading a large image. The **Official PDF** button links to the exact MTR route map supplied by the user:

`https://www.mtr.com.hk/archive/en/services/routemap.pdf`

The PDF is not auto-loaded, which preserves low-data behaviour. The schematic is an interaction layer, not a pixel-for-pixel copy of the official artwork.

## Airport Express

The app first uses stored official Airport Express fare rows where available. For an MTR ↔ Airport Express combination, it applies the free MTR connection logic through Hong Kong, Kowloon or Tsing Yi and shows a badge when that rule is used. The normal eligibility conditions (same eligible payment method, timing and other official restrictions) still apply.

## Files

```
/
  index.html
  light-rail.html
  manifest.webmanifest
  /map/index.html
  /lite/index.html
  /assets/styles.css
  /assets/stations.js
  /assets/app.js
  /assets/map.js
  /assets/light-rail.js
  /data/...
  /.github/workflows/sync-mtr-data.yml
```
