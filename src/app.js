// ===== UI =====
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = t => t ? new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
const fmtD = t => new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const dkey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const MONTHS = 'JFMAMJJASOND'.split('');
const SPMAP = Object.fromEntries(SPECIES.map(s => [s.id, s]));
const WEB = typeof WEB_BUILD !== 'undefined';

const state = {
  tab: 'forecast', day0: midnight(Date.now()), spotId: 'mayport', spId: 'auto', fly: false, allWaters: false,
  settings: { spots: {}, custom: [], cond: {}, loc: { lat: 30.33, lng: -81.56 }, usePatterns: true, spotId: 'mayport', fly: false },
  catches: [], storage: 'loading', logFilter: 'all', patSp: null, marine: null, marineState: 'loading', sample: null,
};
const dayCache = new Map();

function spots() {
  const base = DEFAULT_SPOTS.map(s => { const o = state.settings.spots[s.id]; return o && s.tide ? { ...s, tide: { ...s.tide, ...o } } : s; });
  if (WEB) {
    const mine = state.settings.mySpots || [];
    // Jacksonville examples stay listed until you have your own spots somewhere else
    const nearJax = !mine.length || mine.some(m => m.lat != null && distKm([m.lat, m.lng], [30.33, -81.5]) < 200);
    return mine.concat(nearJax ? base.map(b => ({ ...b, group: 'Jacksonville, FL (examples)' })) : []).concat(state.settings.custom || []);
  }
  return base.concat(state.settings.custom || []);
}
function spot() { return spots().find(s => s.id === state.spotId) || spots()[0]; }
function cond(t0 = state.day0) {
  const c = { ...(state.settings.cond[dkey(t0)] || {}) };
  let windSrc = 'manual';
  if (c.wind === undefined || c.wind === null || c.wind === '') {
    const mw = marineWind(t0);
    if (mw != null) { c.wind = mw; windSrc = 'nws'; } else { c.wind = 10; windSrc = 'default'; }
  }
  let out = { pressure: 's', sky: 'partly', clarity: 'stained', wtemp: '', ...c, windSrc };
  if (WEB) {
    const raw = state.settings.cond[dkey(t0)] || {}, sp = spot(), a = autoCond(sp, t0);
    out.auto = {};
    if (a) {
      if (!raw.pressure) { out.pressure = a.pressure; out.auto.pressure = 1; }
      if (!raw.sky) { out.sky = a.sky; out.auto.sky = 1; }
      if ((raw.wind === undefined || raw.wind === '' || raw.wind === null) && a.wind != null && windSrc !== 'nws') { out.wind = a.wind; out.windSrc = 'auto'; }
      if ((raw.wtemp === undefined || raw.wtemp === '') && a.wtemp != null) { out.wtemp = a.wtemp; out.auto.wtemp = a.wsrc; }
    }
    if (a && a.windDir != null) out.windDir = a.windDir;
    const fl = typeof flowInfo === 'function' && t0 === midnight(Date.now()) ? flowInfo(sp) : null;
    const wc = typeof waterCheck === 'function' && t0 === midnight(Date.now()) ? waterCheck(sp) : null;
    if (!raw.sky && wc && ['sun', 'partly', 'overcast', 'rain'].includes(wc.sky) && Date.now() - wc.t < 90 * 60e3) { out.sky = wc.sky; out.auto.sky = 'photo'; }
    if (!raw.clarity && wc && wc.clarity) { out.clarity = wc.clarity; out.auto.clarity = 'from your photo at ' + fmtT(wc.t); out.tint = wc.tint; }
    else if (!raw.clarity && typeof estClarity === 'function') { const e = estClarity(sp, a, fl); if (e) { out.clarity = e.v; out.auto.clarity = e.why; } }
    if (fl) { out.flowF = fl.factor; out.flowTxt = fl.text; }
    const we = typeof windEffect === 'function' ? windEffect(sp, out) : null;
    if (we) { out.windF = we.factor; out.windTxt = we.text; }
    const lt = lakeTemp(sp, t0);
    if ((raw.wtemp === undefined || raw.wtemp === '') && lt) { out.wtemp = lt.v; out.auto.wtemp = 'you entered ' + lt.when; }
    else if ((raw.wtemp === undefined || raw.wtemp === '') && t0 === midnight(Date.now())) { const lw = liveWaterTemp(sp); if (lw) { out.wtemp = lw.v; out.auto.wtemp = 'live: ' + lw.src; } }
    if (out.wtemp === '' && sp.lat != null) { // rough fallback by latitude
      const m = new Date(t0 + 43200e3).getMonth(), salt = !['fresh', 'greatlakes'].includes(sp.water);
      out.wtemp = Math.round(Math.max(36, Math.min(88, WATER_TEMP[salt ? 'salt' : 'fresh'][m] - (sp.lat - 30.3) * 1.4))); out.auto.wtemp = 'typical for the season';
    }
  }
  return out;
}
// ===== Marine forecast (NWS Jacksonville, refreshed into this page's database by a scheduled task) =====
function marineFor(t0) {
  if (WEB) { const sp = spot(); return sp.lat != null ? natMarineFor(sp, t0) : null; }
  const m = state.marine; if (!m || !m.zones) return null;
  const k = dkey(t0), z = id => ((m.zones[id] || {}).periods || []).filter(p => p.date === k);
  const inner = z('AMZ452'), outer = z('AMZ472');
  const all = inner.concat(outer);
  const issued = Date.parse(m.issued || m.fetched || 0), age = (Date.now() - issued) / 3600e3;
  return { inner, outer, sca: inner.some(p => p.sca), scaOuter: outer.some(p => p.sca), gale: all.some(p => p.gale),
    seasIn: Math.max(0, ...inner.map(p => +p.seasHi || 0)), seasOut: Math.max(0, ...outer.map(p => +p.seasHi || 0)),
    headlines: ((m.zones.AMZ452 || {}).headlines || []), headlinesOut: ((m.zones.AMZ472 || {}).headlines || []), issued, stale: age > 18, gulf: m.gulfStream, has: all.length > 0 };
}
function marineWind(t0) {
  const mf = marineFor(t0); if (!mf || !mf.inner.length) return null;
  const day = mf.inner.find(p => !p.night) || mf.inner[0];
  if (day.ktLo == null || day.ktHi == null) return null;
  return Math.round((+day.ktLo + +day.ktHi) / 2 * 1.15);
}
function safety(sp, t0) {
  const mf = WEB ? (sp.lat != null && sp.water !== 'fresh' ? natMarineFor(sp, t0) : null) : marineFor(t0);
  if (!mf || !mf.has) return { f: 1, why: '' };
  if (sp.water === 'offshore') { if (mf.gale || mf.scaOuter) return { f: 0, why: mf.gale ? 'Gale conditions offshore' : 'Small Craft Advisory offshore' }; if (mf.seasOut >= 6) return { f: .4, why: `Seas to ${mf.seasOut} ft offshore` }; }
  if (sp.water === 'nearshore') { if (mf.gale || mf.sca) return { f: 0, why: mf.gale ? 'Gale conditions' : 'Small Craft Advisory' }; if (mf.seasIn >= 5) return { f: .4, why: `Seas to ${mf.seasIn} ft` }; }
  if (sp.water === 'surf' && mf.seasIn >= 7) return { f: .6, why: `Big surf — seas to ${mf.seasIn} ft` };
  if (sp.water === 'inshore' && mf.inner.some(p => /very rough/i.test(p.icw || ''))) return { f: .85, why: 'Intracoastal very rough' };
  return { f: 1, why: '' };
}
function getDay(t0, sp = spot()) {
  const loc = WEB && sp.lat != null ? { lat: sp.lat, lng: sp.lng } : state.settings.loc;
  const k = t0 + '|' + sp.id + '|' + JSON.stringify(sp.tide) + '|' + (sp.station ? sp.station.id : '') + '|' + loc.lat + ',' + loc.lng;
  if (!dayCache.has(k)) dayCache.set(k, Engine.buildDay(t0, sp, loc));
  return dayCache.get(k);
}
function eligible(sp) {
  if (WEB && sp.lat != null) return SPECIES.filter(s => state.allWaters ? ['fresh', 'greatlakes', 'inshore', 'surf', 'nearshore', 'offshore'].some(w => speciesFits(s, { ...sp, water: w })) : speciesFits(s, sp));
  return SPECIES.filter(s => state.allWaters || s.waters.includes(sp.water));
}
function spotRegion(sp) { return WEB && sp.lat != null ? regionOf(sp.lat, sp.lng, sp.water) : null; }
function scoreAll(t0) {
  const sp = spot(), day = getDay(t0, sp), c = cond(t0);
  const opts = { fly: state.fly, usePatterns: state.settings.usePatterns, catches: state.catches, region: spotRegion(sp) };
  return { day, res: eligible(sp).map(s => Engine.scoreSpecies(day, s, c, opts)).sort((a, b) => b.day - a.day) };
}
function chosen(res) { return state.spId !== 'auto' ? res.find(r => r.sp.id === state.spId) || res[0] : res[0]; }
const badge = v => { const [, n] = Engine.rating(v); return `<span class="score s${n}">${Math.round(v)}</span>`; };

