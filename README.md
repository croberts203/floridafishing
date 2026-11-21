# Jax Bite Forecast — app.floridafishing.com

Fishing bite forecast for Jacksonville, Florida: species-by-species bite scores, tides (NOAA Mayport harmonics), sun/moon/solunar, live NWS small craft advisory and seas, a spot picker, Florida regulations, fly-fishing mode and an on-device catch log.

Static site for GitHub Pages — no build step needed. `index.html` is generated from the app sources; `CNAME` holds the custom domain.

- Marine forecast: fetched live from api.weather.gov (NWS Jacksonville CWF, zones AMZ452/AMZ472).
- Tides: computed in the page; times usually within ~15 min of NOAA, heights ~0.5 ft. Not for navigation.
- Regulations: summary checked 2026-11-19 against FWC; always confirm at MyFWC.com.
- Catch log: saved in each phone's browser (localStorage).
