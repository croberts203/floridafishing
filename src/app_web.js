// ===== Website-only UI: spots anywhere in the US, accounts, nationwide marine & rules =====
function natState(sp) { const p = sp && sp.lat != null ? natPoint(sp) : null; return p ? p.state : null; }
const WATER_OPTS = [['fresh', 'Fresh water (lake, river, pond)'], ['greatlakes', 'Great Lakes'], ['inshore', 'Inshore salt / brackish (bay, river mouth, flats)'], ['surf', 'Surf / beach'], ['nearshore', 'Nearshore (boat, within ~10 mi)'], ['offshore', 'Offshore']];
const waterSel = (cls, v, extra = '') => `<select class="${cls}" ${extra}>${WATER_OPTS.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
function saveMySpots(list) { state.settings.mySpots = list; Store.saveSettings(); dayCache.clear(); }

// ---- Storage: Supabase account when signed in, this phone otherwise ----
Store.init = async function () { if (window.Stats) Stats.init('forecast', SB_URL, SB_KEY); this.fallback(); render(); applyHash(); await Cloud.init(); };
{
  const localSettings = Store.saveSettings.bind(Store);
  Store.saveSettings = function () {
    localSettings();
    clearTimeout(this._cloudT);
    this._cloudT = setTimeout(() => { if (Cloud.user) Cloud.saveSettings(JSON.parse(JSON.stringify(state.settings))).catch(() => toast('Settings didn’t sync')); }, 1200);
  };
}
Store.saveCatch = async function (c) {
  if (Cloud.user) { try { await Cloud.save(c); } catch (e) { toast('Catch not saved — check your connection'); return false; } }
  const i = state.catches.findIndex(x => x.id === c.id); if (i >= 0) state.catches[i] = c; else state.catches.unshift(c);
  state.catches.sort((a, b) => b.ts - a.ts);
  if (!Cloud.user) lsSet('jaxbite.catches', state.catches);
  return true;
};
Store.deleteCatch = async function (id) {
  if (Cloud.user) { try { await Cloud.del(id); } catch (e) { toast('Delete failed'); return; } }
  state.catches = state.catches.filter(c => c.id !== id);
  if (!Cloud.user) lsSet('jaxbite.catches', state.catches);
};

function accountCard() {
  if (!Cloud.ready) return '';
  if (Cloud.user) {
    return `<div class="card"><div class="hrow"><div style="flex:1"><b>Cloud log on</b><div class="small muted">Signed in as ${esc(Cloud.user.email)} — your catches sync to every phone you sign in on.</div></div><button class="btn sm ghost" data-signout="1">Sign out</button></div>
     ${state.localPending ? `<div class="alert" style="margin-top:10px">${state.localPending} catch${state.localPending === 1 ? '' : 'es'} saved on this phone before you signed in. <button class="btn sm" data-uploadlocal="1" style="margin-top:6px">Upload to my account</button></div>` : ''}</div>`;
  }
  return `<div class="card"><b>Save your log to the cloud</b><div class="small muted">Sign in to keep your catches safe and see them on every phone. The same account works in the Fly Tying Recipes app.</div>
   <div class="row" style="margin-top:8px"><input id="acEmail" type="email" autocomplete="email" placeholder="Email"><input id="acPass" type="password" autocomplete="current-password" placeholder="Password"></div>
   <div class="row" style="margin-top:8px"><button class="btn" data-signin="1">Sign in</button><button class="btn ghost" data-signup="1">Create account</button></div>
   <div class="note"><a href="#" data-forgot="1">Forgot password?</a></div></div>`;
}

// ---- Spot picker: GPS, search, saved spots ----
let addDraft = null;
function openAddSpot() {
  addDraft = null;
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Add a fishing spot</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <button class="btn" data-gpsspot="1" style="margin-top:10px">📍 Use my current location</button>
   <label>Or search a town, lake or harbor</label><div class="row"><input id="placeQ" placeholder="e.g., Montauk NY, Lake Erie, Port Aransas"><button class="btn sm" data-placego="1" style="flex:0 0 auto">Search</button></div>
   <div id="placeRes"></div><div id="spotDraft"></div></div>`;
  $('#sheet').classList.add('on');
}
async function draftSpot(lat, lng, name, acc, nearSpot) {
  $('#spotDraft').innerHTML = '<div class="muted" style="margin-top:10px">Looking up the nearest tide station…</div>';
  let st = []; try { st = await nearestStations(lat, lng); } catch (e) { }
  const near = st[0], guess = near && near.km < 8 ? 'inshore' : 'fresh';
  addDraft = { lat, lng, name, stations: st, acc };
  $('#spotDraft').innerHTML = `<label>Spot name</label><input id="dName" value="${esc(name)}">
   ${nearSpot ? `<div class="note">You have <b>${esc(nearSpot.s.name)}</b> saved ${nearSpot.d < 1000 ? Math.round(nearSpot.d) + ' m' : (nearSpot.d / 1000).toFixed(1) + ' km'} away. <a href="#" data-usespot="${esc(nearSpot.s.id)}">Use it instead</a></div>` : ''}
   <label>Pin — drag it onto the exact water</label><div id="dMap" class="minimap"></div>
   <div class="small muted" id="dPos">${lat.toFixed(5)}, ${lng.toFixed(5)}${acc ? ` · ${gpsStatus({ acc })}` : ''}</div>
   <label>What kind of water?</label>${waterSel('', guess, 'id="dWater"')}
   <div id="dFw" class="small" style="margin-top:6px"></div>
   <div class="note">${near ? `Nearest NOAA tide station: <b>${esc(near.name)}</b> (${near.km} km). It’s used for salt water spots.` : 'No NOAA tide station found nearby.'}</div>
   <div style="margin-top:12px"><button class="btn" data-savespot="1">Save spot</button></div>`;
  draftWaterType(lat, lng);
  let tmr = null;
  pinMap('dMap', lat, lng, (la, ln) => {
    addDraft.lat = la; addDraft.lng = ln; addDraft.fw = null; addDraft.moved = true;
    $('#dPos').textContent = `${la.toFixed(5)}, ${ln.toFixed(5)} · placed by hand`;
    clearTimeout(tmr); tmr = setTimeout(() => draftWaterType(la, ln), 500);
  });
}
async function draftWaterType(lat, lng) {
  const box = $('#dFw'); if (!box) return;
  box.textContent = 'Checking the USGS map for a lake or river here…';
  let j = null; try { j = await getJSON(`${TIDE_API}?water=${lat.toFixed(5)},${lng.toFixed(5)}`); } catch (e) { }
  if (!addDraft || Math.abs(addDraft.lat - lat) > 1e-6 || Math.abs(addDraft.lng - lng) > 1e-6) return; // pin moved since
  if (!$('#dFw') || !addDraft) return;
  if (!j || !j.kind) { box.textContent = j && !j.error ? 'No mapped lake or stream within 150 m — very small ponds and creeks often aren’t on the USGS map. Drag the pin onto the water, or set the type after saving.' : ''; return; }
  addDraft.fw = { kind: j.kind, name: j.name || null, acres: j.acres || null };
  NAT.fw = NAT.fw || {}; NAT.fw[lat.toFixed(5) + ',' + lng.toFixed(5)] = addDraft.fw; lsSet('ff.fw', NAT.fw);
  box.innerHTML = `Looks like <b>${esc(j.name || 'unnamed water')}</b> — ${FW_LABEL[j.kind].toLowerCase()}${j.acres ? `, ${j.acres.toLocaleString()} acres` : ''}${j.withinM ? ` (mapped water ${j.withinM <= 25 ? 'within 25 m' : 'about ' + j.withinM + ' m away'})` : ''}.`;
  if ($('#dWater').value !== 'fresh' && !(((addDraft.stations || [])[0] || {}).km < 8)) $('#dWater').value = 'fresh';
  const nm = $('#dName'); if (j.name && (!nm.value || /^(my spot|my location)$/i.test(nm.value) || /^-?\d/.test(nm.value))) nm.value = j.name;
}
function saveDraft() {
  if (!addDraft) return;
  const water = $('#dWater').value, name = $('#dName').value.trim() || addDraft.name || 'My spot';
  const near = (addDraft.stations || [])[0];
  const sp = { id: 'm_' + Date.now().toString(36), name, lat: +addDraft.lat.toFixed(5), lng: +addDraft.lng.toFixed(5), water, group: 'My spots' };
  if (water === 'fresh' && addDraft.fw) sp.fw = addDraft.fw;
  if (near && near.km < 60 && !['fresh', 'greatlakes'].includes(water)) sp.station = { id: near.id, name: near.name, km: near.km };
  saveMySpots([sp].concat(state.settings.mySpots || []));
  state.spotId = sp.id; state.settings.spotId = sp.id; state.spId = 'auto';
  $('#sheet').classList.remove('on'); toast('Spot saved'); render(); window.scrollTo(0, 0);
}
// Explain why location failed and how to fix it, instead of a two-second toast.
function geoHelp(err) {
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), android = /Android/.test(ua);
  let why, how;
  if (!window.isSecureContext) {
    why = 'Phones only share GPS with sites opened over a secure <b>https://</b> address. This page was opened without one.';
    how = 'fishforecast.net is still finishing its security certificate; location will work as soon as the site opens at <b>https://fishforecast.net</b>. Until then, use <b>Search a place</b>.';
  } else if (err && err.code === 1) {
    why = 'Location permission is turned off for this site.';
    how = ios ? '<b>iPhone:</b> Settings → Privacy &amp; Security → Location Services → turn it on, then Safari Websites (or Chrome) → <b>While Using</b>. In Safari, tap <b>aA</b> in the address bar → Website Settings → Location → <b>Allow</b>. Reload the page.'
      : android ? '<b>Android Chrome:</b> tap the icon left of the address → Permissions → Location → <b>Allow</b>. Also check Settings → Location is on and Chrome has location permission. Reload the page.'
      : 'Click the icon left of the address bar → Site settings → Location → <b>Allow</b>, then reload.';
  } else {
    why = err && err.code === 3 ? 'GPS took too long to get a fix.' : 'Your device couldn’t determine a location.';
    how = 'Make sure Location is on, step outside or near a window, and try again — or use <b>Search a place</b>.';
  }
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Location not available</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <p class="small" style="margin-top:10px">${why}</p><p class="small">${how}</p>
   <div class="row" style="margin-top:10px"><button class="btn" data-addspot2="1">Search a place</button><button class="btn ghost" data-close="1">OK</button></div></div>`;
  $('#sheet').classList.add('on');
}
locateMe = function () {
  if (!navigator.geolocation || !window.isSecureContext) { geoHelp(null); return; }
  openAddSpot(); const box = $('#spotDraft'); box.innerHTML = '<div class="small" id="gpsProg" style="margin-top:10px">Getting a GPS fix…</div>';
  getFix(c => { const el = $('#gpsProg'); if (el) el.textContent = gpsStatus(c); }).then(async c => {
    state.geo = { ...c, t: Date.now() };
    // only snap to a saved spot if you're really at it (ponds and creeks can be close together)
    let best = null;
    for (const sp of spots()) { if (sp.lat == null) continue; const d = distKm([c.lat, c.lng], [sp.lat, sp.lng]) * 1000; if (!best || d < best.d) best = { s: sp, d }; }
    const near = Math.min(300, Math.max(80, c.acc * 2));
    if (best && best.d <= near) { state.spotId = best.s.id; state.settings.spotId = best.s.id; Store.saveSettings(); $('#sheet').classList.remove('on'); toast(`At ${best.s.name} (GPS ±${c.acc} m)`); render(); window.scrollTo(0, 0); return; }
    await draftSpot(c.lat, c.lng, 'My spot', c.acc, best && best.d < 3000 ? best : null);
  }).catch(err => { $('#sheet').classList.remove('on'); geoHelp(err); });
};
function mySpotsCard() {
  const mine = state.settings.mySpots || [];
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">My spots</h2><button class="btn sm" data-addspot2="1">+ Add spot</button></div>
   ${mine.length ? mine.map(s => `<div class="spotrow"><b>${esc(s.name)}</b> <span class="small muted">${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}${natState(s) ? ' · ' + esc(natState(s)) : ''}</span>
     <label>Water</label>${waterSel('', s.water, `data-spotwater="${esc(s.id)}"`)}
     ${s.water === 'fresh' ? fwLine(s) : ''}${['fresh', 'greatlakes'].includes(s.water) ? '' : `<div class="small" style="margin-top:6px">Tide station: <b>${s.station ? esc(s.station.name) + (s.station.km != null ? ` (${s.station.km} km)` : '') : 'none'}</b> <a href="#" data-stations="${esc(s.id)}">change</a></div><div id="stl_${esc(s.id)}"></div>`}
     <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-movespot="${esc(s.id)}">📍 Adjust pin</button><button class="btn sm danger" data-delspot="${esc(s.id)}">Remove</button></div></div>`).join('') : '<div class="small muted" style="margin-top:6px">No spots yet — add your home water with GPS or search.</div>'}</div>`;
}
function welcomeCard() {
  if ((state.settings.mySpots || []).length || state.settings.welcomed) return '';
  return `<div class="card" style="border-color:var(--accent)"><div class="banner">${Art.scene('bass', 'fresh')}</div><b>Fish anywhere in the US</b><div class="small" style="margin-top:4px">Add your own spot to get tides from the nearest NOAA station, live weather, the NWS marine forecast and advisories, local species and your state’s rules. The Jacksonville spots are examples.</div>
   <div class="row" style="margin-top:10px"><button class="btn" data-locate="1">📍 Use my location</button><button class="btn ghost" data-addspot2="1">Search a place</button></div>
   <div class="note"><a href="#" data-welcomed="1">Hide this</a></div></div>`;
}

