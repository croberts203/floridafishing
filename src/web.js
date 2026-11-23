// ===== Standalone website extras (floridafishing.com): live NWS marine forecast, GPS =====
const NWS = (() => {
  const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const cap = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  // Expand a UGC line like "AMZ450-452-454-191500-" or "AMZ450>454-" into zone ids
  function ugcZones(line) {
    const out = []; let pre = '';
    for (const tok of line.split('-')) {
      const m = tok.match(/^([A-Z]{2}Z)?(\d{3})(?:>(\d{3}))?$/);
      if (!m) continue;
      if (m[1]) pre = m[1];
      if (!pre) continue;
      const a = +m[2], b = m[3] ? +m[3] : a;
      for (let i = a; i <= b; i++) out.push(pre + String(i).padStart(3, '0'));
    }
    return out;
  }
  function nums(s) { return (s.match(/\d+/g) || []).map(Number); }
  function parsePeriod(name, text) {
    const sent = text.split(/(?<=\.)\s+/).map(x => x.trim()).filter(Boolean);
    const wind = sent.find(x => /\bwinds?\b/i.test(x) && /knots|variable|calm/i.test(x)) || '';
    const seas = sent.find(x => /^seas\b/i.test(x)) || '';
    const icw = sent.find(x => /^(intracoastal|inland) waters/i.test(x)) || '';
    const kn = nums(wind.replace(/gusts?[^.,]*/gi, ''));
    const sn = nums(seas.replace(/occasionally to \d+ feet/gi, ''));
    const p = { rawName: name, wind, seas, icw };
    if (kn.length) { p.ktLo = Math.min(...kn); p.ktHi = Math.max(...kn); }
    if (sn.length) { p.seasLo = Math.min(...sn); p.seasHi = Math.max(...sn); }
    return p;
  }
  // Assign local dates to NWS period names, walking forward from the issuance date
  function datePeriods(periods, issued) {
    const out = []; let cursor = new Date(issued); cursor.setHours(0, 0, 0, 0);
    const iss = new Date(issued);
    const onOrAfter = (dayIdx) => { const d = new Date(cursor); while (d.getDay() !== dayIdx) d.setDate(d.getDate() + 1); return d; };
    for (const p of periods) {
      const n = p.rawName.toUpperCase().replace(/\s+/g, ' ').trim();
      const add = (d, night, label) => { out.push({ ...p, name: label, date: ymd(d), night }); cursor = new Date(d); };
      if (/^(TODAY|REST OF TODAY|THIS AFTERNOON|THIS MORNING)$/.test(n)) { add(new Date(iss.getFullYear(), iss.getMonth(), iss.getDate()), false, cap(n)); continue; }
      if (/^(TONIGHT|REST OF TONIGHT|THIS EVENING|OVERNIGHT)$/.test(n)) {
        const d = new Date(iss.getFullYear(), iss.getMonth(), iss.getDate());
        add(d, true, iss.getHours() < 6 ? 'Early ' + cap(DAYS[d.getDay()]) : cap(n)); continue;
      }
      let m = n.match(/^([A-Z]+DAY)( NIGHT)?(?: AND ([A-Z]+DAY)( NIGHT)?)?$/);
      if (m && DAYS.includes(m[1])) {
        const d1 = onOrAfter(DAYS.indexOf(m[1]));
        add(d1, !!m[2], cap(m[1]) + (m[2] ? ' night' : ''));
        if (m[3] && DAYS.includes(m[3])) { const d2 = onOrAfter(DAYS.indexOf(m[3])); add(d2, !!m[4], cap(m[3]) + (m[4] ? ' night' : '')); }
        continue;
      }
      m = n.match(/^([A-Z]+DAY)( NIGHT)? THROUGH ([A-Z]+DAY)( NIGHT)?$/);
      if (m && DAYS.includes(m[1]) && DAYS.includes(m[3])) {
        let d = onOrAfter(DAYS.indexOf(m[1])); const end = DAYS.indexOf(m[3]);
        for (let i = 0; i < 7; i++) { add(d, i === 0 && !!m[2], cap(DAYS[d.getDay()])); if (d.getDay() === end) break; d = new Date(d); d.setDate(d.getDate() + 1); }
        continue;
      }
      out.push({ ...p, name: cap(n), date: ymd(cursor), night: /NIGHT/.test(n) });
    }
    return out;
  }
  function parseCWF(text, issuedISO) {
    const t = text.replace(/\r/g, '');
    const issued = issuedISO ? Date.parse(issuedISO) : Date.now();
    const issuedText = (t.match(/^\s*(\d{3,4} [AP]M E[SD]T \w{3} \w{3} \d{1,2} \d{4})\s*$/m) || [])[1] || '';
    const gs = t.match(/(\d+) nautical miles (east[a-z ]*?) of Jacksonville Beach/i);
    const zones = {};
    for (const seg of t.split(/\n\$\$/)) {
      const ugc = (seg.match(/^\s*(AMZ[\d>\-]+-\d{6}-)\s*$/m) || [])[1];
      if (!ugc) continue;
      const ids = ugcZones(ugc);
      const want = ['AMZ452', 'AMZ472'].filter(z => ids.includes(z));
      if (!want.length) continue;
      const headlines = Array.from(seg.matchAll(/^\.\.\.(.+?)\.\.\.\s*$/gms)).map(x => x[1].replace(/\s+/g, ' ').trim()).filter(h => !/^\./.test(h));
      const per = [];
      const re = /^\.([A-Z][A-Z ]+?)\.\.\.([\s\S]*?)(?=^\.[A-Z][A-Z ]+?\.\.\.|$(?![\s\S]))/gm;
      let m; while ((m = re.exec(seg))) per.push(parsePeriod(m[1], m[2].replace(/\s+/g, ' ').trim()));
      const hasSCA = headlines.some(h => /SMALL CRAFT ADVISORY/i.test(h)), hasGale = headlines.some(h => /GALE|STORM WARNING/i.test(h));
      const dated = datePeriods(per, issued).map(p => ({ ...p,
        sca: (p.ktHi >= 20 || p.seasHi >= 7) && (hasSCA || hasGale || p.ktHi >= 20 || p.seasHi >= 7),
        gale: (p.ktHi || 0) >= 34 || (hasGale && (p.ktHi || 0) >= 30) }));
      for (const z of want) zones[z] = { name: z === 'AMZ452' ? 'Fernandina Beach to St. Augustine out 20 nm' : 'Fernandina Beach to St. Augustine 20 to 60 nm', headlines, periods: dated };
    }
    return { issued: new Date(issued).toISOString(), issuedText, fetched: new Date().toISOString(), source: 'NWS Jacksonville Coastal Waters Forecast (live)', gulfStream: gs ? `${gs[1]} nm ${gs[2].replace(/east/i, 'E').replace(/ southeast/i, 'SE').replace(/ northeast/i, 'NE').replace(/\s/g, '')} of Jacksonville Beach` : '', zones };
  }
  async function load() {
    const list = await (await fetch('https://api.weather.gov/products/types/CWF/locations/JAX', { headers: { Accept: 'application/ld+json' } })).json();
    const latest = (list['@graph'] || [])[0]; if (!latest) throw new Error('no product');
    const prod = await (await fetch(latest['@id'] || ('https://api.weather.gov/products/' + latest.id), { headers: { Accept: 'application/ld+json' } })).json();
    return parseCWF(prod.productText || '', prod.issuanceTime || latest.issuanceTime);
  }
  return { load, parseCWF, ugcZones, parsePeriod, datePeriods };
})();

