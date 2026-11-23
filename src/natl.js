// ===== Nationwide data for the website: spots anywhere in the US, NOAA tides, auto weather, NWS marine =====
const SB_URL = 'https://rkxzfzzjzrnkiyopbdke.supabase.co';
const SB_KEY = 'sb_publishable_ypQ91HrykMCwgI59OCRFYg_MFGOgzi9';
const TIDE_API = SB_URL + '/functions/v1/noaa-tides';
const NAT = { tides: {}, wx: {}, marine: {}, pts: {}, alerts: {}, pending: new Set() };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const ymdStr = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
async function getJSON(url, opts) { const r = await fetch(url, opts); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }
function once(key, fn) { if (NAT.pending.has(key)) return; NAT.pending.add(key); Promise.resolve().then(fn).catch(e => console.warn(key, e)).finally(() => { NAT.pending.delete(key); dayCache.clear(); render(); }); }

// ---- Tides (NOAA CO-OPS via our Supabase proxy) ----
function natTideExtremes(stationId) {
  const c = NAT.tides[stationId] || lsGet('ff.tide.' + stationId, null);
  const today = midnight(Date.now());
  if (c && !NAT.tides[stationId]) NAT.tides[stationId] = c;
  if (!c || c.begin > today - 864e5 || c.fetched < Date.now() - 864e5) {
    once('tide:' + stationId, async () => {
      const begin = ymdStr(new Date(today - 864e5));
      const j = await getJSON(`${TIDE_API}?station=${encodeURIComponent(stationId)}&begin=${begin}&days=11`);
      if (j.error) throw new Error(j.error);
      const ext = (j.predictions || []).map(p => ({ t: Date.parse(p.t.replace(' ', 'T') + ':00Z'), h: +p.v, ref: +p.v, type: p.type === 'H' ? 'H' : 'L' })).sort((a, b) => a.t - b.t);
      NAT.tides[stationId] = { ext, begin: today - 864e5, fetched: Date.now() }; lsSet('ff.tide.' + stationId, NAT.tides[stationId]);
    });
  }
  return c ? c.ext : [];
}
async function nearestStations(lat, lng) { const j = await getJSON(`${TIDE_API}?nearest=${lat.toFixed(4)},${lng.toFixed(4)}`); return j.stations || []; }

// ---- Weather (Open-Meteo, no key) → automatic Conditions ----
function natWeather(sp) {
  if (sp.lat == null) return null;
  const k = sp.lat.toFixed(2) + ',' + sp.lng.toFixed(2), c = NAT.wx[k] || lsGet('ff.wx.' + k, null);
  if (c && !NAT.wx[k]) NAT.wx[k] = c;
  if (!c || c.fetched < Date.now() - 3 * 3600e3) once('wx:' + k, async () => {
    const base = `latitude=${sp.lat}&longitude=${sp.lng}&timezone=auto`;
    const w = await getJSON(`https://api.open-meteo.com/v1/forecast?${base}&hourly=pressure_msl,wind_speed_10m,cloud_cover,precipitation_probability,temperature_2m&wind_speed_unit=mph&temperature_unit=fahrenheit&past_days=7&forecast_days=10`);
    let sst = null;
    try { const m = await getJSON(`https://marine-api.open-meteo.com/v1/marine?${base}&hourly=sea_surface_temperature&temperature_unit=fahrenheit&past_days=1&forecast_days=8`); sst = m.hourly; } catch (e) { }
    NAT.wx[k] = { h: w.hourly, sst, fetched: Date.now() }; lsSet('ff.wx.' + k, NAT.wx[k]);
  });
  return c;
}
function autoCond(sp, t0) {
  const c = natWeather(sp); if (!c || !c.h) return null;
  const key = dkey(t0), prev = dkey(t0 - 864e5), H = c.h;
  const pick = (arr, day, h0, h1) => { const out = []; H.time.forEach((t, i) => { if (t.slice(0, 10) === day) { const hr = +t.slice(11, 13); if (hr >= h0 && hr <= h1 && arr[i] != null) out.push(arr[i]); } }); return out; };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const pT = avg(pick(H.pressure_msl, key, 6, 18)), pY = avg(pick(H.pressure_msl, prev, 6, 18));
  if (pT == null) return null;
  const wind = avg(pick(H.wind_speed_10m, key, 6, 18)), cloud = avg(pick(H.cloud_cover, key, 6, 18)), rain = Math.max(0, ...pick(H.precipitation_probability, key, 6, 18));
  const dp = pY == null ? 0 : pT - pY;
  const pressure = dp < -5 ? 'ff' : dp < -2 ? 'f' : (dp > 4 && cloud < 35) ? 'pf' : dp > 1.5 ? 'r' : 's';
  const sky = rain >= 60 ? 'rain' : cloud < 25 ? 'sun' : cloud < 70 ? 'partly' : 'overcast';
  let wtemp = null, wsrc = '';
  const salt = !['fresh', 'greatlakes'].includes(sp.water);
  if (salt && c.sst && c.sst.sea_surface_temperature) {
    const v = []; c.sst.time.forEach((t, i) => { if (t.slice(0, 10) === key && c.sst.sea_surface_temperature[i] != null) v.push(c.sst.sea_surface_temperature[i]); });
    if (v.length) { wtemp = Math.round(avg(v)); wsrc = 'sea surface'; }
  }
  if (wtemp == null) { // fresh water: lagged average of air temperature over the prior week
    const v = []; H.time.forEach((t, i) => { const d = Date.parse(t); if (d < t0 + 864e5 && d >= t0 - 7 * 864e5 && H.temperature_2m[i] != null) v.push(H.temperature_2m[i]); });
    if (v.length) { wtemp = Math.round(Math.max(34, Math.min(90, avg(v) * 0.9 + 6))); wsrc = 'estimated from air temps'; }
  }
  return { pressure, wind: wind == null ? null : Math.round(wind), sky, wtemp, wsrc };
}

