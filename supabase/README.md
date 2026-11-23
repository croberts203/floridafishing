Supabase pieces for fishforecast.net (project rkxzfzzjzrnkiyopbdke):
- functions/noaa-tides: public read-only proxy (adds CORS): NOAA tide stations + high/low predictions, and live readings (?now=) from the nearest NOAA gauge, NDBC buoy and USGS stream gauge.
- functions/catch-photo: signed-in photo → species + length (needs ANTHROPIC_API_KEY secret; 20/day per user, shared ai_usage table).
- tables forecast_catches / forecast_settings: per-user catch log and settings, row-level security (owner only).