// ---- Marine card for any US coast or the Great Lakes ----
viewMarine = function () {
  const sp = spot();
  if (sp.water === 'fresh') return '';
  const link = `<a href="https://www.weather.gov/marine/" target="_blank" rel="noopener">NWS marine forecasts</a>`;
  const mf = natMarineFor(sp, state.day0);
  if (!mf) {
    const loading = NAT.pending.size > 0;
    return `<div class="card" id="marine"><h2>Small craft advisory & seas</h2><div class="small muted">${loading ? 'Loading the NWS marine forecast for this spot…' : 'No NWS coastal or Great Lakes forecast found for this spot.'} ${link}</div></div>`;
  }
  const pr = p => `<div class="win" style="border-color:${p.gale ? 'var(--bad)' : p.sca ? 'var(--accent2)' : 'var(--accent)'}"><b>${esc(p.name)}</b> ${p.gale ? '<span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad)">Gale+</span>' : p.sca ? '<span class="tag hot">SCA</span>' : ''}<div class="small">${esc(p.wind)}${p.ktLo != null ? ` (${Math.round(p.ktLo * 1.15)}–${Math.round(p.ktHi * 1.15)} mph)` : ''}</div><div class="small">${esc(p.seas || '')}</div>${p.icw ? `<div class="small muted">${esc(p.icw)}</div>` : ''}</div>`;
  const zoneOpts = Object.values(mf.zones).sort((a, b) => a.id.localeCompare(b.id)).map(z => `<option value="${esc(z.id)}" ${z.id === mf.zone.id ? 'selected' : ''}>${esc(z.id)} — ${esc(z.name.slice(0, 70))}</option>`).join('');
  return `<div class="card" id="marine"><div class="hrow"><h2 style="flex:1;margin:0">Small craft advisory & seas</h2>${mf.gale ? '<span class="score" style="background:var(--bad);color:#fff">GALE</span>' : mf.sca ? '<span class="score s2">SCA</span>' : mf.has ? '<span class="score s4">OK</span>' : ''}</div>
   <label>Marine zone</label><select id="zoneSel">${zoneOpts}</select>
   ${mf.headlines.length ? `<div class="alert" style="margin-top:8px">${mf.headlines.map(esc).join('<br>')}</div>` : '<div class="small muted" style="margin-top:6px">No advisories in effect for this zone.</div>'}
   ${mf.inner.length ? mf.inner.map(pr).join('') : `<div class="small muted">The current forecast doesn’t reach ${fmtD(state.day0)}.</div>`}
   <div class="note">NWS ${esc(mf.office)} forecast${mf.issuedText ? ', issued ' + esc(mf.issuedText) : ''}${mf.stale ? ' — <b>more than 18 hours old</b>' : ''}. Advisories come live from NWS alerts. Always check ${link} before heading out.</div></div>`;
};

