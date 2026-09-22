# MTR Fare Lite

A mobile-first, low-data, installable fare checker for Hong Kong MTR, Airport Express, Light Rail and MTR Bus.

## Design goals

- No framework, map tiles, ads, analytics or external fonts.
- Clickable schematic MTR/AEL line map plus line + station pull-down selectors.
- Official MTR Open Data CSVs as fare source.
- Offline shell + cached fare data after first sync.
- Separate Light Rail page and MTR Bus page.
- Airport Express complimentary MTR connection notice and multi-hub AEL fare options.

## Deploy on GitHub Pages

1. Upload all files to a GitHub repository.
2. Open **Settings → Pages** and deploy from the `main` branch root.
3. Open **Actions → Refresh official MTR fare data → Run workflow** once. This copies current official CSVs into `data/`, making all app requests same-origin and reliable.
4. The included workflow refreshes the CSVs monthly and commits only when they change.
5. On iPhone Safari: Share → **Add to Home Screen**.

The app also attempts a direct official-data fallback if a local CSV is not yet present.

## Official data

MTR Corporation open data via DATA.GOV.HK:
- `mtr_lines_and_stations.csv`
- `mtr_lines_fares.csv`
- `airport_express_fares.csv`
- `light_rail_routes_and_stops.csv`
- `light_rail_fares.csv`
- `mtr_bus_routes.csv`
- `mtr_bus_stops.csv`
- `mtr_bus_fares.csv`

Official base URL: `https://opendata.mtr.com.hk/data/`

## Data usage

The app shell is intentionally tiny. Once official fare CSVs are cached, normal fare searches are local and should consume ~0 network bytes. A full data refresh is dominated by the station-to-station heavy-rail fare matrix. The UI reports the bytes newly downloaded by the browser on the last sync; server compression and cache behavior can change the actual cellular usage.

## Important fare note

For Airport Express complimentary MTR connections, eligibility depends on the same eligible payment method, designated interchange stations/timing and other MTR terms. Light Rail, MTR Bus and East Rail First Class are excluded from the free MTR connection. Always treat MTR's charged fare as authoritative.
