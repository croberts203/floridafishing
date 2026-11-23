Supabase pieces for fishforecast.net (project rkxzfzzjzrnkiyopbdke):
- functions/noaa-tides: public read-only proxy for NOAA tide stations + high/low predictions (adds CORS).
- functions/catch-photo: signed-in photo → species + length (needs ANTHROPIC_API_KEY secret; 20/day per user, shared ai_usage table).
- tables forecast_catches / forecast_settings: per-user catch log and settings, row-level security (owner only).
