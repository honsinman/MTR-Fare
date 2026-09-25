# MTR FARE v3 - local GitHub database

This version intentionally follows the visual language of the supplied **MTR ETA** screen while simplifying the task to two stations -> **Calculate Fare** -> **Adult Octopus Audit fare**.

## What changed

- Each side now has **Line** + **Station** selection.
- MTR official line colours are used as the line/stop accent.
- Native dropdown text is **black** on a light field.
- **Calculate Fare** is one solid navy colour; there is no green-to-black gradient.
- The calculation UI displays only **Adult Octopus / Audit fare**.
- The repository database still stores **all fare columns / fare tables** from the official CSV snapshots.
- The app runtime never asks MTR / DATA.GOV.HK for fare data. It reads only `data/fares-db.json` from the same GitHub Pages repository.
- There is no Data page.
- The map version uses the **exact artwork from the official one-page MTR route-map PDF**, rendered locally to PNG in GitHub Actions. The PNG is not a redrawn schematic. Transparent station hotspots sit above the official artwork so a tap can select a station.
- `/lite/` is the same UI without the map.

## First upload to GitHub

1. Upload the contents of this folder to a repository, with the default branch named `main`.
2. Open **Actions -> Build local MTR database**. The first push normally runs it automatically; otherwise press **Run workflow** once.
3. The Action downloads the official CSV/PDF snapshots, stores them **inside your repository**, builds `data/fares-db.json`, renders `assets/mtr-system-map.png`, and commits those files back to `main`.
4. Enable **Settings -> Pages -> Deploy from a branch -> main / root**.

After that, the phone app only uses the files hosted from your own GitHub repository. Monthly refresh is done by the GitHub Action, not by the user's browser.

## Audit field

Heavy-rail fare calculations use `OCT_ADT_FARE` only. Other official fare columns remain stored in `data/fares-db.json` for audit / later extension but are not shown by the Calculate button.

## Map source

The Action stores and renders exactly:
`https://www.mtr.com.hk/archive/en/services/routemap.pdf`

The official PDF itself is also preserved in `assets/mtr-system-map.pdf`.