// ===== Storage (Claude db per-person, fallback localStorage) =====
const Store = {
  db: null, uid: null, col: null, saveTimer: null, localLog: false,
  async init() {
    try {
      if (window.claude && claude.use) {
        const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
        const uid = user ? await user.id() : null;
        if (db && uid) {
          this.db = db; this.uid = uid; this.col = db.collection('data/users/' + uid);
          let loaded = false;
          const timer = setTimeout(() => { if (!loaded) { state.storage = 'slow'; render(); } }, 10000);
          let mLoaded = false; const mTimer = setTimeout(() => { if (!mLoaded) { state.marineState = 'slow'; render(); } }, 10000);
          db.doc('public/marine').onSnapshot(d => { mLoaded = true; clearTimeout(mTimer); state.marine = d.exists ? d.data() : null; state.marineState = d.exists ? 'ok' : 'none'; dayCache.clear(); render(); }, () => { clearTimeout(mTimer); state.marineState = 'error'; render(); });
          this.col.onSnapshot(snap => {
            loaded = true; clearTimeout(timer);
            if (this.localLog) return;
            const cs = [];
            snap.docs.forEach(d => { if (d.id === 'settings') mergeSettings(d.data()); else if (d.id.startsWith('c_')) cs.push({ id: d.id, ...d.data() }); });
            state.catches = cs.sort((a, b) => b.ts - a.ts); state.storage = 'cloud'; dayCache.clear(); render();
          }, err => { clearTimeout(timer); state.storage = 'error'; toast('Couldn’t reach your saved log'); this.fallback(); render(); });
          return;
        }
      }
    } catch (e) { }
    this.fallback(); if (!WEB) state.marineState = 'none'; render();
  },
  fallback() {
    this.db = null; state.storage = 'local';
    try { const s = JSON.parse(localStorage.getItem('jaxbite.settings') || 'null'); if (s) mergeSettings(s); state.catches = JSON.parse(localStorage.getItem('jaxbite.catches') || '[]'); } catch (e) { }
  },
  saveSettings() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      const body = JSON.parse(JSON.stringify(state.settings));
      if (this.db && !this.localLog) { try { await this.col.doc('settings').set(body); } catch (e) { if (e && e.code === 'invalid_argument') { this.goLocal(); try { localStorage.setItem('jaxbite.settings', JSON.stringify(body)); } catch (er) { } } else toast('Settings not saved'); } }
      else try { localStorage.setItem('jaxbite.settings', JSON.stringify(body)); } catch (e) { }
    }, 700);
  },
  async saveCatch(c) {
    if (this.db && !this.localLog) { try { const { id, ...body } = c; await this.col.doc(id).set(body); return true; } catch (e) {
      if (e && e.code === 'invalid_argument') { this.goLocal(); } else { toast(e && e.code === 'quota_exceeded' ? 'Log storage is full' : 'Catch not saved — try again'); return false; } } }
    const i = state.catches.findIndex(x => x.id === c.id); if (i >= 0) state.catches[i] = c; else state.catches.unshift(c);
    state.catches.sort((a, b) => b.ts - a.ts);
    try { localStorage.setItem('jaxbite.catches', JSON.stringify(state.catches)); } catch (e) { }
    return true;
  },
  goLocal() { // viewer can't write to the shared store (e.g. a friend on a view-only link): keep their log in this browser
    this.localLog = true; state.storage = 'local';
    try { state.catches = JSON.parse(localStorage.getItem('jaxbite.catches') || '[]'); } catch (e) { state.catches = []; }
  },
  async deleteCatch(id) {
    if (this.db && !this.localLog) { try { await this.col.doc(id).delete(); } catch (e) { toast('Delete failed'); } return; }
    state.catches = state.catches.filter(c => c.id !== id);
    try { localStorage.setItem('jaxbite.catches', JSON.stringify(state.catches)); } catch (e) { }
  },
};
let settingsLoaded = false;
function mergeSettings(s) {
  state.settings = { ...state.settings, ...s, loc: { ...state.settings.loc, ...(s.loc || {}) } };
  if (!settingsLoaded) { settingsLoaded = true; if (s.spotId) state.spotId = s.spotId; if (typeof s.fly === 'boolean') state.fly = s.fly; }
}
function toast(m) { const el = $('#toast'); el.textContent = m; el.style.display = 'block'; clearTimeout(el._t); el._t = setTimeout(() => el.style.display = 'none', 2200); }

// ===== Render =====
function render() {
  const lg = document.getElementById("logo"); if (lg && !lg.innerHTML) lg.innerHTML = Art.logo;
  $('#flyseg').innerHTML = `<button class="${!state.fly ? 'on' : ''}" data-fly="0">Conventional</button><button class="${state.fly ? 'on' : ''}" data-fly="1">Fly</button>`;
  if (WEB && !featOn('map') && state.tab === 'map') state.tab = 'forecast';
  document.querySelectorAll('nav button').forEach(b => { b.classList.toggle('on', b.dataset.tab === state.tab); if (WEB && b.dataset.tab === 'map') b.style.display = featOn('map') ? '' : 'none'; });
  const m = $('main');
  if (state.tab === 'forecast') m.innerHTML = viewForecast();
  else if (state.tab === 'species') m.innerHTML = viewSpecies();
  else if (state.tab === 'log') m.innerHTML = viewLog();
  else if (WEB && state.tab === 'map') m.innerHTML = viewMap();
  else m.innerHTML = viewSettings();
  if (state.tab === 'forecast') bindChart();
  if (WEB && state.tab === 'map') mountMap();
  if (WEB && window.Stats && state.tab !== 'forecast') Stats.track('tab_' + state.tab);
  if (WEB) { toursAfterRender(); if (state.tab === 'forecast') watchConditions(); }
}