// ---- Rules for whichever state the spot is in ----
function stateRegsBody(st, sp, id) {
  const se = SE_REGS[st], isSalt = sp && !['fresh', 'greatlakes'].includes(sp.water);
  if (se && isSalt && id && se.sp[id]) {
    const r = se.sp[id], until = seClosed(r, state.day0 + 43200e3, sp);
    return `<div class="kvrows" style="margin-top:6px">
      <div><span class="muted small">Size</span><b>${esc(r.size)}</b></div><div><span class="muted small">Bag</span><b>${esc(r.bag)}</b></div><div><span class="muted small">Season</span><b>${esc(r.season)}</b></div></div>
      ${until ? `<div class="alert" style="margin-top:8px">Closed now — reopens after ${esc(until)}.</div>` : ''}
      ${r.notes ? `<div class="small" style="margin-top:6px">${esc(r.notes)}</div>` : ''}${r.verify ? '<div class="small" style="margin-top:4px;color:var(--accent2)">Changes by proclamation — confirm before keeping fish.</div>' : ''}
      <div style="margin-top:8px"><a class="btn sm ghost" href="${esc(se.url)}" target="_blank" rel="noopener">${esc(se.agency)} ↗</a></div>
      <div class="note">${esc(se.note)} State waters; federal rules can differ offshore. Checked ${esc(SE_REGS_CHECKED)} — rules change, so confirm before keeping fish.</div>`;
  }
  const r = STATE_REGS[st]; const salt = sp && !['fresh', 'greatlakes'].includes(sp.water);
  const url = r ? (salt && r[2] ? r[2] : r[1]) : 'https://www.fisheries.noaa.gov/state-recreational-fishing-websites';
  return `<div class="small" style="margin-top:6px">Size, bag and season limits for this spot are set by <b>${esc(r ? r[0] : st)}</b>${sp && sp.water === 'offshore' ? ' (and by federal rules in federal waters)' : ''}. They change often, so check the official source before keeping fish.</div>
   <div style="margin-top:8px"><a class="btn sm ghost" href="${esc(url)}" target="_blank" rel="noopener">${esc(r ? r[0] : 'State')} ${salt ? 'saltwater' : 'fishing'} regulations ↗</a>${sp && sp.water === 'offshore' ? ' <a class="btn sm ghost" href="https://www.fisheries.noaa.gov/topic/recreational-fishing" target="_blank" rel="noopener">Federal rules ↗</a>' : ''}</div>
   <div class="note">Licenses are required in every state for most anglers. ${st ? 'State from your spot’s location.' : ''}</div>`;
}

