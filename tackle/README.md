# Tackle Box — fishforecast.net/tackle

Tie & Tide's tackle app: lures, rigs and gear with colors and sizes, a Pack list for the fish you're after
(lure lists and colors from Fish Bite Forecast's species guides), a shopping list, and a lure-maker catalog.

**`tackle/index.html` is generated. Edit `tackle/src/` and run `node tackle/build.js`.** `node src/test.js` checks it.

- `src/app.html` the app · `src/brands.js` lure makers (researched Nov 2026) · `src/scanner.js` barcode reader (shared with Fly Bench)
- `src/flyslugs.json` fly name → Fly Bench recipe page
- Species and bait lists are read from `../src/species.js` and `../src/species_us.js` at build time.
- Tackle is saved on the phone (localStorage `tacklebox.v1`). Barcodes go through the Supabase edge function
  `tackle-lookup` (shared catalog table `tackle_catalog`, then `upc_cache`, then UPCitemdb with daily caps).