function topControls() {
  const sps = spots();
  const groups = {};
  sps.forEach(s => { const g = WEB ? (s.group || 'My spots') : WATER_LABEL[s.water]; (groups[g] = groups[g] || []).push(s); });
  const spotSel = `<select id="spotSel">${Object.entries(groups).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(s => `<option value="${esc(s.id)}" ${s.id === state.spotId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const el = eligible(spot());
  const spSel = `<select id="spSel"><option value="auto">Best bet (all species here)</option>${el.map(s => `<option value="${s.id}" ${s.id === state.spId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
  // day strip
  const today = midnight(Date.now());
  let strip = '';
  for (let i = -1; i < 7; i++) {
    const t0 = midnight(today + i * 864e5 + 3 * 3600e3);
    const { res } = scoreAll(t0); const r = chosen(res); const v = r ? r.day : 0; const [, n] = Engine.rating(v);
    const col = ['#5c6e7c', '#8aa0b2', 'var(--accent2)', '#7fd88e', 'var(--accent)'][n];
    strip += `<button class="day ${t0 === state.day0 ? 'on' : ''}" data-day="${t0}"><b>${i === 0 ? 'Today' : new Date(t0).toLocaleDateString([], { weekday: 'short' })}</b><span>${new Date(t0).getDate()}</span><i style="background:${col}"></i></button>`;
  }
  return `<div class="row">${spotSel}${WEB ? '<button class="btn sm ghost" data-locate="1" style="flex:0 0 auto">📍</button><button class="btn sm ghost" data-addspot2="1" style="flex:0 0 auto">+ Spot</button>' : ''}</div><div class="row" style="margin-top:8px">${spSel}<input type="date" id="datePick" value="${dkey(state.day0)}" style="flex:0 0 140px"></div><div class="days">${strip}</div>`;
}

function viewForecast() {
  const { day, res } = scoreAll(state.day0);
  const sp = spot(), c = cond(), a = day.ast;
  if (!res.length) return topControls() + `<div class="card">No species profiles for this water type.</div>`;
  const r = chosen(res), [rt] = Engine.rating(r.day);
  const wins = Engine.windows(r, day);
  let html = (WEB ? offlineBanner() + welcomeCard() + featurePrompt() : '') + topControls();
  // alerts
  const alerts = [];
  const tailR = res.find(x => x.sp.id === 'redfish' && x.tail);
  if (tailR) alerts.push(`<b>Flood-tide tailing window.</b> High tide of ${tailR.tail.h.toFixed(1)} ft at ${fmtT(tailR.tail.t)} is big enough to push redfish up into the spartina. Be on the flats about 1½ hrs before high.${state.fly ? ' Weedless crab or shrimp fly.' : ''}`);
  const bedR = res.find(x => x.bed);
  if (bedR) alerts.push(`<b>Bream beds:</b> within a few days of the full moon — check shallow sandy flats for bedding bluegill and shellcracker.`);
  const rs = regStatus(r.sp.id, state.day0 + 43200e3);
  if (!rs.open) alerts.push(`<b>${esc(r.sp.name)} harvest is closed</b> through ${rs.until} — catch and release only.`);
  const sf = safety(sp, state.day0);
  if (sf.f === 0) alerts.push(`<b>Not a boating day for this spot:</b> ${esc(sf.why)} from NWS Jacksonville. See the marine forecast below, or let “Pick a spot” find an inshore option.`);
  if (c.pressure === 'pf') alerts.push(`<b>Post-front:</b> bluebird skies after a front usually slow the bite. Fish slower, deeper, and target the warmest part of the day.`);
  html += alerts.map(x => `<div class="alert">${x}</div>`).join('');
  // hero
  html += `<div class="card"><div class="banner">${Art.scene(r.sp.id, sp.water, { night: false })}<div class="cap">${esc(WATER_LABEL[sp.water] || '')}</div></div><div class="hrow"><div style="flex:1"><div class="muted small">${fmtD(state.day0)} · ${esc(sp.name)}</div><h2 style="margin:2px 0 0">${esc(r.sp.name)}${state.fly ? ' on fly' : ''}</h2></div>${WEB && featOn('alerts') ? '<button class="bell" data-albell="1" title="Set a bite alert" aria-label="Set a bite alert">🔔</button>' : ''}${badge(r.day)}</div>
  <div class="small muted" style="margin-top:4px">${rt} · season ${Math.round(r.season * 10)}/10 · water ~${Math.round(r.wt)}°F${r.pat ? ` · tuned by your ${r.pat.n} logged catches` : ''}</div>
  ${WEB && state.fly && featOn('flybench') ? flyBench(r.sp.id, true) : ''}
  ${WEB && (c.flowTxt || c.windTxt) ? `<div class="small" style="margin-top:6px">${c.flowTxt ? '🌊 ' + esc(c.flowTxt) + '<br>' : ''}${c.windTxt ? '💨 ' + esc(c.windTxt) : ''}</div>` : ''}
  ${wins.map(w => `<div class="win"><b>${fmtT(w.a)} – ${fmtT(w.b)}</b> ${badge(w.peak)}<div class="small muted">${esc(w.why.join(' · ') || 'best overlap of factors')}</div></div>`).join('')}
  ${WEB && featOn('colors') ? colorCard(r, sp, c) : ''}
  <div class="chartwrap" id="chartwrap">${chartSVG(day, r)}</div><div class="readout" id="readout">Tap or drag on the chart for details.</div>
  <div class="legend"><span><i style="background:var(--accent)"></i>Bite score</span>${day.ext.length ? '<span><i style="background:var(--tide);opacity:.5"></i>Tide</span>' : ''}<span><i style="background:var(--accent2);opacity:.35"></i>Major solunar</span><span><i style="background:var(--accent2);opacity:.15"></i>Minor</span><span><i style="background:#000;opacity:.35"></i>Night</span></div></div>`;
  if (WEB && featOn('now')) html += viewNow();
  if (!WEB || featOn('pickspot')) html += viewPickSpot();
  if (WEB && featOn('week')) html += viewWeek();
  // other species
  if (state.spId === 'auto' && (!WEB || featOn('others'))) {
    html += `<div class="card"><h2>Other good bets</h2>${res.slice(1, 6).map(x => `<div class="pick" data-sp="${x.sp.id}">${Art.fish(x.sp.id, { w: 70, cls: 'thumb' })}<div class="nm"><b>${esc(x.sp.name)}</b><span class="small muted">best ${fmtT(x.bestStart)} – ${fmtT(x.bestEnd)}</span></div>${badge(x.day)}</div>`).join('')}<div class="note">Tap a species to forecast it.</div></div>`;
  }
  // tides
  if (day.ext.length && (!WEB || featOn('tides'))) {
    html += `<div class="card"><h2>Tides <span class="small muted">· ${esc(sp.src || '')}</span></h2><div class="tides">${day.ext.map(e => `<div class="tide">${e.type === 'H' ? '▲ High' : '▼ Low'} <b>${fmtT(e.t)}</b> · ${e.h.toFixed(1)} ft</div>`).join('')}</div><div class="note">${WEB && sp.station ? `NOAA tide predictions for <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${esc(sp.station.id)}" target="_blank" rel="noopener">${esc(sp.station.name)} (${esc(sp.station.id)})</a>, heights in feet above MLLW. Wind and river flow can shift real water levels.` : 'Predicted from NOAA Mayport (8720218) tide harmonics; times are usually within ~15 min, heights within ~0.5 ft. Wind and river flow can shift real water levels.'}</div></div>`;
  }
  // sun & moon
  const maj = day.majors.filter(t => t >= state.day0 && t < state.day0 + 864e5).sort((x, y) => x - y);
  const mins = day.minors.filter(t => t >= state.day0 && t < state.day0 + 864e5).sort((x, y) => x - y);
  if (!WEB || featOn('solunar'))
  html += `<div class="card"><h2>Sun, moon & solunar</h2><div class="grid2">
   <div class="kv"><b>${fmtT(a.sunrise)}</b><span>Sunrise (first light ${fmtT(a.dawn)})</span></div><div class="kv"><b>${fmtT(a.sunset)}</b><span>Sunset (last light ${fmtT(a.dusk)})</span></div>
   <div class="kv"><b>${esc(a.phaseName)}</b><span>${Math.round(a.illum * 100)}% illuminated</span></div><div class="kv"><b>${fmtT(a.moonrise)} / ${fmtT(a.moonset)}</b><span>Moonrise / moonset</span></div></div>
   <div style="margin-top:8px">${maj.map(t => `<span class="tag hot">Major ${fmtT(t - 3600e3)}–${fmtT(t + 3600e3)}</span>`).join('')}${mins.map(t => `<span class="tag">Minor ${fmtT(t - 2700e3)}–${fmtT(t + 2700e3)}</span>`).join('')}</div>
   <div class="note">Majors are when the moon is overhead or underfoot; minors are moonrise and moonset. ${Math.min(day.dFull, day.dNew) < 3 ? 'Near a new or full moon these periods tend to be stronger.' : ''}</div></div>`;
  if (!WEB || featOn('marine')) html += viewMarine();
  if (!WEB || featOn('rules')) html += regsCard(r.sp, sp);
  // conditions
  html += viewConditions(c);
  return html;
}

function viewMarine() {
  const mf = marineFor(state.day0);
  const link = '<a href="https://www.weather.gov/marine/jaxmz" target="_blank" rel="noopener">NWS Jacksonville marine zones</a>';
  if (!state.marine) {
    const msg = WEB ? ({ loading: 'Loading the live NWS forecast…', error: 'Couldn’t reach the National Weather Service right now.' }[state.marineState] || '') : { loading: 'Loading the marine forecast…', slow: 'Still reaching the saved marine forecast — it may be out of date.', none: 'The marine forecast loads when this page is opened in Claude (it’s refreshed there a few times a day).', error: 'Couldn’t reach the saved marine forecast.' }[state.marineState] || '';
    return `<div class="card" id="marine"><h2>Small craft advisory & seas</h2><div class="small muted">${msg} Live: ${link}.</div></div>`;
  }
  const hl = Array.from(new Set(mf ? mf.headlines.concat(mf.headlinesOut) : (state.marine.zones.AMZ452 || {}).headlines || []));
  const pr = p => `<div class="win" style="border-color:${p.gale ? 'var(--bad)' : p.sca ? 'var(--accent2)' : 'var(--accent)'}"><b>${esc(p.name)}</b> ${p.gale ? '<span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad)">Gale</span>' : p.sca ? '<span class="tag hot">SCA</span>' : ''}<div class="small">${esc(p.wind)}${p.ktLo != null ? ` (${Math.round(p.ktLo * 1.15)}–${Math.round(p.ktHi * 1.15)} mph)` : ''}</div><div class="small">${esc(p.seas || '')}</div>${p.icw ? `<div class="small muted">${esc(p.icw)}</div>` : ''}</div>`;
  let body = '';
  if (mf && mf.has) {
    body += `<h3>Out to 20 nm (AMZ452)</h3>${mf.inner.map(pr).join('') || '<div class="small muted">No period for this day.</div>'}`;
    body += `<h3>20–60 nm (AMZ472)</h3>${mf.outer.map(pr).join('') || '<div class="small muted">No period for this day.</div>'}`;
  } else body = `<div class="small muted">The current NWS forecast doesn’t reach ${fmtD(state.day0)}.</div>`;
  const sca = mf && (mf.sca || mf.scaOuter);
  return `<div class="card" id="marine"><div class="hrow"><h2 style="flex:1;margin:0">Small craft advisory & seas</h2>${mf && mf.gale ? '<span class="score" style="background:var(--bad);color:#fff">GALE</span>' : sca ? '<span class="score s2">SCA</span>' : mf && mf.has ? '<span class="score s4">OK</span>' : ''}</div>
   ${hl.length ? `<div class="alert" style="margin-top:8px">${hl.map(h => esc(h)).join('<br>')}</div>` : '<div class="small muted" style="margin-top:6px">No advisories in the latest forecast.</div>'}
   ${body}
   <div class="note">NWS Jacksonville coastal waters forecast, issued ${state.marine.issuedText ? esc(state.marine.issuedText) : fmtD(Date.parse(state.marine.issued)) + ' ' + fmtT(Date.parse(state.marine.issued))}${mf && mf.stale ? ' — <b>this is more than 18 hours old</b>' : ''}.${state.marine.gulfStream ? ' Gulf Stream west wall: ' + esc(state.marine.gulfStream) + '.' : ''} Wind on this card fills in the bite forecast unless you enter your own. Always check ${link} before running the inlet.</div></div>`;
}

function viewPickSpot() {
  const c0 = state.day0, opts = { fly: state.fly, usePatterns: state.settings.usePatterns, catches: state.catches };
  const rows = spots().map(sp => {
    const day = getDay(c0, sp), c = cond(c0);
    const pool = WEB && sp.lat != null ? SPECIES.filter(s => speciesFits(s, sp)) : SPECIES.filter(s => s.waters.includes(sp.water));
    const res = pool.map(s => Engine.scoreSpecies(day, s, c, { ...opts, region: spotRegion(sp) }));
    const target = state.spId !== 'auto' ? res.find(r => r.sp.id === state.spId) : null;
    const best = target || res.sort((a, b) => b.day - a.day)[0];
    if (!best) return null;
    const sf = safety(sp, c0);
    return { sp, best, sf, v: best.day * sf.f };
  }).filter(Boolean).filter(x => state.spId === 'auto' || x.best.sp.id === state.spId).sort((a, b) => b.v - a.v).slice(0, 4);
  if (!rows.length) return '';
  const blocked = spots().map(sp => ({ sp, sf: safety(sp, c0) })).filter(x => x.sf.f === 0);
  return `<div class="card"><h2>Pick a spot${state.spId !== 'auto' ? ' for ' + esc(SPMAP[state.spId].name) : ''}</h2>
   ${rows.map((x, i) => `<div class="pick" data-gospot="${esc(x.sp.id)}">${Art.fish(x.best.sp.id, { w: 70, cls: 'thumb' })}<div class="nm"><b>${i === 0 ? '★ ' : ''}${esc(x.sp.name)}</b><span class="small muted">${esc(x.best.sp.name)} · ${fmtT(x.best.bestStart)} – ${fmtT(x.best.bestEnd)}${x.sf.why ? ' · ' + esc(x.sf.why) : ''}</span></div>${badge(x.v)}</div>`).join('')}
   ${blocked.length ? `<div class="note">Left out for boating safety: ${blocked.map(b => esc(b.sp.name)).join(', ')} (${esc(blocked[0].sf.why)}).</div>` : ''}
   <div class="note">Ranks every spot by its best bite window, then discounts spots the marine forecast makes unsafe or rough. Tap a spot to switch to it.</div></div>`;
}

function regsCard(spc, sp) {
  const r = REGS[spc.id];
  if (WEB) { const st = natState(sp || spot()); if (st && st !== 'FL') return `<div class="card"><h2 style="margin:0">Rules: ${esc(spc.name)}</h2>${stateRegsBody(st, sp || spot(), spc.id)}</div>`; }
  if (!r) return '';
  const st = regStatus(spc.id, state.day0 + 43200e3);
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">Rules: ${esc(spc.name)}</h2>${st.open ? '<span class="score s4" style="font-size:12px">OPEN</span>' : '<span class="score" style="background:var(--bad);color:#fff;font-size:12px">CLOSED</span>'}</div>${regsBody(spc.id, sp)}</div>`;
}
function regsBody(id, sp) {
  if (WEB) { const st = natState(sp || spot()); if (st && st !== 'FL') return stateRegsBody(st, sp || spot(), id); }
  const r = REGS[id]; if (!r) return '<div class="small muted">No regulation summary for this species — check MyFWC.com.</div>';
  return `<div class="grid2" style="margin-top:8px"><div class="kv"><b style="font-size:14px">${esc(r.size)}</b><span>Size</span></div><div class="kv"><b style="font-size:14px">${esc(r.bag)}</b><span>Bag limit</span></div></div>
   <div class="small" style="margin-top:6px"><b>Season:</b> ${esc(r.season)}${r.notes ? ' · ' + esc(r.notes) : ''}</div>
   ${WEB && state.geo ? `<div class="note">${esc(geoRegsNote())}</div>` : ''}<div class="note">${esc(regJurisdiction(sp || spot()))}. Summary checked ${REGS_CHECKED}${r.verify ? ' — <b>not fully confirmed, verify</b>' : ''}. Rules change; confirm at <a href="${esc(r.url)}" target="_blank" rel="noopener">MyFWC.com</a> before keeping fish.</div>`;
}

function viewConditions(c) {
  const opt = (id, v, list) => `<select id="${id}">${list.map(([k, l]) => `<option value="${k}" ${String(v) === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const month = new Date(state.day0 + 43200e3).getMonth(), salt = spot().water !== 'fresh';
  return `<div class="card"><h2>Conditions for ${fmtD(state.day0)}</h2><div class="small muted">${WEB ? 'Wind fills in from the NWS marine forecast. Enter the barometer trend, sky, clarity and water temp from your weather app' : 'Live weather can’t load inside this page, so enter what the forecast says'} — the scores update right away.</div>
   <div class="row"><div><label>Barometer</label>${opt('cPress', c.pressure, [['ff', 'Falling fast (front coming)'], ['f', 'Falling'], ['s', 'Steady'], ['r', 'Rising'], ['pf', 'Rising, post-front bluebird']])}</div></div>
   <div class="row"><div><label>Wind (mph)${c.windSrc === 'nws' ? ' · from NWS' : c.windSrc === 'auto' ? ' · forecast' : ''}</label><input id="cWind" type="number" inputmode="numeric" min="0" max="60" value="${c.windSrc === 'manual' ? esc(c.wind) : ''}" placeholder="${c.windSrc === 'nws' ? esc(c.wind) + ' (NWS forecast)' : c.windSrc === 'auto' ? esc(c.wind) + ' (forecast)' : '10'}"></div><div><label>Water temp °F${c.auto && c.auto.wtemp ? ' · auto' : ''}</label><input id="cTemp" type="number" inputmode="numeric" placeholder="${c.auto && c.auto.wtemp ? esc(c.wtemp) + ' (' + esc(c.auto.wtemp) + ')' : '~' + WATER_TEMP[salt ? 'salt' : 'fresh'][month] + ' typical'}" value="${c.auto && c.auto.wtemp ? '' : esc(c.wtemp)}"></div></div>
   <div class="row"><div><label>Sky</label>${opt('cSky', c.sky, [['sun', 'Sunny'], ['partly', 'Partly cloudy'], ['overcast', 'Overcast'], ['rain', 'Rain / storms']])}</div><div><label>Water clarity</label>${opt('cClar', WEB && c.auto && c.auto.clarity ? '' : c.clarity, [...(WEB ? [['', 'Auto' + (c.auto && c.auto.clarity ? ' (' + c.clarity + ')' : '')]] : []), ['clear', 'Clear'], ['stained', 'Stained'], ['muddy', 'Muddy']])}${WEB && c.auto && c.auto.clarity ? `<div class="small muted">${esc(c.auto.clarity)}</div>` : ''}}</div></div>
   ${WEB ? facingRow(c) + (featOn('watercheck') ? '<div class="row"><button class="btn sm ghost" data-watercheck="1">📷 Check the water (light &amp; clarity from a photo)</button></div>' : '') : ''}
   <h3>Check live</h3>${WEB ? webLiveLinks() : `<div class="small">
   <a href="https://www.weather.gov/jax/" target="_blank" rel="noopener">NWS Jacksonville forecast &amp; marine</a> ·
   <a href="https://www.ndbc.noaa.gov/station_page.php?station=mypf1" target="_blank" rel="noopener">Mayport gauge (pressure, water temp)</a> ·
   <a href="https://www.ndbc.noaa.gov/station_page.php?station=41112" target="_blank" rel="noopener">Offshore buoy 41112</a> ·
   <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=8720218" target="_blank" rel="noopener">NOAA Mayport tides</a> ·
   <a href="https://myfwc.com/fishing/saltwater/recreational/" target="_blank" rel="noopener">FWC saltwater regs</a> ·
   <a href="https://myfwc.com/fishing/freshwater/regulations/" target="_blank" rel="noopener">FWC freshwater regs</a></div>`}</div>`;
}

function chartSVG(day, r) {
  const W = 360, H = 170, L = 26, R = 8, T = 8, B = 22, cw = W - L - R, ch = H - T - B;
  const x = t => L + (t - day.t0) / 864e5 * cw;
  const ys = v => T + ch - v / 100 * ch;
  let g = '';
  // night shading
  const a = day.ast;
  if (a.dawn) g += `<rect x="${L}" y="${T}" width="${x(a.dawn) - L}" height="${ch}" fill="#000" opacity=".3"/>`;
  if (a.dusk) g += `<rect x="${x(a.dusk)}" y="${T}" width="${L + cw - x(a.dusk)}" height="${ch}" fill="#000" opacity=".3"/>`;
  // solunar
  day.majors.forEach(t => { const a1 = Math.max(day.t0, t - 3600e3), b1 = Math.min(day.t0 + 864e5, t + 3600e3); if (b1 > a1) g += `<rect x="${x(a1)}" y="${T}" width="${x(b1) - x(a1)}" height="${ch}" fill="var(--accent2)" opacity=".22"/>`; });
  day.minors.forEach(t => { const a1 = Math.max(day.t0, t - 2700e3), b1 = Math.min(day.t0 + 864e5, t + 2700e3); if (b1 > a1) g += `<rect x="${x(a1)}" y="${T}" width="${x(b1) - x(a1)}" height="${ch}" fill="var(--accent2)" opacity=".1"/>`; });
  // tide
  if (day.ext.length) {
    const pts = []; let mn = Infinity, mx = -Infinity;
    for (let t = day.t0; t <= day.t0 + 864e5; t += 10 * 60000) { const ts = Engine.tideAt(day.extAll, t); if (ts) { pts.push([t, ts.h]); mn = Math.min(mn, ts.h); mx = Math.max(mx, ts.h); } }
    mn = Math.min(mn, 0) - .3; mx = mx + .3;
    const yt = h => T + ch - (h - mn) / (mx - mn) * ch;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + yt(p[1]).toFixed(1)).join('');
    g += `<path d="${d} L${x(pts[pts.length - 1][0])} ${T + ch} L${x(pts[0][0])} ${T + ch}Z" fill="var(--tide)" opacity=".22"/><path d="${d}" fill="none" stroke="var(--tide)" stroke-width="1.5" opacity=".8"/>`;
    for (let f = Math.ceil(mn); f <= mx; f += 2) g += `<text x="${W - 2}" y="${yt(f) + 3}" font-size="8.5" fill="var(--tide)" text-anchor="end">${f}ft</text>`;
  }
  // score
  const sd = r.series.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + ys(p.v).toFixed(1)).join('');
  g += `<path d="${sd}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>`;
  // axes
  for (let v = 0; v <= 100; v += 50) g += `<line x1="${L}" x2="${L + cw}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${L - 4}" y="${ys(v) + 3}" font-size="9" fill="var(--muted)" text-anchor="end">${v}</text>`;
  for (let h = 0; h <= 24; h += 3) { const t = day.t0 + h * 3600e3; g += `<text x="${x(t)}" y="${H - 6}" font-size="9" fill="var(--muted)" text-anchor="middle">${h === 0 || h === 24 ? '12a' : h === 12 ? '12p' : h > 12 ? (h - 12) + 'p' : h + 'a'}</text>`; }
  const now = Date.now();
  if (now >= day.t0 && now < day.t0 + 864e5) g += `<line x1="${x(now)}" x2="${x(now)}" y1="${T}" y2="${T + ch}" stroke="var(--text)" stroke-width="1" opacity=".6"/>`;
  g += `<line id="cursor" x1="0" x2="0" y1="${T}" y2="${T + ch}" stroke="var(--text)" stroke-width="1" opacity="0"/>`;
  return `<svg id="chart" viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${g}</svg>`;
}
function bindChart() {
  const svg = $('#chart'); if (!svg) return;
  const handler = ev => {
    const rect = svg.getBoundingClientRect(), px = (ev.clientX - rect.left) / rect.width * 360;
    const fr = Math.max(0, Math.min(1, (px - 26) / (360 - 34)));
    const { day, res } = scoreAll(state.day0), r = chosen(res);
    const i = Math.min(r.series.length - 1, Math.round(fr * (r.series.length - 1))), p = r.series[i], s = day.samples[i];
    const c = $('#cursor'); c.setAttribute('x1', 26 + fr * 326); c.setAttribute('x2', 26 + fr * 326); c.setAttribute('opacity', '.7');
    $('#readout').innerHTML = `<b>${fmtT(p.t)}</b> · score <b>${Math.round(p.v)}</b>${s.ts ? ` · ${s.ts.h.toFixed(1)} ft, ${Engine.stageLabel(s.ts).toLowerCase()}` : ''}${s.solTag ? ' · ' + s.solTag.toLowerCase() : ''} · ${s.lbin.toLowerCase()}`;
  };
  svg.addEventListener('pointerdown', handler); svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') handler(e); });
}

function viewSpecies() {
  const { day, res } = scoreAll(state.day0);
  let html = topControls().replace(/<select id="spSel">[\s\S]*?<\/select>/, '');
  html += `<div style="margin:2px 0 10px"><button class="chip ${!state.allWaters ? 'on' : ''}" data-aw="0">${esc(WATER_LABEL[spot().water])} species</button><button class="chip ${state.allWaters ? 'on' : ''}" data-aw="1">All species</button></div>`;
  html += res.map(r => {
    const s = r.sp, m = new Date(state.day0 + 43200e3).getMonth();
    const fly = s.fly;
    return `<div class="card sp" data-open="${s.id}"><div class="hrow">${Art.fish(s.id, { w: 96, cls: 'spart' })}<div style="flex:1;min-width:0"><b>${esc(s.name)}</b><div class="small muted">${esc(s.grp)}${regStatus(s.id, state.day0 + 43200e3).open ? '' : ' · <span style="color:var(--bad)">harvest closed</span>'} · best ${fmtT(r.bestStart)} – ${fmtT(r.bestEnd)}${state.fly ? ` · fly ${'●'.repeat(fly.r)}${'○'.repeat(3 - fly.r)}` : ''}</div></div>${badge(r.day)}</div>
     <div class="mbar">${(s.season || [0,1,2,3,4,5,6,7,8,9,10,11].map(i => seasonFactor(s, spotRegion(spot()), i) * 10)).map((v, i) => `<i style="opacity:${.12 + v / 10 * .88}" class="${i === m ? 'cur' : ''}"></i>`).join('')}</div><div class="mlab">${MONTHS.map(x => `<span>${x}</span>`).join('')}</div>
     <div class="det"><h3>${WEB && spotRegion(spot()) && !['SA', null].includes(spotRegion(spot())) && SALT_REGIONS[s.id] ? 'Where to look' : WEB && !SALT_REGIONS[s.id] && !FW_LAT[s.id] ? 'Where to look' : 'Where around Jax'}</h3><div>${esc(WEB && SALT_REGIONS[s.id] && spotRegion(spot()) !== 'SA' ? (GENERIC_WHERE[s.id] || s.where) : s.where)}</div>
     ${state.fly ? `<h3>Fly kit</h3><div>${esc(fly.kit)}</div>${fly.flies.length ? `<ul class="ls">${fly.flies.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}<div class="small" style="margin-top:6px">${esc(fly.tips)}</div>${WEB ? flyBench(s.id) : ''}`
        : `<h3>Baits & lures</h3><ul class="ls">${s.bait.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`}
     <h3>How to fish it</h3><div class="small">${esc(s.tips)}</div>
     <h3>Rules ${regStatus(s.id, state.day0 + 43200e3).open ? '' : '<span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad)">Closed now</span>'}</h3>${regsBody(s.id)}
     <div class="note">Ideal water ${s.temp[1]}–${s.temp[2]}°F.</div>
     <div style="margin-top:10px"><button class="btn sm ghost" data-goto="${s.id}">Forecast this species</button> <button class="btn sm ghost" data-logsp="${s.id}">Log a catch</button></div></div></div>`;
  }).join('');
  return html;
}

// ===== Log =====
function catchCond(ts, spotId) {
  const sp = spots().find(s => s.id === spotId) || spot();
  const t0 = midnight(ts), day = getDay(t0, sp);
  const i = Math.min(day.samples.length - 1, Math.max(0, Math.round((ts - t0) / Engine.STEP)));
  const s = day.samples[i], raw = state.settings.cond[dkey(t0)] || {}, au = WEB ? (autoCond(sp, t0) || {}) : {};
  const c = { pressure: raw.pressure || au.pressure, wind: raw.wind ?? au.wind, sky: raw.sky || au.sky, clarity: raw.clarity, wtemp: raw.wtemp || (WEB && lakeTemp(sp, t0) || {}).v || au.wtemp };
  return {
    stage: s.ts ? Engine.stageLabel(s.ts) : null, stageBin: s.ts ? Engine.stageBin(s.ts) : null, tideFt: s.ts ? +s.ts.h.toFixed(2) : null,
    sol: s.solTag || 'none', lbin: s.lbin, moon: day.ast.phaseName, illum: Math.round(day.ast.illum * 100),
    pressure: c.pressure || null, wind: c.wind ?? null, sky: c.sky || null, clarity: c.clarity || null, wtemp: c.wtemp || null,
  };
}
function viewLog() {
  const cs = state.catches.filter(c => state.logFilter === 'all' || c.species === state.logFilter);
  const fish = cs.reduce((a, c) => a + (+c.count || 1), 0);
  const bySp = {}; state.catches.forEach(c => bySp[c.species] = (bySp[c.species] || 0) + (+c.count || 1));
  const stor = WEB ? 'Saved on this phone (this browser). Use “Copy log as CSV” to back it up.' : { cloud: 'Saved to your Claude account — syncs across your devices.', local: 'Saved in this browser only (sign in to claude.ai to sync).', loading: 'Loading your log…', slow: 'Still reaching your saved log — it may be out of date.', error: 'Couldn’t reach your saved log; using this browser for now.' }[state.storage];
  let html = (WEB ? accountCard() : '') + `<div class="card"><div class="row"><button class="btn" data-newcatch="1">+ Log a catch</button>${WEB ? '<button class="btn ghost" data-photolog="1">📷 Log from photo</button>' : state.sample ? '<button class="btn ghost" data-fishid="1">📷 Identify a fish</button>' : ''}</div><div class="note">${stor}${state.sample || WEB ? '' : ' Fish ID by photo works when this page is opened in Claude.'}</div></div>`;
  html += `<div class="card"><h2>Your numbers</h2><div class="grid2"><div class="kv"><b>${state.catches.reduce((a, c) => a + (+c.count || 1), 0)}</b><span>Fish logged</span></div><div class="kv"><b>${Object.keys(bySp).length}</b><span>Species</span></div></div>
   <div style="margin-top:8px"><button class="chip ${state.logFilter === 'all' ? 'on' : ''}" data-lf="all">All</button>${Object.entries(bySp).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<button class="chip ${state.logFilter === k ? 'on' : ''}" data-lf="${esc(k)}">${esc(SPMAP[k] ? SPMAP[k].name : k)} · ${n}</button>`).join('')}</div>
   ${state.logFilter !== 'all' ? patternView(state.logFilter) : '<div class="note">Pick a species to see when and how you catch it. With 5+ catches of a species, its forecast is tuned to your own pattern (turn off in Settings).</div>'}
   ${state.catches.length ? `<div style="margin-top:10px"><button class="btn sm ghost" data-csv="1">Copy log as CSV</button>${WEB && featOn('trip') ? ' <button class="btn sm ghost" data-trip="1">📝 Trip report</button>' : ''}</div>` : ''}</div>`;
  if (WEB) html += (featOn('crew') ? crewCard() : '') + (featOn('forecastcheck') ? viewForecastCheck() : '');
  html += `<div class="card">${cs.length ? cs.map(c => `<div class="catch" data-edit="${esc(c.id)}">${WEB ? photoTag(c) : ''}<div class="ic${Art.has(c.species) ? ' art' : ''}">${Art.has(c.species) ? Art.fish(c.species, { w: 64 }) : (c.method === 'fly' ? 'F' : '•')}${c.count > 1 ? `<span class="cnt">×${c.count}</span>` : ''}</div><div class="tx"><b>${esc(SPMAP[c.species] ? SPMAP[c.species].name : c.species)}</b>${c.length ? ` · ${esc(c.length)}"` : ''}${c.weight ? ` · ${esc(c.weight)} lb` : ''}
     <div class="small muted">${fmtD(c.ts)} ${fmtT(c.ts)} · ${esc((spots().find(s => s.id === c.spot) || {}).name || c.spotName || '')}${c.lat != null ? ` · <a href="https://maps.apple.com/?ll=${c.lat},${c.lng}&q=Catch" target="_blank" rel="noopener">📍 map</a>` : ''}</div>
     <div class="small">${[c.bait, c.method === 'fly' ? 'on fly' : '', c.kept ? 'kept' : 'released'].filter(Boolean).map(esc).join(' · ')}</div>
     <div class="small muted">${c.cond ? [c.cond.stage, c.cond.sol !== 'none' ? c.cond.sol : '', c.cond.moon].filter(Boolean).map(esc).join(' · ') : ''}</div></div></div>`).join('') : '<div class="muted">No catches yet. Each entry records the tide stage, solunar period and moon automatically.</div>'}</div>`;
  return html;
}
function patternView(spId) {
  const list = state.catches.filter(c => c.species === spId && c.cond);
  if (!list.length) return '';
  const bars = (title, key, bins) => {
    const m = {}; bins.forEach(b => m[b] = 0); list.forEach(c => { const v = c.cond[key]; if (v in m) m[v] += (+c.count || 1); });
    const mx = Math.max(1, ...Object.values(m));
    return `<h3>${title}</h3><div class="bars">${bins.map(b => `<div class="b"><span>${b}</span><i style="width:${(m[b] / mx * 60).toFixed(0)}%"></i><em class="small muted">${m[b]}</em></div>`).join('')}</div>`;
  };
  return bars('Tide stage', 'stageBin', ['In-early', 'In-mid', 'In-late', 'Out-early', 'Out-mid', 'Out-late']) + bars('Time of day', 'lbin', ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Dusk', 'Night']) +
    bars('Solunar', 'sol', ['Major solunar', 'Minor solunar', 'none']) + `<div class="note">${list.length >= 5 ? 'Forecast for this species is tuned to these patterns.' : `${5 - list.length} more catch${5 - list.length === 1 ? '' : 'es'} to start tuning the forecast.`}</div>`;
}
function openCatch(c, fresh) {
  const isNew = !c || !!fresh; c = c || { id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), species: state.spId !== 'auto' ? state.spId : '', spot: state.spotId, method: state.fly ? 'fly' : 'conv', count: 1, kept: false };
  const dt = new Date(c.ts - new Date(c.ts).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const sps = spots();
  const sugg = new Set(); SPECIES.forEach(s => { s.bait.forEach(b => sugg.add(b)); s.fly.flies.forEach(f => sugg.add(f)); });
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">${isNew ? 'Log a catch' : 'Edit catch'}</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <label>Species</label><select id="fSp"><option value="">Choose…</option>${['Freshwater', 'Panfish', 'Inshore', 'Surf', 'Nearshore', 'Offshore'].map(g => `<optgroup label="${g}">${SPECIES.filter(s => s.grp === g).map(s => `<option value="${s.id}" ${s.id === c.species ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}<option value="other" ${c.species === 'other' ? 'selected' : ''}>Other</option></select>
   <div class="row"><div><label>When</label><input id="fTs" type="datetime-local" value="${dt}"></div></div>
   <label>Where</label><select id="fSpot">${sps.map(s => `<option value="${esc(s.id)}" ${s.id === c.spot ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
   <label>Spot details (optional)</label><input id="fWhere" value="${esc(c.where || '')}" placeholder="e.g., east jetty tip, oyster bar by marker 34">
   <div class="row"><div><label>Method</label><select id="fMeth"><option value="conv" ${c.method !== 'fly' ? 'selected' : ''}>Conventional</option><option value="fly" ${c.method === 'fly' ? 'selected' : ''}>Fly</option></select></div><div><label>How many</label><input id="fCnt" type="number" inputmode="numeric" min="1" value="${esc(c.count || 1)}"></div></div>
   <label>Bait / lure / fly</label><input id="fBait" list="baitList" value="${esc(c.bait || '')}"><datalist id="baitList">${[...sugg].map(s => `<option value="${esc(s)}">`).join('')}</datalist>
   <div class="row"><div><label>Length (in)</label><input id="fLen" type="number" inputmode="decimal" step="0.25" value="${esc(c.length || '')}"></div><div><label>Weight (lb)</label><input id="fWt" type="number" inputmode="decimal" step="0.1" value="${esc(c.weight || '')}"></div></div>
   <label>Kept or released</label><div><button class="chip ${!c.kept ? 'on' : ''}" data-kept="0">Released</button><button class="chip ${c.kept ? 'on' : ''}" data-kept="1">Kept</button></div>
   ${WEB ? photoField(c) : ''}
   <label>Notes</label><textarea id="fNotes">${esc(c.notes || '')}</textarea>
   <div class="note" id="fCond"></div>
   ${WEB && !state.catches.find(x => x.id === c.id) ? crewShareRow() : ''}
   <div style="margin-top:12px"><button class="btn" data-savecatch="1">Save catch</button></div>
   ${isNew ? '' : '<div style="margin-top:10px" id="delWrap"><button class="btn danger" data-del="1">Delete this catch</button></div>'}</div>`;
  $('#sheet')._c = { ...c }; $('#sheet')._photoFile = c._photoFile || null; delete $('#sheet')._c._photoFile; $('#sheet').classList.add('on'); updCond();
}
function updCond() {
  const ts = new Date($('#fTs').value).getTime(); if (isNaN(ts)) return;
  const k = catchCond(ts, $('#fSpot').value);
  $('#fCond').textContent = 'Recorded automatically: ' + [k.stage && k.stage + ' tide' + (k.tideFt != null ? ` (${k.tideFt.toFixed(1)} ft)` : ''), k.sol !== 'none' ? k.sol : 'no solunar period', k.moon + ` (${k.illum}%)`, k.lbin].filter(Boolean).join(' · ') + (k.pressure ? '' : '. Weather from the Conditions card for that day, if you entered it.');
}
async function saveCatchForm() {
  const c = $('#sheet')._c; const sp = $('#fSp').value; if (!sp) { toast('Pick a species'); return; }
  const ts = new Date($('#fTs').value).getTime(); if (isNaN(ts)) { toast('Check the date and time'); return; }
  const spotId = $('#fSpot').value;
  const out = { id: c.id, ts, species: sp, spot: spotId, spotName: (spots().find(s => s.id === spotId) || {}).name || '', where: $('#fWhere').value.trim(), method: $('#fMeth').value, count: Math.max(1, parseInt($('#fCnt').value) || 1), bait: $('#fBait').value.trim(), length: $('#fLen').value, weight: $('#fWt').value, kept: !!c.kept, notes: $('#fNotes').value.trim(), cond: catchCond(ts, spotId), idBy: c.idBy || null, lat: c.lat ?? null, lng: c.lng ?? null, created: c.created || Date.now() };
  const btn = document.querySelector('[data-savecatch]'); btn.disabled = true; btn.textContent = 'Saving…';
  if (c.photo) out.photo = c.photo; if (c.photoThumb) out.photoThumb = c.photoThumb;
  if (WEB && $('#sheet')._photoFile) { try { await attachPhoto(out, $('#sheet')._photoFile); } catch (e) { toast('Couldn’t save the photo'); } }
  const shareCrew = WEB && $('#cfCrew') && $('#cfCrew').checked, shareSpot = WEB && $('#cfCrewSpot') && $('#cfCrewSpot').checked;
  const ok = await Store.saveCatch(out);
  btn.disabled = false; btn.textContent = 'Save catch';
  if (ok && shareCrew) crewShareCatch(out, shareSpot);
  if (ok && WEB) Stats.track('catch_logged');
  if (ok) { $('#sheet').classList.remove('on'); toast('Catch saved'); if (!Store.db || Store.localLog) render(); }
}
function csv() {
  const cols = ['date', 'time', 'species', 'count', 'length_in', 'weight_lb', 'method', 'bait', 'spot', 'spot_detail', 'kept', 'tide_stage', 'tide_ft', 'solunar', 'moon', 'light', 'pressure', 'wind_mph', 'sky', 'clarity', 'water_temp_f', 'lat', 'lon', 'notes'];
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = state.catches.map(c => { const k = c.cond || {}; return [dkey(c.ts), new Date(c.ts).toTimeString().slice(0, 5), SPMAP[c.species] ? SPMAP[c.species].name : c.species, c.count, c.length, c.weight, c.method, c.bait, c.spotName, c.where, c.kept ? 'kept' : 'released', k.stage, k.tideFt, k.sol, k.moon, k.lbin, k.pressure, k.wind, k.sky, k.clarity, k.wtemp, c.lat, c.lng, c.notes].map(q).join(','); });
  return [cols.join(',')].concat(rows).join('\n');
}

// ===== Fish ID (photo → Claude) =====
let idFile = null, idCtl = null, idResult = null;
function openFishId() {
  idFile = null; idResult = null;
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Identify a fish</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <div class="small muted" style="margin:6px 0 10px">Take a photo or pick one from your library. A clear side view, whole fish, with the tail visible, works best. Lay it next to a ruler or bump board if you want a length estimate.</div>
   <label class="btn ghost" style="display:block;text-align:center">📷 Take or choose photo<input id="idFile" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" style="display:none"></label>
   <img id="idPrev" alt="" style="display:none;width:100%;max-height:300px;object-fit:contain;border-radius:12px;margin-top:10px;background:#000">
   <div style="margin-top:10px"><button class="btn" id="idGo" data-idgo="1" disabled>Identify</button></div>
   <div id="idOut" style="margin-top:12px"></div></div>`;
  $('#sheet').classList.add('on');
}
async function runFishId() {
  if (!idFile || !state.sample) return;
  const out = $('#idOut'), go = $('#idGo'); go.disabled = true; go.textContent = 'Looking…';
  out.innerHTML = '<div class="muted">Thinking… (this can take up to a minute)</div>';
  idCtl = new AbortController();
  const list = SPECIES.map(s => `${s.id}: ${s.name}`).join('\n');
  const prompt = `An angler near Jacksonville, Florida photographed this fish (waters: St. Johns River fresh and brackish, Intracoastal Waterway, Atlantic surf, nearshore and offshore). Identify the species from the photo.
If it matches one of these app species ids, use that id; otherwise use "other":
${list}
Reply with only a JSON object:
{"is_fish": true, "id": "redfish", "common_name": "Red drum", "scientific_name": "Sciaenops ocellatus", "confidence": 0.9, "key_features": ["up to 4 short visible features you used"], "look_alikes": [{"name": "Black drum", "how_to_tell": "short tip"}], "estimated_length_in": null, "photo_note": "short note on photo quality or what would confirm the ID"}
confidence is 0–1. Only give estimated_length_in when a ruler or measuring board is clearly readable in the photo; otherwise null. If the photo is not a fish, set is_fish false.`;
  try {
    const r = await state.sample.json(prompt, { images: [idFile], signal: idCtl.signal });
    idResult = r || {};
    if (r && r.is_fish === false) { out.innerHTML = '<div class="alert">That doesn’t look like a fish photo. Try a clearer side view.</div>'; return; }
    const id = SPMAP[r.id] ? r.id : null, conf = Math.round(Math.max(0, Math.min(1, +r.confidence || 0)) * 100);
    const st = id ? regStatus(id, Date.now()) : { open: true };
    out.innerHTML = `<div class="card" style="margin:0"><div class="hrow">${id && Art.has(id) ? Art.fish(id, { w: 90, cls: 'spart' }) : ''}<div style="flex:1"><b style="font-size:17px">${esc(r.common_name || (id && SPMAP[id].name) || 'Unknown')}</b><div class="small muted"><i>${esc(r.scientific_name || '')}</i></div></div><span class="score ${conf >= 80 ? 's4' : conf >= 55 ? 's2' : 's1'}">${conf}%</span></div>
      ${conf < 60 ? '<div class="alert" style="margin-top:8px">Low confidence — check the look-alikes below before you keep it.</div>' : ''}
      ${Array.isArray(r.key_features) && r.key_features.length ? `<h3>What gave it away</h3><ul class="ls">${r.key_features.slice(0, 4).map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${Array.isArray(r.look_alikes) && r.look_alikes.length ? `<h3>Look-alikes</h3><ul class="ls">${r.look_alikes.slice(0, 3).map(l => `<li><b>${esc(l.name)}</b> — ${esc(l.how_to_tell)}</li>`).join('')}</ul>` : ''}
      ${r.estimated_length_in ? `<div class="small" style="margin-top:6px">Estimated length from the ruler: <b>${esc(r.estimated_length_in)}"</b> — measure it yourself before keeping.</div>` : ''}
      ${r.photo_note ? `<div class="note">${esc(r.photo_note)}</div>` : ''}
      ${id ? `<h3>Rules ${st.open ? '' : '<span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad)">Closed until ' + esc(st.until) + '</span>'}</h3>${regsBody(id)}` : '<div class="note">Not one of the app’s species — check MyFWC.com for its rules.</div>'}
      <div style="margin-top:10px"><button class="btn" data-idlog="1">Log this catch</button></div>
      <div class="note">Photo ID is a best guess by Claude, not a legal identification. You are responsible for knowing what you keep.</div></div>`;
  } catch (e) {
    const code = e && e.code;
    const msg = { not_granted: 'Fish ID needs your OK to use Claude — allow it when asked and try again.', rate_limited: 'Too many requests right now — try again in a minute.', image_rejected: 'That photo couldn’t be read — try a JPEG or a smaller photo.', invalid_json: 'Got an unclear answer — tap Identify again.', images_unavailable: 'Photo ID isn’t available in this view.', cancelled: '' }[code] ?? 'Something went wrong — try again.';
    out.innerHTML = msg ? `<div class="alert">${msg}</div>` : '';
    if (code === 'not_granted' || code === 'images_unavailable' || code === 'sampling_disabled') { state.sample = null; }
  } finally { go.disabled = false; go.textContent = 'Identify again'; }
}

// ===== Settings =====
function viewSettings() {
  const sps = spots();
  return `${WEB ? (featOn('alerts') ? alertsCard() : '') + mySpotsCard() + featureCard() + offlineCard() + '<div class="card"><h2>Tips</h2><div class="small">Step-by-step tips show the first time you open each screen.</div><div class="row" style="margin-top:8px"><button class="btn ghost" data-tipsagain="1">💡 Show tips again</button></div><h2 style="margin-top:16px">Privacy</h2><div class="small muted">To see how many people use the app and which shops and clubs send them, it counts visits and features used with a random ID kept in this browser — no names, emails, IP addresses or locations. Browsers set to “Do Not Track” send nothing. Your spots, catches and settings stay on this device, or in your account if you sign in.</div></div>' : ''}<div class="card"><h2>Tide offsets by spot${WEB ? ' (Jacksonville examples)' : ''}</h2><div class="small muted">Times shift the Mayport prediction (minutes, + is later); ratios scale heights. Presets come from NOAA subordinate stations. Adjust any spot to match what you see on the water.</div>
  ${sps.filter(s => s.tide).map(s => `<div class="spotrow"><b>${esc(s.name)}</b> <span class="small muted">${esc(s.src || 'custom')}</span>
   <div class="g4" style="margin-top:6px"><div><label>High +min</label><input data-off="${esc(s.id)}" data-k="hi" type="number" inputmode="numeric" value="${s.tide.hi}"></div><div><label>Low +min</label><input data-off="${esc(s.id)}" data-k="lo" type="number" inputmode="numeric" value="${s.tide.lo}"></div><div><label>High ×</label><input data-off="${esc(s.id)}" data-k="hr" type="number" inputmode="decimal" step="0.01" value="${s.tide.hr}"></div><div><label>Low ×</label><input data-off="${esc(s.id)}" data-k="lr" type="number" inputmode="decimal" step="0.01" value="${s.tide.lr}"></div></div>
   ${s.custom ? `<button class="btn sm danger" style="margin-top:8px" data-rmspot="${esc(s.id)}">Remove spot</button>` : ''}</div>`).join('')}
  </div>
  <div class="card"><h2>Add your own spot</h2><label>Name</label><input id="nsName" placeholder="e.g., Sisters Creek boat ramp"><div class="row"><div><label>Water</label><select id="nsWater">${Object.entries(WATER_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div><div><label>High / low offset (min)</label><input id="nsOff" placeholder="e.g., 45 / 60"></div></div><div style="margin-top:10px"><button class="btn ghost" data-addspot="1">Add spot</button></div></div>
  <div class="card"><h2>Forecast</h2><label><input type="checkbox" id="usePat" style="width:auto" ${state.settings.usePatterns ? 'checked' : ''}> Tune forecasts with my catch log (needs 5+ catches of a species)</label></div>
  <div class="card"><h2>How the forecast works</h2><div class="small">Each 15 minutes of the day gets a score from: the <b>species’ season</b> and water temperature, <b>tidal current</b> and stage at your spot, <b>solunar periods</b> (moon overhead/underfoot and moonrise/set, stronger near new and full moon), <b>light</b> (dawn, day, dusk, night), and the <b>weather you enter</b> (barometer, wind, sky, clarity). Fly mode lowers wind tolerance, rewards clear water and sight-fishing light, and ranks species by how good they are on fly.<br><br>${WEB ? 'Tides come from NOAA predictions for the station nearest each spot; weather and water temperature from Open-Meteo; marine forecasts and advisories from the National Weather Service. Seasons are typical regional patterns, adjusted by water temperature — your log is what makes it yours. Always check NOAA and NWS for navigation and safety.' : 'Tides are computed on the page from harmonic constants fitted to NOAA’s published Mayport (8720218) predictions, checked against NOAA tables months away (times within ~15 min, heights ~0.5 ft). Always check NOAA for navigation. Seasons are typical NE Florida patterns — your log is what makes it yours.'}</div></div>`;
}

// ===== Events =====
document.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-sp],[data-open],[data-edit],[data-gospot]'); if (!t) return;
  const d = t.dataset;
  if (d.tab) { state.tab = d.tab; render(); window.scrollTo(0, 0); try { history.replaceState(null, '', '#' + d.tab); } catch (e) { } return; }
  if (d.fly != null) { state.fly = d.fly === '1'; state.settings.fly = state.fly; Store.saveSettings(); render(); return; }
  if (d.day) { state.day0 = +d.day; render(); return; }
  if (d.sp) { state.spId = d.sp; render(); window.scrollTo(0, 0); return; }
  if (d.aw != null) { state.allWaters = d.aw === '1'; render(); return; }
  if (d.goto) { state.spId = d.goto; state.tab = 'forecast'; if (!eligible(spot()).find(s => s.id === d.goto)) { const s = spots().find(x => SPMAP[d.goto].waters.includes(x.water)); if (s) state.spotId = s.id; } render(); window.scrollTo(0, 0); return; }
  if (d.logsp) { state.tab = 'log'; render(); openCatch({ id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), species: d.logsp, spot: state.spotId, method: state.fly ? 'fly' : 'conv', count: 1, kept: false }, true); return; }
  if (d.open && !e.target.closest('button')) { t.classList.toggle('open'); return; }
  if (d.newcatch) { openCatch(null); return; }
  if (d.fishid) { openFishId(); return; }
  if (d.locate) { locateMe(); return; }
  if (d.idgo) { runFishId(); return; }
  if (d.idlog) { const r = idResult || {}; const id = SPMAP[r.id] ? r.id : 'other'; openCatch({ id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), species: id, spot: state.spotId, method: state.fly ? 'fly' : 'conv', count: 1, kept: false, length: r.estimated_length_in || '', notes: id === 'other' && r.common_name ? r.common_name : '', idBy: r.common_name ? { name: r.common_name, conf: +r.confidence || 0 } : null }, true); return; }
  if (d.gospot) { state.spotId = d.gospot; state.settings.spotId = d.gospot; Store.saveSettings(); render(); window.scrollTo(0, 0); return; }
  if (d.edit) { openCatch(state.catches.find(c => c.id === d.edit)); return; }
  if (d.close) { if (idCtl) idCtl.abort(); $('#sheet').classList.remove('on'); return; }
  if (d.kept != null) { $('#sheet')._c.kept = d.kept === '1'; t.parentNode.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === t)); return; }
  if (d.savecatch) { saveCatchForm(); return; }
  if (d.del) { t.outerHTML = '<div class="row"><button class="btn danger" data-delyes="1">Yes, delete</button><button class="btn ghost" data-close="1">Keep it</button></div>'; return; }
  if (d.delyes) { if (WEB) removePhotos($('#sheet')._c); await Store.deleteCatch($('#sheet')._c.id); $('#sheet').classList.remove('on'); toast('Deleted'); if (!Store.db || Store.localLog) render(); return; }
  if (d.lf) { state.logFilter = d.lf; render(); return; }
  if (d.csv) { try { await navigator.clipboard.writeText(csv()); toast('Copied — paste into a spreadsheet'); } catch (er) { toast('Copy was blocked'); } return; }
  if (d.addspot) {
    const name = $('#nsName').value.trim(); if (!name) { toast('Give the spot a name'); return; }
    const water = $('#nsWater').value, nums = ($('#nsOff').value.match(/-?\d+/g) || []).map(Number);
    const s = { id: 'u_' + Date.now().toString(36), name, water, custom: true, src: 'custom', tide: ['fresh', 'offshore'].includes(water) ? null : { hi: nums[0] || 0, lo: nums[1] ?? nums[0] ?? 0, hr: 1, lr: 1 } };
    state.settings.custom = (state.settings.custom || []).concat(s); state.spotId = s.id; state.settings.spotId = s.id; Store.saveSettings(); dayCache.clear(); toast('Spot added'); render(); return;
  }
  if (d.rmspot) { state.settings.custom = state.settings.custom.filter(s => s.id !== d.rmspot); if (state.spotId === d.rmspot) state.spotId = 'mayport'; Store.saveSettings(); dayCache.clear(); render(); return; }
});
document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'spotSel') { state.spotId = e.target.value; state.settings.spotId = state.spotId; if (state.spId !== 'auto' && !eligible(spot()).find(s => s.id === state.spId)) state.spId = 'auto'; Store.saveSettings(); render(); }
  else if (id === 'spSel') { state.spId = e.target.value; render(); }
  else if (id === 'datePick') { const [y, m, dd] = e.target.value.split('-').map(Number); if (y) { state.day0 = new Date(y, m - 1, dd).getTime(); render(); } }
  else if (['cPress', 'cWind', 'cTemp', 'cSky', 'cClar', 'cFace'].includes(id)) {
    const k = dkey(state.day0), c = { ...(state.settings.cond[dkey(state.day0)] || {}) };
    c.pressure = $('#cPress').value; c.wind = $('#cWind').value === '' ? '' : +$('#cWind').value; c.wtemp = $('#cTemp').value; c.sky = $('#cSky').value; c.clarity = $('#cClar').value; if (WEB && $('#cFace')) { const f = $('#cFace').value, sid = spot().id; state.settings.facing = state.settings.facing || {}; if (f) state.settings.facing[sid] = f; else delete state.settings.facing[sid]; }
    state.settings.cond = { ...state.settings.cond, [k]: c };
    // keep only the last ~60 days of condition entries
    const keys = Object.keys(state.settings.cond).sort(); while (keys.length > 60) delete state.settings.cond[keys.shift()];
    Store.saveSettings(); const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  else if (id === 'fTs' || id === 'fSpot') updCond();
  else if (id === 'idFile') { const f = e.target.files && e.target.files[0]; if (f) { idFile = f; const im = $('#idPrev'); im.src = URL.createObjectURL(f); im.style.display = 'block'; $('#idGo').disabled = false; $('#idOut').innerHTML = ''; } }
  else if (id === 'usePat') { state.settings.usePatterns = e.target.checked; Store.saveSettings(); }
  else if (e.target.dataset.off) {
    const sid = e.target.dataset.off, k = e.target.dataset.k, v = parseFloat(e.target.value); if (isNaN(v)) return;
    const cu = (state.settings.custom || []).find(s => s.id === sid);
    if (cu) cu.tide = { ...cu.tide, [k]: v };
    else state.settings.spots = { ...state.settings.spots, [sid]: { ...(state.settings.spots[sid] || {}), [k]: v } };
    dayCache.clear(); Store.saveSettings(); toast('Saved');
  }
});

// Deep links: #forecast, #marine, #species, #regulations, #log, #fishid, #settings
function applyHash() {
  const h = (location.hash || '').slice(1).toLowerCase();
  const inv = WEB && h.match(/^crew=([a-z0-9]{4,8})$/); // invite link from a crew member
  if (inv) { state.tab = 'log'; state.pendingCrew = inv[1].toUpperCase(); history.replaceState(null, '', location.pathname + location.search); render(); setTimeout(() => { const el = $('#crCode'); if (el) { el.value = state.pendingCrew; el.scrollIntoView({ block: 'center' }); } }, 400); return; }
  const bite = h.match(/^bite=([a-z0-9_-]+)$/); // e.g. #bite=redfish, used by links from Fly Bench
  if (bite && SPMAP[bite[1]]) {
    const id = bite[1]; state.spId = id; state.tab = 'forecast';
    if (!eligible(spot()).find(s => s.id === id)) { const sp = spots().find(x => SPMAP[id].waters.includes(x.water)); if (sp) state.spotId = sp.id; }
    history.replaceState(null, '', location.pathname + location.search); render(); window.scrollTo(0, 0); return;
  }
  const map = { forecast: 'forecast', marine: 'forecast', boating: 'forecast', species: 'species', regulations: 'species', rules: 'species', log: 'log', catchlog: 'log', fishid: 'log', settings: 'settings', ...(WEB ? { map: 'map' } : {}) };
  if (!map[h]) return;
  state.tab = map[h]; render();
  if (h === 'marine' || h === 'boating') setTimeout(() => { const el = document.getElementById('marine'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
  else window.scrollTo(0, 0);
  if (h === 'fishid' && state.sample) openFishId();
}
window.addEventListener('hashchange', applyHash);
if (!WEB) { render(); applyHash(); Store.init(); }
(async () => { try { if (!window.claude || !claude.use) return; const sm = await claude.use('sample'); if (!sm) return; const lim = await sm.limits().catch(() => null); if (lim && lim.images) { state.sample = sm; render(); } } catch (e) { } })();