function webLiveLinks() {
  const sp = spot(), st = natState(sp), pt = sp.lat != null ? natPoint(sp) : null, r = STATE_REGS[st];
  const L = (href, txt) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(txt)}</a>`;
  const links = [];
  if (pt && pt.cwa) links.push(L(`https://www.weather.gov/${pt.cwa.toLowerCase()}/`, `NWS ${pt.cwa} forecast`));
  if (sp.lat != null) links.push(L(`https://forecast.weather.gov/MapClick.php?lat=${sp.lat}&lon=${sp.lng}`, 'Point forecast'));
  if (sp.station) links.push(L(`https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${sp.station.id}`, `NOAA tides: ${sp.station.name}`));
  if (sp.water !== 'fresh') links.push(L('https://www.ndbc.noaa.gov/', 'Buoys (NDBC)'));
  if (sp.water === 'fresh' && sp.lat != null) links.push(L(`https://waterdata.usgs.gov/`, 'USGS river levels'));
  if (r) links.push(L(r[2] && sp.water !== 'fresh' ? r[2] : r[1], `${r[0]} fishing rules`));
  return `<div class="small">${links.join(' · ')}</div>`;
}

// ---- Events ----
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a,[data-place]'); if (!t) return;
  const d = t.dataset;
  if (d.addspot2) { e.preventDefault(); openAddSpot(); return; }
  if (d.gpsspot) {
    if (!navigator.geolocation || !window.isSecureContext) { geoHelp(null); return; }
    $('#spotDraft').innerHTML = '<div class="small" id="gpsProg" style="margin-top:10px">Getting a GPS fix…</div>';
    getFix(c => { const el = $('#gpsProg'); if (el) el.textContent = gpsStatus(c); }).then(c => draftSpot(c.lat, c.lng, 'My spot', c.acc)).catch(err => geoHelp(err));
    return;
  }
  if (d.placego) {
    const q = $('#placeQ').value.trim(); if (!q) return;
    $('#placeRes').innerHTML = '<div class="muted" style="margin-top:8px">Searching…</div>';
    try { const r = await searchPlaces(q); NAT.places = r; $('#placeRes').innerHTML = r.length ? r.map((p, i) => `<div class="pick" data-place="${i}"><div class="nm"><b>${esc(p.name)}</b><span class="small muted">${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}</span></div></div>`).join('') : '<div class="muted">No US places found.</div>'; }
    catch (er) { $('#placeRes').innerHTML = '<div class="muted">Search failed — check your connection.</div>'; }
    return;
  }
  if (d.place != null) { const p = NAT.places[+d.place]; $('#placeRes').innerHTML = ''; draftSpot(p.lat, p.lng, p.name.split(',')[0]); return; }
  if (d.savespot) { saveDraft(); return; }
  if (d.delspot) { const list = (state.settings.mySpots || []).filter(s => s.id !== d.delspot); saveMySpots(list); if (state.spotId === d.delspot) state.spotId = (list[0] || DEFAULT_SPOTS[0]).id; render(); return; }
  if (d.welcomed) { e.preventDefault(); state.settings.welcomed = true; Store.saveSettings(); render(); return; }
  if (d.stations) {
    e.preventDefault(); const sp = (state.settings.mySpots || []).find(s => s.id === d.stations); if (!sp) return;
    const box = document.getElementById('stl_' + sp.id); box.innerHTML = '<div class="muted small">Loading stations…</div>';
    try { const st = await nearestStations(sp.lat, sp.lng); box.innerHTML = `<select data-stationfor="${esc(sp.id)}">${st.map(x => `<option value="${esc(x.id)}|${esc(x.name)}|${x.km}" ${sp.station && sp.station.id === x.id ? 'selected' : ''}>${esc(x.name)} (${x.km} km)</option>`).join('')}</select>`; }
    catch (er) { box.innerHTML = '<div class="muted small">Couldn’t load stations.</div>'; }
    return;
  }
  if (d.signin || d.signup) {
    const email = ($('#acEmail') || {}).value?.trim(), pass = ($('#acPass') || {}).value || '';
    if (!email || pass.length < 6) { toast('Enter your email and a password (6+ characters)'); return; }
    t.disabled = true;
    try {
      const r = d.signin ? await Cloud.sb.auth.signInWithPassword({ email, password: pass }) : await Cloud.sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin + '/' } });
      if (!r.error && d.signup && window.Stats) Stats.track('signup');
      if (r.error) toast(r.error.message); else if (d.signup && !r.data.session) toast('Check your email to confirm, then sign in');
    } finally { t.disabled = false; }
    return;
  }
  if (d.forgot) { e.preventDefault(); const email = ($('#acEmail') || {}).value?.trim(); if (!email) { toast('Enter your email first'); return; } await Cloud.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' }); toast('Password reset email sent'); return; }
  if (d.signout) { await Cloud.sb.auth.signOut(); toast('Signed out'); return; }
  if (d.uploadlocal) { t.disabled = true; try { const n = await Cloud.uploadLocal(); toast(`Uploaded ${n} catch${n === 1 ? '' : 'es'}`); } catch (er) { toast('Upload failed'); t.disabled = false; } return; }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'zoneSel') { const list = (state.settings.mySpots || []).map(s => s.id === state.spotId ? { ...s, zone: el.value } : s); if (list.find(s => s.id === state.spotId)) saveMySpots(list); else { state.settings.zoneFor = { ...(state.settings.zoneFor || {}), [state.spotId]: el.value }; Store.saveSettings(); } dayCache.clear(); render(); return; }
  if (el.dataset.fwkind != null) { const m = { ...(state.settings.fwKinds || {}) }; if (el.value) m[el.dataset.fwkind] = el.value; else delete m[el.dataset.fwkind]; state.settings.fwKinds = m; Store.saveSettings(); dayCache.clear(); render(); return; }
  if (el.dataset.spotwater) { const list = (state.settings.mySpots || []).map(s => s.id === el.dataset.spotwater ? { ...s, water: el.value } : s); saveMySpots(list); render(); return; }
  if (el.dataset.stationfor) { const [id, name, km] = el.value.split('|'); const list = (state.settings.mySpots || []).map(s => s.id === el.dataset.stationfor ? { ...s, station: { id, name, km: +km } } : s); saveMySpots(list); toast('Tide station changed'); render(); return; }
});

