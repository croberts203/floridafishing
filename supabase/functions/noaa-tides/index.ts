// Public, read-only proxy for NOAA CO-OPS tide data used by fishforecast.net.
// GET ?nearest=LAT,LON        -> up to 6 nearest tide-prediction stations
// GET ?station=ID&begin=YYYYMMDD&days=N -> high/low predictions (GMT, feet, MLLW)
// Only these two NOAA calls are made; nothing else can be requested through it.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
type Station = { id: string; name: string; state: string; lat: number; lng: number; type: string };
let stations: Station[] | null = null;
let loadedAt = 0;

async function loadStations(): Promise<Station[]> {
  if (stations && Date.now() - loadedAt < 7 * 864e5) return stations;
  const r = await fetch("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions");
  if (!r.ok) throw new Error("NOAA station list " + r.status);
  const j = await r.json();
  stations = (j.stations || []).map((s: any) => ({
    id: String(s.id), name: String(s.name || ""), state: String(s.state || ""),
    lat: Number(s.lat), lng: Number(s.lng), type: String(s.type || ""),
  })).filter((s: Station) => isFinite(s.lat) && isFinite(s.lng));
  loadedAt = Date.now();
  return stations!;
}
function km(a: number, b: number, c: number, d: number) {
  const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const json = (body: unknown, status = 200, maxAge = 3600) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": `public, max-age=${maxAge}` } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return json({ error: "GET only" }, 405, 0);
  const u = new URL(req.url);
  try {
    const near = u.searchParams.get("nearest");
    if (near) {
      const [lat, lng] = near.split(",").map(Number);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({ error: "bad nearest" }, 400, 0);
      const list = await loadStations();
      const out = list.map((s) => ({ ...s, km: km(lat, lng, s.lat, s.lng) })).sort((a, b) => a.km - b.km).slice(0, 6)
        .map((s) => ({ ...s, km: Math.round(s.km * 10) / 10 }));
      return json({ stations: out }, 200, 86400);
    }
    const station = u.searchParams.get("station") || "";
    const begin = u.searchParams.get("begin") || "";
    const days = Math.min(31, Math.max(1, parseInt(u.searchParams.get("days") || "9")));
    if (!/^[A-Za-z0-9]{5,10}$/.test(station) || !/^\d{8}$/.test(begin)) return json({ error: "bad station or begin" }, 400, 0);
    const q = new URLSearchParams({ product: "predictions", application: "fishforecast.net", begin_date: begin, range: String(days * 24),
      datum: "MLLW", station, time_zone: "gmt", units: "english", interval: "hilo", format: "json" });
    const r = await fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?" + q);
    const j = await r.json();
    if (j.error) return json({ error: j.error.message || "NOAA error" }, 502, 300);
    return json({ station, predictions: (j.predictions || []).map((p: any) => ({ t: p.t, v: Number(p.v), type: p.type })) }, 200, 21600);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 502, 0);
  }
});