// ---- NWS: office, state, marine zones, coastal forecast and advisories ----
function natPoint(sp) {
  if (sp.lat == null) return null;
  const k = sp.lat.toFixed(3) + ',' + sp.lng.toFixed(3), c = NAT.pts[k] || lsGet('ff.pt.' + k, null);
  if (c && !NAT.pts[k]) NAT.pts[k] = c;
  if (!c) once('pt:' + k, async () => {
    const p = await getJSON(`https://api.weather.gov/points/${sp.lat.toFixed(4)},${sp.lng.toFixed(4)}`, { headers: { Accept: 'application/geo+json' } });
    const pr = p.properties || {}, rl = (pr.relativeLocation || {}).properties || {};
    let zone = null;
    try { const z = await getJSON(`https://api.weather.gov/zones?type=marine&point=${sp.lat.toFixed(4)},${sp.lng.toFixed(4)}`, { headers: { Accept: 'application/geo+json' } }); zone = ((z.features || [])[0] || {}).properties?.id || null; } catch (e) { }
    NAT.pts[k] = { cwa: pr.cwa || pr.gridId, state: rl.state || '', city: rl.city || '', zone }; lsSet('ff.pt.' + k, NAT.pts[k]);
  });
  return c;
}
function parseMarineText(text, issuedISO) {
  const t = text.replace(/\r/g, '');
  const issued = issuedISO ? Date.parse(issuedISO) : Date.now();
  const issuedText = (t.match(/^\s*(\d{3,4} [AP]M [A-Z]{2,4} \w{3} \w{3} \d{1,2} \d{4})\s*$/m) || [])[1] || '';
  const zones = {};
  for (const seg of t.split(/\n\$\$/)) {
    const lines = seg.split('\n'); let a = -1, b = -1;
    for (let i = 0; i < lines.length; i++) { if (a < 0 && /^[A-Z]{2}Z\d{3}/.test(lines[i].trim())) a = i; if (a >= 0 && /\d{6}-\s*$/.test(lines[i])) { b = i; break; } if (a >= 0 && !/^[A-Z0-9>\-]+$/.test(lines[i].trim())) { a = -1; } }
    if (a < 0 || b < 0) continue;
    const ugc = lines.slice(a, b + 1).map(x => x.trim()).join('');
    const ids = NWS.ugcZones(ugc).filter(z => !/^\w\wZ0{3}$/.test(z));
    if (!ids.length) continue;
    const after = lines.slice(b + 1).join('\n');
    const nameBlock = (after.split(/\n\s*\d{3,4} [AP]M /)[0] || '').trim();
    const names = nameBlock.split(/-\s*\n/).map(s => s.replace(/\s+/g, ' ').replace(/-$/, '').trim()).filter(Boolean);
    const headlines = Array.from(seg.matchAll(/^\.\.\.(.+?)\.\.\.\s*$/gms)).map(x => x[1].replace(/\s+/g, ' ').trim()).filter(h => !/^\./.test(h));
    const per = []; const re = /^\.([A-Z][A-Z ]+?)\.\.\.([\s\S]*?)(?=^\.[A-Z][A-Z ]+?\.\.\.|$(?![\s\S]))/gm;
    let pm; while ((pm = re.exec(seg))) per.push(NWS.parsePeriod(pm[1], pm[2].replace(/\s+/g, ' ').trim()));
    if (!per.length) continue;
    const dated = NWS.datePeriods(per, issued);
    ids.forEach((id, i) => { zones[id] = { id, name: names[i] || names[0] || id, headlines, periods: dated }; });
  }
  return { issued: new Date(issued).toISOString(), issuedText, zones };
}
function natMarine(sp) {
  const pt = natPoint(sp); if (!pt || !pt.cwa) return null;
  const office = pt.cwa, c = NAT.marine[office] || lsGet('ff.mar.' + office, null);
  if (c && !NAT.marine[office]) NAT.marine[office] = c;
  if (!c || c.fetched < Date.now() - 30 * 60e3) once('mar:' + office, async () => {
    let zones = {}, issued = null, issuedText = '', product = '';
    for (const type of ['CWF', 'NSH', 'GLF', 'OFF']) {
      try {
        const list = await getJSON(`https://api.weather.gov/products/types/${type}/locations/${office}`, { headers: { Accept: 'application/ld+json' } });
        const latest = (list['@graph'] || [])[0]; if (!latest) continue;
        const prod = await getJSON(latest['@id'], { headers: { Accept: 'application/ld+json' } });
        const r = parseMarineText(prod.productText || '', prod.issuanceTime);
        if (Object.keys(r.zones).length) { Object.assign(zones, r.zones); issued = issued || r.issued; issuedText = issuedText || r.issuedText; product = product || type; }
      } catch (e) { }
    }
    NAT.marine[office] = { office, zones, issued, issuedText, product, fetched: Date.now() }; lsSet('ff.mar.' + office, NAT.marine[office]);
  });
  return c;
}
function natAlerts(zoneId) {
  if (!zoneId) return [];
  const c = NAT.alerts[zoneId];
  if (!c || c.fetched < Date.now() - 15 * 60e3) once('al:' + zoneId, async () => {
    const j = await getJSON(`https://api.weather.gov/alerts/active?zone=${zoneId}`, { headers: { Accept: 'application/geo+json' } });
    NAT.alerts[zoneId] = { list: (j.features || []).map(f => ({ event: f.properties.event, headline: f.properties.headline, onset: Date.parse(f.properties.onset || f.properties.effective), ends: Date.parse(f.properties.ends || f.properties.expires) })), fetched: Date.now() };
  });
  return c ? c.list : [];
}
function spotZone(sp) {
  const m = natMarine(sp); if (!m || !m.zones) return null;
  const pt = natPoint(sp) || {};
  const ids = Object.keys(m.zones);
  const want = sp.zone || (state.settings.zoneFor || {})[sp.id] || pt.zone;
  return m.zones[want] ? m.zones[want] : (ids.length ? m.zones[ids.sort()[0]] : null);
}
// Same shape the app's marine card and safety checks use
function natMarineFor(sp, t0) {
  if (['fresh'].includes(sp.water)) return null;
  const m = natMarine(sp); const z = spotZone(sp); if (!m || !z) return null;
  const k = dkey(t0), per = z.periods.filter(p => p.date === k);
  const al = natAlerts(z.id).filter(a => (isNaN(a.onset) || a.onset < t0 + 864e5) && (isNaN(a.ends) || a.ends > t0));
  const scaA = al.some(a => /small craft|hazardous seas/i.test(a.event)), galeA = al.some(a => /gale|storm|hurricane|tropical storm/i.test(a.event));
  const per2 = per.map(p => ({ ...p, sca: p.sca || scaA, gale: p.gale || galeA }));
  const sca = per2.some(p => p.sca) || scaA, gale = per2.some(p => p.gale) || galeA;
  return { inner: per2, outer: [], sca, scaOuter: sca, gale, seasIn: Math.max(0, ...per2.map(p => +p.seasHi || 0)), seasOut: Math.max(0, ...per2.map(p => +p.seasHi || 0)),
    headlines: Array.from(new Set(al.map(a => a.event + (isNaN(a.ends) ? '' : ' until ' + new Date(a.ends).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))).concat(z.headlines))), headlinesOut: [],
    issued: Date.parse(m.issued), issuedText: m.issuedText, stale: (Date.now() - Date.parse(m.issued)) / 3600e3 > 18, has: per2.length > 0, zone: z, office: m.office, zones: m.zones };
}