// ---- Start ----
async function webStart() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  await Store.init();
}
webStart();

// ---- Log a catch from a photo: species + length (Claude via Supabase), weight estimate, time & GPS from the photo ----
const SHAPE = { deep: ['bream', 'redear', 'panfish-other', 'crappie', 'sheepshead', 'blackdrum', 'permit', 'pompano', 'tripletail', 'scup', 'perch', 'carp', 'jack', 'mahi'], slim: ['trout', 'striper', 'redfish', 'cobia', 'tarpon', 'weakfish', 'pike', 'musky', 'king', 'spanish', 'bluefish', 'albie', 'whiting', 'walleye', 'rainbow', 'brown', 'brook', 'laketrout', 'salmongl', 'salmonpac', 'shad', 'snook', 'lingcod'], flat: ['flounder', 'fluke', 'calhalibut', 'pachalibut'] };
function estWeight(id, inches) { // rough length→weight; varies with girth and season
  const L = +inches; if (!L) return null;
  const k = SHAPE.deep.includes(id) ? 1000 : SHAPE.slim.includes(id) ? 2100 : SHAPE.flat.includes(id) ? 1700 : 1500;
  const w = L * L * L / k; return w < 0.05 ? null : Math.round(w * (w < 5 ? 10 : 1)) / (w < 5 ? 10 : 1);
}
function readExif(buf) {
  const v = new DataView(buf); if (v.getUint16(0) !== 0xFFD8) return {};
  let o = 2;
  while (o < v.byteLength - 4) {
    const m = v.getUint16(o), len = v.getUint16(o + 2);
    if (m === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
      const t = o + 10, le = v.getUint16(t) === 0x4949, u16 = p => v.getUint16(t + p, le), u32 = p => v.getUint32(t + p, le);
      const ifd = p => { const n = u16(p), out = {}; for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), off: e + 8 }; } return out; };
      const str = en => { const p = en.count > 4 ? u32(en.off) : en.off; let s = ''; for (let i = 0; i < en.count - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i)); return s; };
      const rats = en => { const p = u32(en.off), r = []; for (let i = 0; i < en.count; i++) r.push(u32(p + i * 8) / u32(p + i * 8 + 4)); return r; };
      const res = {}, i0 = ifd(u32(4));
      if (i0[0x8769]) { const ex = ifd(u32(i0[0x8769].off)); const dt = ex[0x9003] || ex[0x9004]; if (dt) { const m2 = str(dt).match(/(\d+):(\d+):(\d+) (\d+):(\d+):(\d+)/); if (m2) res.time = new Date(+m2[1], m2[2] - 1, +m2[3], +m2[4], +m2[5], +m2[6]).getTime(); } }
      if (i0[0x8825]) {
        const g = ifd(u32(i0[0x8825].off));
        if (g[2] && g[4]) { const a = rats(g[2]), b = rats(g[4]); let lat = a[0] + a[1] / 60 + a[2] / 3600, lng = b[0] + b[1] / 60 + b[2] / 3600; if (g[1] && str(g[1]) === 'S') lat = -lat; if (g[3] && str(g[3]) === 'W') lng = -lng; if (isFinite(lat) && isFinite(lng) && (lat || lng)) { res.lat = lat; res.lng = lng; } }
      }
      return res;
    }
    if ((m & 0xFF00) !== 0xFF00) break; o += 2 + len;
  }
  return {};
}
async function shrink(file) {
  const bmp = await createImageBitmap(file); const s = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85);
}
let photoDraft = null;
function openPhotoLog() {
  photoDraft = null;
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Log a catch from a photo</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <div class="small muted" style="margin:6px 0 10px">Take a photo or pick one from your library. Side view, whole fish, next to a ruler or bump board if you want a length. The app reads the photo’s time and location when they’re saved in it, and fills in tide, moon and weather for that moment.</div>
   <label class="btn" style="display:block;text-align:center">📷 Take or choose photo<input id="plFile" type="file" accept="image/*" style="display:none"></label>
   <img id="plPrev" alt="" style="display:none;width:100%;max-height:280px;object-fit:contain;border-radius:12px;margin-top:10px;background:#000">
   <div id="plOut" style="margin-top:10px"></div></div>`;
  $('#sheet').classList.add('on');
}
async function runPhotoLog(file) {
  const out = $('#plOut'); const im = $('#plPrev'); im.src = URL.createObjectURL(file); im.style.display = 'block';
  const lines = []; const show = extra => { out.innerHTML = `<div class="small">${lines.join('<br>')}</div>${extra || ''}`; };
  let exif = {}; try { exif = readExif(await file.arrayBuffer()); } catch (e) { }
  const d = { ts: exif.time || Date.now(), tsSrc: exif.time ? 'photo' : 'now', lat: exif.lat, lng: exif.lng, posSrc: exif.lat != null ? 'photo' : '', file };
  lines.push(`🕒 ${d.tsSrc === 'photo' ? 'Taken' : 'Time'}: <b>${fmtD(d.ts)} ${fmtT(d.ts)}</b>${d.tsSrc === 'photo' ? ' (from photo)' : ' (now — the photo had no time)'}`);
  show();
  if (d.lat == null && navigator.geolocation && Math.abs(Date.now() - d.ts) < 3 * 3600e3) {
    lines.push('📍 Getting your position…'); show();
    try { const c = await getFix(null, 20, 10000); d.lat = c.lat; d.lng = c.lng; d.posSrc = 'GPS'; d.acc = c.acc; } catch (e) { }
    lines.pop();
  }
  lines.push(d.lat != null ? `📍 Location: <b>${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}</b> (${d.posSrc === 'photo' ? 'from photo' : 'your GPS'})` : '📍 No location in the photo — the catch goes to your selected spot.');
  // nearest saved spot
  let best = null; if (d.lat != null) for (const s of spots()) { if (s.lat == null) continue; const k = distKm([d.lat, d.lng], [s.lat, s.lng]); if (!best || k < best.k) best = { s, k }; }
  d.spot = best && best.k < 15 ? best.s.id : state.spotId;
  lines.push(`🎣 Spot: <b>${esc((spots().find(s => s.id === d.spot) || {}).name || '')}</b>${best && best.k >= 15 ? ' (nearest saved spot is far — add this place as a spot to track it)' : ''}`);
  show();
  // species + length from the photo
  if (Cloud.user && Cloud.sb) {
    lines.push('🔎 Identifying the fish…'); show();
    try {
      const img = await shrink(file);
      const sp = spots().find(s => s.id === d.spot) || spot();
      const pool = SPECIES.filter(s => sp.lat == null || speciesFits(s, sp)); const list = (pool.length ? pool : SPECIES).map(s => `${s.id}: ${s.name}`);
      const { data: sess } = await Cloud.sb.auth.getSession();
      const r = await fetch(SB_URL + '/functions/v1/catch-photo', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.session.access_token, apikey: SB_KEY }, body: JSON.stringify({ image: img, media_type: 'image/jpeg', species: list, region: (REGION_LABEL[spotRegion(sp)] || 'the US') + (natState(sp) ? ', ' + natState(sp) : '') }) });
      const j = await r.json(); lines.pop();
      if (!r.ok) lines.push('⚠️ ' + esc(j.message || 'Photo ID unavailable — pick the species yourself.'));
      else if (j.is_fish === false) lines.push('⚠️ That doesn’t look like a fish — pick the species yourself.');
      else {
        d.species = SPMAP[j.id] ? j.id : 'other'; d.name = j.common_name; d.conf = +j.confidence || 0; d.length = j.length_in || '';
        lines.push(`🐟 <b>${esc(j.common_name || 'Unknown')}</b> · ${Math.round(d.conf * 100)}% sure${j.key_features && j.key_features.length ? ' — ' + esc(j.key_features.slice(0, 2).join(', ')) : ''}`);
        if (d.length) lines.push(`📏 About <b>${esc(d.length)}"</b>${j.length_basis ? ' (measured against ' + esc(j.length_basis) + ')' : ''} — check it yourself`);
        else lines.push('📏 No ruler in the photo, so no length estimate — measure and enter it.');
        if (d.length && d.species !== 'other') { d.weight = estWeight(d.species, d.length); if (d.weight) lines.push(`⚖️ Roughly <b>${d.weight} lb</b> (estimated from length)`); }
        if (j.look_alikes && j.look_alikes[0] && j.look_alikes[0].name) lines.push(`<span class="muted">Look-alike: ${esc(j.look_alikes[0].name)} — ${esc(j.look_alikes[0].how_to_tell || '')}</span>`);
      }
    } catch (e) { lines.pop(); lines.push('⚠️ Photo ID failed — check your connection, or pick the species yourself.'); }
  } else lines.push('🔒 <b>Sign in</b> (Catch log tab) to identify the species and length from the photo. You can still log it now.');
  photoDraft = d;
  const spx = spots().find(s => s.id === d.spot) || spot();
  const where = d.lat != null ? { lat: d.lat, lng: d.lng, water: spx.water } : spx;
  for (let i = 0; i < 25 && where.lat != null && !natPoint(where); i++) await new Promise(r => setTimeout(r, 200)); // state lookup
  const stCode = where.lat != null ? natState(where) : null;
  if (stCode) lines.push(`📜 Rules: <b>${esc((STATE_REGS[stCode] || [stCode])[0])}</b>`);
  const rulesHtml = d.species && d.species !== 'other' ? (() => { const st = (stCode === 'FL' || SE_REGS[stCode]) ? regStatus(d.species, d.ts, where) : { open: true }; return `<div class="card" style="margin:12px 0 0"><div class="hrow"><b style="flex:1">Local rules: ${esc(SPMAP[d.species].name)}</b>${(stCode === 'FL' || SE_REGS[stCode]) ? (st.open ? '<span class="score s4" style="font-size:12px">OPEN</span>' : '<span class="score" style="background:var(--bad);color:#fff;font-size:12px">CLOSED</span>') : ''}</div>${!st.open ? `<div class="alert" style="margin-top:8px">Harvest is closed until ${esc(st.until)} — release it.</div>` : ''}${stCode && stCode !== 'FL' ? stateRegsBody(stCode, { ...spx, ...(d.lat != null ? { lat: d.lat, lng: d.lng } : {}) }, d.species) : stCode === 'FL' ? regsBody(d.species, spx) : '<div class="small muted">Couldn’t work out which state you’re in — check your state’s rules.</div>'}${d.length && REGS[d.species] && stCode === 'FL' ? `<div class="note">Your fish: about ${esc(d.length)}" — compare with the size limit above and measure before keeping.</div>` : ''}</div>`; })() : (d.name ? `<div class="note">Check ${esc((STATE_REGS[stCode] || ['your state'])[0])} rules for ${esc(d.name)} before keeping it.</div>` : '');
  show(rulesHtml + `<div style="margin-top:12px"><button class="btn" data-photocontinue="1">Continue to log this catch</button></div><div class="note">Tide, solunar, moon and weather for that time are recorded automatically.</div>`);
}
document.addEventListener('change', e => { if (e.target.id === 'plFile' && e.target.files && e.target.files[0]) runPhotoLog(e.target.files[0]); });
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.photolog) { Stats.track('photo_log'); openPhotoLog(); return; }
  if (t.dataset.photocontinue && photoDraft) {
    const d = photoDraft;
    openCatch({ id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: d.ts, species: d.species || '', spot: d.spot, method: state.fly ? 'fly' : 'conv', count: 1, kept: false,
      length: d.length || '', weight: d.weight || '', notes: d.species === 'other' && d.name ? d.name : '', idBy: d.name ? { name: d.name, conf: d.conf } : null, lat: d.lat != null ? +d.lat.toFixed(5) : null, lng: d.lng != null ? +d.lng.toFixed(5) : null, _photoFile: d.file }, true);
  }
});

