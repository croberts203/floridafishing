# Fish Bite Forecast — fishforecast.net

Fishing bite forecast for anywhere in the US (built from a Jacksonville, FL original): species-by-species bite scores, tides (NOAA Mayport harmonics), sun/moon/solunar, live NWS small craft advisory and seas, a spot picker, Florida regulations, fly-fishing mode and an on-device catch log.

Static site for GitHub Pages. `CNAME` holds the custom domain.

## Editing the app (read this first — people and AI sessions alike)

**`index.html`, `sw.js`, `manifest.webmanifest`, the icons and `supabase/functions/bite-alerts/core.js` are generated. Don't edit them directly.**
Make changes in `src/`, then:

```
node src/build.js     # rebuilds index.html etc. in the repo root
node src/test.js      # checks the build matches src/, the page parses, and the forecast engine works
```

Commit `src/` together with the regenerated files. GitHub runs `node src/test.js` on every push (Actions → "Check site");
a red ✗ means a generated file was edited by hand or something broke. Before pushing, pull first — another session may have pushed.

- `src/app.js` core UI · `src/engine.js` bite model · `src/species*.js` species · `src/regs.js` Florida rules · `src/natl.js` nationwide data (tides, weather, marine, live gauges)
- `src/app_web.js`, `src/features.js`, `src/features2.js`, `src/features3.js` website features · `src/art.js` illustrations · `src/style.css`, `src/template.html`
- `supabase/functions/*` edge functions (deploy separately); `supabase/README.md` lists tables and functions.

- Marine forecast: fetched live from api.weather.gov (NWS Jacksonville CWF, zones AMZ452/AMZ472).
- Tides: computed in the page; times usually within ~15 min of NOAA, heights ~0.5 ft. Not for navigation.
- Regulations: summary checked 2026-11-19 against FWC; always confirm at MyFWC.com.
- Catch log: saved in each phone's browser (localStorage).