// ---- Places: city search (Open-Meteo geocoding) ----
async function searchPlaces(q) {
  const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&countryCode=US`);
  return (j.results || []).map(r => ({ name: r.name + (r.admin1 ? ', ' + r.admin1 : ''), lat: r.latitude, lng: r.longitude }));
}

// ---- Accounts + cloud catch log (Supabase) ----
const Cloud = {
  sb: null, user: null, ready: false,
  async init() {
    if (!window.supabase || !window.supabase.createClient) return;
    this.sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await this.sb.auth.getSession(); this.user = data.session ? data.session.user : null; this.ready = true;
    this.sb.auth.onAuthStateChange((_e, s) => { const was = this.user && this.user.id; this.user = s ? s.user : null; if ((this.user && this.user.id) !== was) this.load(); else render(); });
    if (this.user) await this.load(); else render();
  },
  async load() {
    if (!this.user) { state.storage = 'local'; try { state.catches = JSON.parse(localStorage.getItem('jaxbite.catches') || '[]'); } catch (e) { } render(); return; }
    state.storage = 'cloud-loading'; render();
    const { data, error } = await this.sb.from('forecast_catches').select('id, ts, data').order('ts', { ascending: false }).limit(2000);
    if (error) { state.storage = 'cloud-error'; toast('Couldn’t load your cloud log'); render(); return; }
    const cloud = (data || []).map(r => ({ ...(r.data || {}), id: r.id, ts: Date.parse(r.ts) }));
    // first sign-in on this phone: offer the phone's existing catches to the cloud
    let local = []; try { local = JSON.parse(localStorage.getItem('jaxbite.catches') || '[]'); } catch (e) { }
    const missing = local.filter(c => !cloud.find(x => x.id === c.id));
    state.catches = cloud.sort((a, b) => b.ts - a.ts); state.storage = 'cloud'; state.localPending = missing.length; render();
    const s = await this.sb.from('forecast_settings').select('data').maybeSingle();
    if (s.data && s.data.data) { mergeSettings(s.data.data); dayCache.clear(); render(); }
  },
  async uploadLocal() {
    let local = []; try { local = JSON.parse(localStorage.getItem('jaxbite.catches') || '[]'); } catch (e) { }
    const rows = local.filter(c => !state.catches.find(x => x.id === c.id)).map(c => { const { id, ts, ...rest } = c; return { id, ts: new Date(ts).toISOString(), data: rest }; });
    if (!rows.length) return 0;
    const { error } = await this.sb.from('forecast_catches').upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
    await this.load(); return rows.length;
  },
  async save(c) { const { id, ts, ...rest } = c; const { error } = await this.sb.from('forecast_catches').upsert({ id, ts: new Date(ts).toISOString(), data: rest, updated_at: new Date().toISOString() }, { onConflict: 'user_id,id' }); if (error) throw error; },
  async del(id) { const { error } = await this.sb.from('forecast_catches').delete().eq('id', id); if (error) throw error; },
  async saveSettings(body) { const { error } = await this.sb.from('forecast_settings').upsert({ user_id: this.user.id, data: body, updated_at: new Date().toISOString() }); if (error) throw error; },
};

// ---- Right now: live gauges, buoys and stream gauges (via the Supabase proxy) ----
function natNow(sp) {
  if (!sp || sp.lat == null) return null;
  const k = sp.lat.toFixed(3) + ',' + sp.lng.toFixed(3), c = NAT.now && NAT.now[k];
  NAT.now = NAT.now || {};
  if (!c || c.at < Date.now() - 10 * 60e3) once('now:' + k, async () => {
    const j = await getJSON(`${TIDE_API}?now=${sp.lat.toFixed(4)},${sp.lng.toFixed(4)}`);
    NAT.now[k] = { data: j, at: Date.now() };
  });
  return c ? c.data : null;
}
// A lake temperature the user entered for this spot, good for 3 days either side of the reading.
function lakeTemp(sp, t0) {
  const r = sp && sp.water === 'fresh' && state.settings.lakeTemp && state.settings.lakeTemp[sp.id];
  if (!r || Math.abs(t0 + 43200e3 - r.t) > 3.5 * 864e5) return null;
  const h = (Date.now() - r.t) / 36e5;
  return { v: r.v, t: r.t, when: h < 1 ? 'just now' : h < 24 ? Math.round(h) + ' h ago' : Math.round(h / 24) + ' d ago' };
}
function liveWaterTemp(sp) {
  const n = natNow(sp); if (!n) return null;
  const fresh = ['fresh', 'greatlakes'].includes(sp.water);
  // a river gauge says nothing reliable about a lake or pond's temperature
  if (sp.water === 'fresh' && typeof isLakeLike === 'function' && isLakeLike(sp)) return null;
  const opts = fresh ? [n.usgs && n.usgs.waterTempF && [n.usgs.waterTempF.v, n.usgs.name], n.buoy && n.buoy.waterTempF != null && [n.buoy.waterTempF, n.buoy.name]]
    : [n.coops && n.coops.waterTempF && [n.coops.waterTempF.v, n.coops.name], n.buoy && n.buoy.waterTempF != null && n.buoy.km < 60 && [n.buoy.waterTempF, n.buoy.name], n.usgs && n.usgs.waterTempF && n.usgs.km < 15 && [n.usgs.waterTempF.v, n.usgs.name]];
  const hit = opts.find(Boolean); return hit ? { v: Math.round(hit[0]), src: hit[1] } : null;
}

// ---- Lake, pond, reservoir or river? (USGS National Hydrography Dataset via our proxy) ----
const FW_LABEL = { lake: 'Lake', pond: 'Pond', reservoir: 'Reservoir', river: 'River / creek' };
function fwLookup(lat, lng) {
  const k = lat.toFixed(5) + ',' + lng.toFixed(5); NAT.fw = NAT.fw || lsGet('ff.fw', {});
  const hit = NAT.fw[k];
  if (hit && (hit.kind || Date.now() - (hit.t || 0) < 864e5)) return hit; // re-check "nothing found" after a day
  once('fw:' + k, async () => {
    const j = await getJSON(`${TIDE_API}?water=${k}`);
    if (j.error && j.kind == null) return; // service busy: try again later
    NAT.fw[k] = { kind: j.kind || null, name: j.name || null, acres: j.acres || null, withinM: j.withinM ?? null, t: Date.now() }; lsSet('ff.fw', NAT.fw);
  });
  if (hit) return hit;
  return null;
}
// what the app uses: your choice for the spot, else what the map says
function fwInfo(sp) {
  if (!sp || sp.water !== 'fresh' || sp.lat == null) return null;
  const det = sp.fw || fwLookup(sp.lat, sp.lng);
  const pick = sp.fwKind || (state.settings.fwKinds || {})[sp.id];
  const kind = pick || (det && det.kind) || null;
  return { kind, det, manual: !!pick, name: det && det.name, acres: det && det.acres, pending: !det && !pick };
}
const fwKindOf = sp => { const f = fwInfo(sp); return f ? f.kind : null; };
const isLakeLike = sp => { const k = fwKindOf(sp); return k === 'lake' || k === 'pond' || k === 'reservoir'; };
// species that only make sense in one kind of fresh water
{
  const base = speciesFits;
  speciesFits = function (s, sp) {
    if (!base(s, sp)) return false;
    const k = sp.water === 'fresh' ? fwKindOf(sp) : null; if (!k) return true;
    if ((s.id === 'shad' || s.id === 'salmonpac') && k !== 'river') return false;   // run rivers
    if (s.id === 'laketrout' && (k === 'river' || k === 'pond')) return false;      // big, deep, cold lakes
    if ((s.id === 'musky' || s.id === 'striperfw' || s.id === 'walleye') && k === 'pond') return false;
    if (s.id === 'brook' && k === 'reservoir') return false;
    return true;
  };
}