// spot coordinates for "near me"
const SPOT_LOC = { mayport: [30.398, -81.428], pablo: [30.32, -81.44], fuel: [30.41, -81.53], pottsburg: [30.31, -81.60], beach: [30.29, -81.39], near: [30.33, -81.30], off: [30.30, -80.40], river: [29.65, -81.63], lakes: [29.28, -81.60] };
function distKm(a, b) { const R = 6371, d = Math.PI / 180, dl = (b[0] - a[0]) * d, dn = (b[1] - a[1]) * d; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * d) * Math.cos(b[0] * d) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

async function webInit() {
  // live marine forecast
  const loadMarine = async () => {
    try { state.marine = await NWS.load(); state.marineState = 'ok'; try { localStorage.setItem('jaxbite.marine', JSON.stringify(state.marine)); } catch (e) { } }
    catch (e) { try { const c = JSON.parse(localStorage.getItem('jaxbite.marine') || 'null'); if (c) { state.marine = c; state.marineState = 'ok'; } else state.marineState = 'error'; } catch (er) { state.marineState = 'error'; } }
    dayCache.clear(); render();
  };
  loadMarine(); setInterval(loadMarine, 30 * 60000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
}
function locateMe() {
  if (!navigator.geolocation) { toast('Location isn’t available on this device'); return; }
  toast('Finding you…');
  navigator.geolocation.getCurrentPosition(pos => {
    const me = [pos.coords.latitude, pos.coords.longitude];
    state.geo = { lat: me[0], lng: me[1], acc: pos.coords.accuracy, t: Date.now() };
    let best = null;
    for (const s of spots()) { const ll = s.loc || SPOT_LOC[s.id]; if (!ll) continue; const d = distKm(me, ll); if (!best || d < best.d) best = { s, d }; }
    if (best && best.d < 80) { state.spotId = best.s.id; state.settings.spotId = best.s.id; Store.saveSettings(); toast(`Nearest spot: ${best.s.name} (${best.d.toFixed(1)} km)`); }
    else toast('You’re outside the Jacksonville area — showing NE Florida spots');
    state.settings.loc = { lat: +me[0].toFixed(3), lng: +me[1].toFixed(3) }; dayCache.clear(); render();
  }, err => toast(err.code === 1 ? 'Location permission was denied' : 'Couldn’t get your location'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 });
}
function geoRegsNote() {
  const g = state.geo; if (!g) return '';
  const inFL = g.lat > 24.4 && g.lat < 31.1 && g.lng > -87.7 && g.lng < -79.8;
  if (!inFL) return 'Your GPS shows you outside Florida — these are Florida rules; check the rules where you are.';
  const ne = g.lat >= 29.2 && g.lng > -82.2;
  // rough Atlantic 3-nm line near NE Florida: coastline ~ -81.39° at Jax; 3 nm ≈ 0.058° of longitude
  const fed = g.lng > -81.33 && g.lat > 29.5 && g.lat < 30.75;
  return (ne ? 'GPS: you’re in Northeast Florida' : 'GPS: you’re outside the Northeast region — some saltwater limits (redfish, trout) differ by region') + (fed ? '; you appear to be more than ~3 nm offshore (federal waters), where federal rules may apply.' : '.');
}