// ---- "Right now" card ----
// a function declaration (not const) so it is hoisted: windEffect() in features3.js calls it during the first render, before this line runs
function compass(d) { return d == null ? '' : ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(d / 22.5) % 16]; }
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; };
const utc = s => Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + ':00Z');
function viewNow() {
  const sp = spot(); if (sp.lat == null) return '';
  if (state.day0 !== midnight(Date.now())) return '';
  const n = natNow(sp);
  if (!n) return `<div class="card"><h2>Right now</h2>${fwLine(sp)}<div class="small muted">Loading live gauges and buoys…</div>${lakeBox(sp)}</div>`;
  const rows = [];
  const lake = lakeBox(sp);
  const kv = (big, label, sub) => `<div class="kv"><b>${big}</b><span>${label}${sub ? '<br>' + sub : ''}</span></div>`;
  const fresh = sp.water === 'fresh', c = fresh ? null : n.coops, b = fresh ? null : n.buoy, u = n.usgs;
  if (c && c.waterLevel) {
    const dv = c.waterLevel.predicted != null ? c.waterLevel.ft - c.waterLevel.predicted : null;
    rows.push(kv(`${c.waterLevel.ft.toFixed(1)} ft`, 'Water level now', dv != null && Math.abs(dv) >= 0.2 ? `<span style="color:var(--accent2)">${dv > 0 ? '+' : ''}${dv.toFixed(1)} ft vs. predicted</span>` : dv != null ? 'on prediction' : ''));
  }
  const wt = liveWaterTemp(sp); if (wt) rows.push(kv(`${wt.v}°F`, 'Water temp', esc(wt.src)));
  if (!wt && sp.water === 'fresh' && u && u.waterTempF && isLakeLike(sp)) rows.push(kv(`${Math.round(u.waterTempF.v)}°F`, 'River gauge temp', 'nearby river — not used for the lake'));
  const w = c && c.wind ? { mph: c.wind.mph, g: c.wind.gustMph, dir: c.wind.dir } : b && b.windMph != null ? { mph: b.windMph, g: b.gustMph, dir: compass(b.windDeg) } : null;
  if (w) rows.push(kv(`${Math.round(w.mph)} mph`, 'Wind ' + esc(w.dir || ''), w.g ? 'gusts ' + Math.round(w.g) : ''));
  if (b && b.waveFt != null) rows.push(kv(`${b.waveFt} ft`, 'Waves', `${b.periodS ? b.periodS + ' s period · ' : ''}${esc(b.name)}`));
  const pres = c && c.pressureMb ? c.pressureMb.v : b && b.pressureMb; if (pres) rows.push(kv(`${(pres * 0.02953).toFixed(2)} in`, 'Barometer', b && b.pressureTendMb != null ? `${b.pressureTendMb > 0 ? 'rising' : b.pressureTendMb < 0 ? 'falling' : 'steady'} ${Math.abs(b.pressureTendMb).toFixed(1)} mb/3h` : ''));
  if (u && u.flowCfs) rows.push(kv(`${Math.round(u.flowCfs.v).toLocaleString()} cfs`, 'River flow', esc(u.name)));
  if (u && u.gageFt && (sp.water === 'fresh' || !c)) rows.push(kv(`${u.gageFt.v.toFixed(2)} ft`, 'Gage height', esc(u.name)));
  if (!rows.length) return `<div class="card"><h2>Right now</h2>${fwLine(sp)}<div class="small muted">No live gauges or buoys reporting near this spot.</div>${lake}</div>`;
  const times = [c && c.waterLevel && utc(c.waterLevel.t), b && utc(b.t), u && (u.flowCfs || u.gageFt) && Date.parse((u.flowCfs || u.gageFt).t)].filter(Boolean);
  const dv = c && c.waterLevel && c.waterLevel.predicted != null ? c.waterLevel.ft - c.waterLevel.predicted : 0;
  const note = Math.abs(dv) >= 0.5 ? `<div class="alert" style="margin-top:8px">Water is running ${Math.abs(dv).toFixed(1)} ft ${dv > 0 ? 'higher' : 'lower'} than predicted — wind${sp.water === 'inshore' ? ' or river flow' : ''} is ${dv > 0 ? 'pushing water in; flats and grass flood earlier and deeper' : 'holding water out; flats drain earlier'}.</div>` : '';
  const links = [c && `<a href="https://tidesandcurrents.noaa.gov/stationhome.html?id=${esc(c.id)}" target="_blank" rel="noopener">NOAA ${esc(c.name)}</a>`, b && `<a href="https://www.ndbc.noaa.gov/station_page.php?station=${esc(b.id)}" target="_blank" rel="noopener">Buoy ${esc(b.id)}</a>`, u && `<a href="https://waterdata.usgs.gov/monitoring-location/${esc(u.id)}/" target="_blank" rel="noopener">USGS gauge</a>`, `<a href="https://radar.weather.gov/" target="_blank" rel="noopener">Radar</a>`].filter(Boolean).join(' · ');
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">Right now</h2><span class="small muted">${times.length ? 'updated ' + ago(Math.max(...times)) : ''}</span></div>${fwLine(sp)}
   <div class="grid2" style="margin-top:8px">${rows.join('')}</div>${note}${lake}<div class="note">Live readings from the nearest ${[c && 'NOAA gauge', b && 'NDBC buoy', u && 'USGS stream gauge'].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1') || 'stations'}. ${links}</div></div>`;
}
// Freshwater lakes rarely have a temperature sensor, so let the angler enter one.
// "Lake Weir · Lake · 5,700 acres (USGS map)  [change]"
function fwLine(sp) {
  const f = fwInfo(sp); if (!f) return '';
  const label = f.kind ? FW_LABEL[f.kind] : 'Lake or river?';
  const what = f.pending ? 'Checking the USGS map…' : `${f.name ? `<b>${esc(f.name)}</b> · ` : ''}${label}${f.acres ? ` · ${f.acres.toLocaleString()} acres` : ''} <span class="muted">${f.manual ? '(your choice)' : f.kind ? '(USGS map)' : ''}</span>`;
  return `<div class="fwline small">${what}<select data-fwkind="${esc(sp.id)}" aria-label="Kind of water"><option value="">${f.det && f.det.kind ? 'Auto: ' + FW_LABEL[f.det.kind] : 'Auto'}</option>${Object.keys(FW_LABEL).map(k => `<option value="${k}"${f.manual && f.kind === k ? ' selected' : ''}>${FW_LABEL[k]}</option>`).join('')}</select></div>`;
}
function lakeBox(sp) {
  if (sp.water !== 'fresh' || fwKindOf(sp) === 'river') return '';
  const what = { pond: 'Pond', reservoir: 'Reservoir' }[fwKindOf(sp)] || 'Lake';
  const lt = lakeTemp(sp, midnight(Date.now())), a = cond();
  return `<div class="lakebox" style="margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px">
   <label for="lakeT" style="display:block;font-weight:600">${what} water temp °F <span class="small muted">(optional)</span></label>
   <div style="display:flex;gap:8px;margin-top:6px;align-items:center"><input id="lakeT" type="number" inputmode="decimal" min="32" max="95" step="1" style="flex:1 1 auto;min-width:0;width:auto" value="${lt ? lt.v : ''}" placeholder="${lt ? '' : a.wtemp ? a.wtemp + ' estimated — enter yours' : 'from your sonar or thermometer'}">${lt ? '<button class="btn ghost" id="lakeClr" type="button" style="flex:0 0 auto;width:auto;margin:0;padding:8px 14px">Clear</button>' : ''}</div>
   <div class="small muted" style="margin-top:4px">${lt ? `Using ${lt.v}°F you entered ${lt.when} for the bite score (kept for 3 days).` : 'Lakes usually have no live sensor. Enter a reading from your graph or a thermometer and the bite score will use it for this spot for 3 days.'}</div></div>`;
}
function saveLakeTemp(v) {
  const sp = spot(), m = { ...(state.settings.lakeTemp || {}) };
  if (v === '' || v == null || isNaN(+v)) delete m[sp.id]; else m[sp.id] = { v: Math.round(+v), t: Date.now() };
  state.settings.lakeTemp = m; Store.saveSettings(); dayCache.clear();
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
document.addEventListener('change', e => { if (e.target.id === 'lakeT') { const v = e.target.value; if (v !== '' && (+v < 32 || +v > 95)) { toast('Enter 32–95 °F'); return; } saveLakeTemp(v); } });
document.addEventListener('click', e => { if (e.target.id === 'lakeClr') saveLakeTemp(''); });
setInterval(() => { if (document.visibilityState === 'visible' && state.tab === 'forecast' && state.day0 === midnight(Date.now())) render(); }, 10 * 60e3);
