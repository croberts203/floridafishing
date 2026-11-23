// Public, read-only proxy for fishforecast.net (adds CORS; only these upstream calls are made).
// GET ?nearest=LAT,LON                    -> up to 6 nearest NOAA tide-prediction stations
// GET ?station=ID&begin=YYYYMMDD&days=N   -> NOAA high/low predictions (GMT, feet, MLLW)
// GET ?now=LAT,LON                        -> live readings: nearest NOAA water-level gauge, NDBC buoy, USGS stream gauge
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const json = (body: unknown, status = 200, maxAge = 3600) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": `public, max-age=${maxAge}` } });
type St = { id: string; name: string; state?: string; lat: number; lng: number; type?: string };
const lists: Record<string, { at: number; list: St[] }> = {};
function km(a: number, b: number, c: number, d: number) {
  const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
async function coopsList(type: string): Promise<St[]> {
  const c = lists["coops:" + type]; if (c && Date.now() - c.at < 7 * 864e5) return c.list;
  const j = await (await fetch(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=${type}`)).json();
  const list = (j.stations || []).map((s: any) => ({ id: String(s.id), name: String(s.name || ""), state: String(s.state || ""), lat: +s.lat, lng: +s.lng, type: String(s.type || "") }))
    .filter((s: St) => isFinite(s.lat) && isFinite(s.lng));
  lists["coops:" + type] = { at: Date.now(), list }; return list;
}
async function buoyList(): Promise<St[]> {
  const c = lists.ndbc; if (c && Date.now() - c.at < 864e5) return c.list;
  const x = await (await fetch("https://www.ndbc.noaa.gov/activestations.xml")).text();
  const list: St[] = [];
  for (const m of x.matchAll(/<station\s([^>]*?)\/?>/g)) {
    const a: Record<string, string> = {}; for (const kv of m[1].matchAll(/(\w+)="([^"]*)"/g)) a[kv[1]] = kv[2];
    if (a.met !== "y" || !a.lat || !a.lon) continue;
    list.push({ id: a.id, name: (a.name || a.id).replace(/&amp;/g, "&"), lat: +a.lat, lng: +a.lon, type: a.type });
  }
  lists.ndbc = { at: Date.now(), list }; return list;
}
const nearestOf = (list: St[], lat: number, lng: number, maxKm: number) =>
  list.map((s) => ({ ...s, km: km(lat, lng, s.lat, s.lng) })).filter((s) => s.km <= maxKm).sort((a, b) => a.km - b.km);
const gmt = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

async function coopsNow(lat: number, lng: number) {
  const near = nearestOf(await coopsList("waterlevels"), lat, lng, 60).slice(0, 3);
  for (const s of near) {
    const get = async (product: string, extra = "") => {
      try {
        const r = await (await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=${product}&station=${s.id}&date=latest&units=english&time_zone=gmt&format=json&application=fishforecast.net${extra}`)).json();
        return r.data && r.data[0] ? r.data[0] : null;
      } catch { return null; }
    };
    const [wl, wt, wind, pres] = await Promise.all([get("water_level", "&datum=MLLW"), get("water_temperature"), get("wind"), get("air_pressure")]);
    if (!wl && !wt && !wind) continue;
    let pred = null;
    if (wl) {
      try {
        const t = new Date(Date.parse(wl.t.replace(" ", "T") + ":00Z") - 6 * 60000);
        const p = await (await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=${s.id}&begin_date=${encodeURIComponent(gmt(t))}&range=1&datum=MLLW&units=english&time_zone=gmt&interval=6&format=json&application=fishforecast.net`)).json();
        const hit = (p.predictions || []).find((x: any) => x.t === wl.t); pred = hit ? +hit.v : null;
      } catch { /* predictions optional */ }
    }
    return {
      id: s.id, name: s.name, km: Math.round(s.km * 10) / 10,
      waterLevel: wl ? { ft: +wl.v, t: wl.t, predicted: pred } : null,
      waterTempF: wt ? { v: +wt.v, t: wt.t } : null,
      wind: wind ? { mph: Math.round(+wind.s * 1.15078 * 10) / 10, gustMph: Math.round(+wind.g * 1.15078 * 10) / 10, dir: wind.dr, deg: +wind.d, t: wind.t } : null,
      pressureMb: pres ? { v: +pres.v, t: pres.t } : null,
    };
  }
  return null;
}
async function buoyNow(lat: number, lng: number) {
  const all = nearestOf(await buoyList(), lat, lng, 150);
  const near = all.filter((s) => s.type === "buoy").slice(0, 4).concat(all.filter((s) => s.type !== "buoy").slice(0, 3)); // wave buoys first
  let fallback: any = null;
  for (const s of near) {
    try {
      const txt = await (await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${s.id.toUpperCase()}.txt`)).text();
      const lines = txt.split("\n").filter((l) => l.trim()); if (lines.length < 3) continue;
      const head = lines[0].replace(/^#/, "").trim().split(/\s+/), row = lines[2].trim().split(/\s+/);
      const v = (k: string) => { const i = head.indexOf(k); const x = i >= 0 ? row[i] : "MM"; return x === "MM" || x === undefined ? null : +x; };
      const t = `${row[0]}-${row[1]}-${row[2]} ${row[3]}:${row[4]}`;
      const out = {
        id: s.id, name: s.name, km: Math.round(s.km * 10) / 10, t,
        windMph: v("WSPD") != null ? Math.round(v("WSPD")! * 2.23694) : null, gustMph: v("GST") != null ? Math.round(v("GST")! * 2.23694) : null, windDeg: v("WDIR"),
        waveFt: v("WVHT") != null ? Math.round(v("WVHT")! * 3.28084 * 10) / 10 : null, periodS: v("DPD"),
        waterTempF: v("WTMP") != null ? Math.round((v("WTMP")! * 9 / 5 + 32) * 10) / 10 : null, airTempF: v("ATMP") != null ? Math.round((v("ATMP")! * 9 / 5 + 32) * 10) / 10 : null,
        pressureMb: v("PRES"), pressureTendMb: v("PTDY"),
      };
      if (Date.now() - Date.parse(t.replace(" ", "T") + ":00Z") > 6 * 3600e3) continue; // stale
      if (out.waveFt != null) return out; // prefer a buoy that measures waves
      if (!fallback && (out.windMph != null || out.waterTempF != null)) fallback = out;
    } catch { /* try the next buoy */ }
  }
  return fallback;
}
async function usgsNow(lat: number, lng: number) {
  const d = 0.35, bbox = [lng - d, lat - d, lng + d, lat + d].map((x) => x.toFixed(4)).join(",");
  for (const ver of ["v0", "v1"]) {
    try {
      const r = await fetch(`https://api.waterdata.usgs.gov/ogcapi/${ver}/collections/latest-continuous/items?f=json&bbox=${bbox}&parameter_code=00060,00065,00010&limit=500`);
      if (!r.ok) continue;
      const j = await r.json();
      const by: Record<string, any> = {};
      for (const f of j.features || []) {
        const p = f.properties || {}, g = f.geometry && f.geometry.coordinates; const id = p.monitoring_location_id; if (!id) continue;
        const s = by[id] || (by[id] = { id, km: g ? km(lat, lng, g[1], g[0]) : 999 });
        const val = p.value == null || p.value === "" ? null : +p.value;
        if (val == null || !isFinite(val) || Date.now() - Date.parse(p.time) > 864e5) continue; // only current readings
        if (p.parameter_code === "00060") s.flowCfs = { v: val, t: p.time };
        if (p.parameter_code === "00065") s.gageFt = { v: val, t: p.time };
        if (p.parameter_code === "00010") s.waterTempF = { v: val == null ? null : Math.round((val * 9 / 5 + 32) * 10) / 10, t: p.time };
      }
      const best = Object.values(by).filter((s: any) => s.flowCfs || s.gageFt).sort((a: any, b: any) => a.km - b.km)[0] as any;
      if (!best) return null;
      try {
        const m = await (await fetch(`https://api.waterdata.usgs.gov/ogcapi/${ver}/collections/monitoring-locations/items/${encodeURIComponent(best.id)}?f=json`)).json();
        best.name = m.properties?.monitoring_location_name || best.id;
      } catch { best.name = best.id; }
      best.km = Math.round(best.km * 10) / 10;
      return best;
    } catch { /* try next version */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") return json({ error: "GET only" }, 405, 0);
  const u = new URL(req.url);
  try {
    const now = u.searchParams.get("now");
    if (now) {
      const [lat, lng] = now.split(",").map(Number);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({ error: "bad now" }, 400, 0);
      const [coops, buoy, usgs] = await Promise.all([coopsNow(lat, lng).catch(() => null), buoyNow(lat, lng).catch(() => null), usgsNow(lat, lng).catch(() => null)]);
      return json({ fetched: new Date().toISOString(), coops, buoy, usgs }, 200, 300);
    }
    const near = u.searchParams.get("nearest");
    if (near) {
      const [lat, lng] = near.split(",").map(Number);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({ error: "bad nearest" }, 400, 0);
      const out = nearestOf(await coopsList("tidepredictions"), lat, lng, 20000).slice(0, 6).map((s) => ({ ...s, km: Math.round(s.km * 10) / 10 }));
      return json({ stations: out }, 200, 86400);
    }
    const station = u.searchParams.get("station") || "";
    const begin = u.searchParams.get("begin") || "";
    const days = Math.min(31, Math.max(1, parseInt(u.searchParams.get("days") || "9")));
    if (!/^[A-Za-z0-9]{5,10}$/.test(station) || !/^\d{8}$/.test(begin)) return json({ error: "bad station or begin" }, 400, 0);
    const q = new URLSearchParams({ product: "predictions", application: "fishforecast.net", begin_date: begin, range: String(days * 24),
      datum: "MLLW", station, time_zone: "gmt", units: "english", interval: "hilo", format: "json" });
    const j = await (await fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?" + q)).json();
    if (j.error) return json({ error: j.error.message || "NOAA error" }, 502, 300);
    return json({ station, predictions: (j.predictions || []).map((p: any) => ({ t: p.t, v: Number(p.v), type: p.type })) }, 200, 21600);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 502, 0);
  }
});
