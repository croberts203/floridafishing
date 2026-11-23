// ===== Forecast check (scores vs. your catches), map, catch photos — website build =====

// ---------- How did the forecast do? ----------
function catchSpot(c) {
  const s = spots().find(x => x.id === c.spot);
  if (s) return c.lat != null && s.lat != null && distKm(c.lat, c.lng, s.lat, s.lng) > 3 ? { ...s, id: 'c@' + c.id, lat: c.lat, lng: c.lng, station: s.station } : s;
  return c.lat != null ? { id: 'c@' + c.id, name: c.spotName || 'Catch', lat: c.lat, lng: c.lng, water: 'inshore' } : null;
}
var CHECK = { key: null, res: null, busy: false };
function runForecastCheck() {
  const list = state.catches.filter(c => c.ts && SPMAP[c.species] && catchSpot(c)).slice(0, 120);
  const key = list.map(c => c.id + c.ts).join('|');
  if (CHECK.key === key) return CHECK.res;
  if (list.length < 5) return { n: list.length };
  const rows = [];
  for (const c of list) {
    const sp = catchSpot(c), t0 = midnight(c.ts), s = SPMAP[c.species];
    const k = c.cond || {};
    const cnd = { pressure: k.pressure || 's', wind: k.wind ?? 10, sky: k.sky || 'partly', clarity: k.clarity || 'stained', wtemp: k.wtemp ?? '' };
    const opts = { fly: c.method === 'fly', region: spotRegion(sp) }; // no learned patterns here, so the check is fair
    const day = getDay(t0, sp), r = Engine.scoreSpecies(day, s, cnd, opts);
    const i = Math.min(r.series.length - 1, Math.max(0, Math.round((c.ts - t0) / Engine.STEP)));
    const v = r.series[i].v, vals = r.series.map(x => x.v);
    const hourPct = vals.filter(x => x < v).length / vals.length;
    // same spot and conditions on nearby days: did you go on one of the better days?
    const others = [-6, -3, 3, 6].map(d => Engine.scoreSpecies(getDay(midnight(t0 + d * 864e5 + 3600e3), sp), s, cnd, opts).day);
    const dayPct = others.filter(x => x < r.day).length / others.length;
    rows.push({ c, s, v, hourPct, day: r.day, dayPct, stage: k.stageBin, light: k.lbin });
  }
  const n = rows.length, share = f => rows.filter(f).length / n;
  const res = { n, hourTop: share(r => r.hourPct >= 2 / 3), dayGood: share(r => r.dayPct >= .5), avgV: rows.reduce((a, r) => a + r.v, 0) / n, rows, bySp: {} };
  rows.forEach(r => { (res.bySp[r.s.id] = res.bySp[r.s.id] || []).push(r); });
  CHECK.key = key; CHECK.res = res; return res;
}
function viewForecastCheck() {
  if (!state.checkOpen) return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">How’s the forecast doing?</h2><button class="btn sm" data-runcheck="1">Check</button></div><div class="small muted" style="margin-top:4px">Compares the bite score at the moment of each catch you logged with the rest of that day and nearby days.</div></div>`;
  const r = runForecastCheck();
  if (r.n < 5) return `<div class="card"><h2>How’s the forecast doing?</h2><div class="small">Log at least 5 catches with a time and spot to check the forecast against them — you have ${r.n}.</div></div>`;
  const pct = x => Math.round(x * 100) + '%';
  const verdict = r.hourTop >= .5 ? ['good', 'The forecast lines up well with your catches.'] : r.hourTop >= .4 ? ['ok', 'The forecast does a bit better than chance for you.'] : ['poor', 'The forecast isn’t picking your times well yet — your own pattern will help more.'];
  const sp = Object.entries(r.bySp).filter(([, l]) => l.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 5).map(([id, l]) => {
    const top = l.filter(x => x.hourPct >= 2 / 3).length / l.length;
    const st = {}; l.forEach(x => { if (x.stage) st[x.stage] = (st[x.stage] || 0) + 1; });
    const fav = Object.entries(st).sort((a, b) => b[1] - a[1])[0];
    return `<div class="spotrow"><div class="hrow">${Art.has(id) ? Art.fish(id, { w: 54, cls: 'thumb' }) : ''}<div style="flex:1"><b>${esc(SPMAP[id].name)}</b> <span class="small muted">${l.length} catches</span><div class="small">${pct(top)} in the forecast’s best hours${fav && fav[1] >= 3 ? ` · most on <b>${esc(fav[0].replace('-', ' ').toLowerCase())}</b> tide` : ''}</div></div></div></div>`;
  }).join('');
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">How’s the forecast doing?</h2><button class="btn sm ghost" data-runcheck="0">Hide</button></div>
   <div class="fc-verdict ${verdict[0]}">${verdict[1]}</div>
   <div class="grid2" style="margin-top:8px"><div class="kv"><b>${pct(r.hourTop)}</b><span>of catches came in the day’s top-third hours (chance: 33%)</span></div>
   <div class="kv"><b>${pct(r.dayGood)}</b><span>came on a better-scoring day than nearby days (chance: 50%)</span></div></div>
   ${sp ? `<h3>By species</h3>${sp}` : ''}
   <div class="note">Based on ${r.n} catches, scored without your learned patterns so it’s a fair test. ${state.settings.usePatterns ? 'Your own patterns are already blended into the forecast for species with 5+ catches.' : '<a href="#" data-patternson="1">Turn on “learn from my catches”</a> to blend your pattern into the forecast.'}</div></div>`;
}

// ---------- Map ----------
var MAP = { el: null, map: null, layers: {}, loaded: false, loading: false, show: { spots: true, catches: true, heat: false }, sp: 'all', fitDone: false };
function loadLeaflet() {
  if (MAP.loaded || MAP.loading || MAP.failed) return; MAP.loading = true;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
  const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  js.onload = () => { MAP.loading = false; if (window.L) MAP.loaded = true; else MAP.failed = true; render(); }; js.onerror = () => { MAP.loading = false; MAP.failed = true; render(); };
  document.head.appendChild(js);
}
function viewMap() {
  loadLeaflet();
  const sps = [...new Set(state.catches.map(c => c.species))].filter(id => SPMAP[id]);
  return `<div class="card mapcard"><div class="row maptools">
    <label class="chk"><input type="checkbox" data-maplayer="spots"${MAP.show.spots ? ' checked' : ''}> Spots</label>
    <label class="chk"><input type="checkbox" data-maplayer="catches"${MAP.show.catches ? ' checked' : ''}> Catches</label>
    <label class="chk"><input type="checkbox" data-maplayer="heat"${MAP.show.heat ? ' checked' : ''}> Hot spots</label>
    <select id="mapSp"><option value="all">All species</option>${sps.map(id => `<option value="${id}"${MAP.sp === id ? ' selected' : ''}>${esc(SPMAP[id].name)}</option>`).join('')}</select></div>
   <div id="mapSlot">${MAP.failed ? '<div class="small muted" style="padding:20px">The map couldn’t load — check your connection.</div>' : MAP.loaded ? '' : '<div class="small muted" style="padding:20px">Loading map…</div>'}</div>
   <div class="note">Tap a spot for today’s bite score; tap a catch for details. Long-press (or right-click) anywhere to add a spot there. Imagery: USGS The National Map.</div></div>`;
}
function scoreColor(v) { return v >= 70 ? '#3fd0b5' : v >= 50 ? '#7fd86a' : v >= 30 ? '#f2b84b' : v >= 12 ? '#e07a4a' : '#8a96a3'; }
function mountMap() {
  if (!MAP.loaded || !window.L) return;
  const slot = $('#mapSlot'); if (!slot) return;
  if (!MAP.el) {
    MAP.el = document.createElement('div'); MAP.el.id = 'leafmap';
    slot.appendChild(MAP.el);
    const m = MAP.map = L.map(MAP.el, { zoomControl: true, attributionControl: true });
    const usgs = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'USGS The National Map' });
    const topo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'USGS The National Map' });
    usgs.addTo(m); L.control.layers({ 'Satellite': usgs, 'Topo': topo }, null, { position: 'topright' }).addTo(m);
    m.on('contextmenu', e => { openAddSpot(); setTimeout(() => draftSpot(e.latlng.lat, e.latlng.lng, 'My spot'), 50); });
    m.on('popupopen', e => { const b = e.popup.getElement().querySelector('[data-gospot]'); if (b) b.addEventListener('click', () => { state.tab = 'forecast'; state.spotId = b.dataset.gospot; state.settings.spotId = b.dataset.gospot; state.day0 = midnight(Date.now()); Store.saveSettings(); render(); window.scrollTo(0, 0); }); });
  } else slot.appendChild(MAP.el);
  drawMap(); setTimeout(() => MAP.map && MAP.map.invalidateSize(), 50);
}
function catchesForMap() {
  return state.catches.filter(c => MAP.sp === 'all' || c.species === MAP.sp).map(c => {
    const s = spots().find(x => x.id === c.spot); const lat = c.lat != null ? c.lat : s && s.lat, lng = c.lng != null ? c.lng : s && s.lng;
    return lat != null ? { c, lat, lng, exact: c.lat != null } : null;
  }).filter(Boolean);
}
function drawMap() {
  const m = MAP.map; if (!m) return;
  Object.values(MAP.layers).forEach(l => m.removeLayer(l)); MAP.layers = {};
  const pts = [];
  if (MAP.show.spots) {
    const g = L.layerGroup(), t0 = midnight(Date.now());
    spots().filter(s => s.lat != null).forEach(s => {
      let v = null, name = '';
      try { const c = weekCell(s, t0); if (c) { v = c.v; name = c.best.sp.name; } } catch (e) { }
      const html = `<div class="mpin" style="background:${v == null ? '#8a96a3' : scoreColor(v)}">${v == null ? '•' : Math.round(v)}</div>`;
      L.marker([s.lat, s.lng], { icon: L.divIcon({ html, className: 'mpinwrap', iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .bindPopup(`<b>${esc(s.name)}</b><br>${v == null ? '' : `Today: ${esc(name)} <b>${Math.round(v)}</b><br>`}<button class="btn sm" data-gospot="${esc(s.id)}" style="margin-top:6px">Open forecast</button>`).addTo(g);
      pts.push([s.lat, s.lng]);
    });
    MAP.layers.spots = g.addTo(m);
  }
  const cs = catchesForMap();
  if (MAP.show.catches) {
    const g = L.layerGroup();
    cs.forEach(({ c, lat, lng, exact }) => {
      const s = SPMAP[c.species], html = `<div class="cpin${exact ? '' : ' approx'}">${Art.has(c.species) ? Art.fish(c.species, { w: 40 }) : '🐟'}</div>`;
      L.marker([lat, lng], { icon: L.divIcon({ html, className: 'mpinwrap', iconSize: [40, 22], iconAnchor: [20, 11] }) })
        .bindPopup(`${photoTag(c, 'pop')}<b>${esc(s ? s.name : c.species)}</b>${c.length ? ` · ${esc(c.length)}"` : ''}${c.weight ? ` · ${esc(c.weight)} lb` : ''}<br>${fmtD(c.ts)} ${fmtT(c.ts)}${c.bait ? '<br>' + esc(c.bait) : ''}${exact ? '' : '<br><span class="small">Placed at the spot (no exact GPS)</span>'}`).addTo(g);
      pts.push([lat, lng]);
    });
    MAP.layers.catches = g.addTo(m);
  }
  if (MAP.show.heat && cs.length) { // group catches into ~300 m cells
    const cell = {}, g = L.layerGroup();
    cs.forEach(({ c, lat, lng }) => { const k = (lat / .003).toFixed(0) + ',' + (lng / .003).toFixed(0); const o = cell[k] = cell[k] || { lat: 0, lng: 0, n: 0 }; const w = +c.count || 1; o.lat += lat * w; o.lng += lng * w; o.n += w; });
    const max = Math.max(...Object.values(cell).map(o => o.n));
    Object.values(cell).forEach(o => L.circle([o.lat / o.n, o.lng / o.n], { radius: 120 + 380 * Math.sqrt(o.n / max), stroke: false, fillColor: '#ff6a3d', fillOpacity: .25 + .45 * o.n / max }).bindTooltip(`${o.n} fish`).addTo(g));
    MAP.layers.heat = g.addTo(m);
  }
  if (!MAP.fitDone) {
    MAP.fitDone = true;
    const sp = spot();
    if (pts.length > 1) m.fitBounds(pts, { padding: [30, 30], maxZoom: 13 }); else m.setView(sp.lat != null ? [sp.lat, sp.lng] : [30.33, -81.56], 11);
  }
}
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.maplayer) { MAP.show[t.dataset.maplayer] = t.checked; drawMap(); return; }
  if (t.id === 'mapSp') { MAP.sp = t.value; drawMap(); }
});

// ---------- Photos saved with catches ----------
var PHOTO_URL = {}, PHOTO_BUSY = new Set();
async function resizeTo(file, max, q) {
  const bmp = await createImageBitmap(file); const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise(res => cv.toBlob(b => res(b), 'image/jpeg', q));
}
const blobToDataUrl = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
// called from saveCatchForm before the catch is stored
async function attachPhoto(out, file) {
  if (!file) return;
  const thumb = await resizeTo(file, 360, .72);
  if (Cloud.user && Cloud.sb) {
    const full = await resizeTo(file, 1600, .82), base = `${Cloud.user.id}/${out.id}`;
    const st = Cloud.sb.storage.from('catch-photos');
    const a = await st.upload(base + '.jpg', full, { upsert: true, contentType: 'image/jpeg' });
    const b = await st.upload(base + '_t.jpg', thumb, { upsert: true, contentType: 'image/jpeg' });
    if (!a.error && !b.error) { out.photo = base; delete out.photoThumb; delete PHOTO_URL[base + '_t']; delete PHOTO_URL[base]; return; }
    toast('Photo didn’t upload — kept a small copy on this phone');
  }
  out.photoThumb = await blobToDataUrl(thumb); // not signed in: small copy saved with the catch on this phone
}
function photoSrc(c, full) {
  if (c.photo) {
    const k = c.photo + (full ? '' : '_t'); if (PHOTO_URL[k]) return PHOTO_URL[k];
    if (!PHOTO_BUSY.has(k) && Cloud.sb) { PHOTO_BUSY.add(k); Cloud.sb.storage.from('catch-photos').createSignedUrl(k + '.jpg', 3600 * 6).then(({ data }) => { PHOTO_BUSY.delete(k); if (data && data.signedUrl) { PHOTO_URL[k] = data.signedUrl; render(); if (MAP.map) drawMap(); } }); }
    return null;
  }
  return c.photoThumb || null;
}
function photoTag(c, kind) {
  const src = photoSrc(c, false); if (!src) return '';
  return kind === 'pop' ? `<img src="${esc(src)}" alt="" style="width:180px;border-radius:8px;display:block;margin-bottom:6px">` : `<img class="cphoto" src="${esc(src)}" alt="Catch photo" data-photoview="${esc(c.id)}">`;
}
function viewPhoto(id) {
  const c = state.catches.find(x => x.id === id); if (!c) return;
  const src = photoSrc(c, true) || photoSrc(c, false);
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">${esc(SPMAP[c.species] ? SPMAP[c.species].name : c.species)}</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   ${src ? `<img src="${esc(src)}" alt="Catch photo" style="width:100%;border-radius:12px;margin-top:10px">` : '<div class="small muted">Loading photo…</div>'}
   <div class="small muted" style="margin-top:6px">${fmtD(c.ts)} ${fmtT(c.ts)}${c.length ? ` · ${esc(c.length)}"` : ''}${c.weight ? ` · ${esc(c.weight)} lb` : ''}</div>
   <button class="btn ghost" data-edit="${esc(c.id)}" style="margin-top:10px">Edit catch</button></div>`;
  $('#sheet').classList.add('on');
  if (c.photo && !PHOTO_URL[c.photo]) { const t = setInterval(() => { if (PHOTO_URL[c.photo]) { clearInterval(t); if ($('#sheet').classList.contains('on')) viewPhoto(id); } }, 300); setTimeout(() => clearInterval(t), 8000); }
}
function photoField(c) {
  const src = photoSrc(c, false);
  return `<label>Photo</label><div class="photofield">${src ? `<img src="${esc(src)}" alt="">` : ''}<label class="btn ghost sm filebtn">📷 ${src ? 'Replace' : 'Add'} photo<input type="file" accept="image/*" id="fPhoto" hidden></label><span class="small muted" id="fPhotoNote">${Cloud.user ? '' : 'Sign in to keep full-size photos in your account.'}</span></div>`;
}
async function removePhotos(c) { if (c && c.photo && Cloud.sb) { try { await Cloud.sb.storage.from('catch-photos').remove([c.photo + '.jpg', c.photo + '_t.jpg']); } catch (e) { } } }
document.addEventListener('change', e => {
  if (e.target.id === 'fPhoto' && e.target.files && e.target.files[0]) {
    const f = e.target.files[0]; $('#sheet')._photoFile = f;
    const box = e.target.closest('.photofield'); let im = box.querySelector('img'); if (!im) { im = document.createElement('img'); box.prepend(im); }
    im.src = URL.createObjectURL(f); $('#fPhotoNote').textContent = 'Will be saved with the catch';
  }
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-runcheck],[data-patternson],[data-photoview]'); if (!t) return;
  if (t.dataset.photoview) { e.stopPropagation(); e.preventDefault(); viewPhoto(t.dataset.photoview); return; }
  if (t.dataset.runcheck != null) { state.checkOpen = t.dataset.runcheck === '1'; render(); return; }
  if (t.dataset.patternson) { e.preventDefault(); state.settings.usePatterns = true; Store.saveSettings(); dayCache.clear(); CHECK.key = null; render(); toast('Learning from your catches'); }
}, true);

// ---------- Precise GPS: keep listening until the fix is sharp, then let the angler nudge the pin ----------
function getFix(onProgress, wantM = 10, maxMs = 20000) {
  return new Promise((resolve, reject) => {
    let best = null, done = false, lastErr = null, id = null;
    const finish = () => { if (done) return; done = true; if (id != null) navigator.geolocation.clearWatch(id); clearTimeout(tm); best ? resolve(best) : reject(lastErr || { code: 3 }); };
    const tm = setTimeout(finish, maxMs);
    id = navigator.geolocation.watchPosition(p => {
      const c = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
      if (!best || c.acc < best.acc) { best = c; onProgress && onProgress(c); }
      if (c.acc <= wantM) finish();
    }, e => { lastErr = e; if (e.code === 1) { best = null; finish(); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs });
  });
}
function gpsStatus(c) { return c.acc <= 10 ? `GPS ±${c.acc} m — good` : c.acc <= 30 ? `GPS ±${c.acc} m — getting sharper…` : `GPS ±${c.acc} m — waiting for a better fix… (step into the open if you can)`; }
// a small satellite map with a draggable pin, used when adding or adjusting a spot
var PIN = { map: null, marker: null };
function pinMap(boxId, lat, lng, onMove) {
  const box = document.getElementById(boxId); if (!box) return;
  loadLeaflet();
  if (!window.L) { if (MAP.failed) { box.style.display = 'none'; return; } setTimeout(() => pinMap(boxId, lat, lng, onMove), 300); return; }
  if (PIN.map) { PIN.map.remove(); PIN.map = null; }
  const m = PIN.map = L.map(box, { zoomControl: true, attributionControl: false }).setView([lat, lng], 17);
  L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16 }).addTo(m);
  L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16, opacity: .55 }).addTo(m);
  const icon = L.divIcon({ html: '<div class="dpin">📍</div>', className: 'mpinwrap', iconSize: [30, 30], iconAnchor: [15, 28] });
  PIN.marker = L.marker([lat, lng], { draggable: true, icon }).addTo(m);
  const moved = ll => { onMove(+ll.lat.toFixed(5), +ll.lng.toFixed(5)); };
  PIN.marker.on('dragend', () => moved(PIN.marker.getLatLng()));
  m.on('click', e => { PIN.marker.setLatLng(e.latlng); moved(e.latlng); });
  setTimeout(() => m.invalidateSize(), 60);
}
function movePinSheet(id) {
  const sp = (state.settings.mySpots || []).find(s => s.id === id); if (!sp) return;
  let pos = { lat: sp.lat, lng: sp.lng };
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Adjust ${esc(sp.name)}</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <div class="small muted" style="margin-top:6px">Drag the pin (or tap the map) onto the exact water you fish.</div>
   <div id="mvMap" class="minimap"></div><div class="small" id="mvInfo">${sp.lat.toFixed(5)}, ${sp.lng.toFixed(5)}</div>
   <div class="row" style="margin-top:10px"><button class="btn ghost" data-mvgps="1">📍 Use my GPS</button><button class="btn" data-mvsave="1">Save position</button></div></div>`;
  $('#sheet').classList.add('on');
  const show = (lat, lng) => { pos = { lat, lng }; $('#mvInfo').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; };
  pinMap('mvMap', sp.lat, sp.lng, show);
  $('#sheet')._mv = { id, get pos() { return pos; }, set: show };
}
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-movespot],[data-mvsave],[data-mvgps],[data-usespot]'); if (!t) return;
  const d = t.dataset;
  if (d.movespot) { movePinSheet(d.movespot); return; }
  if (d.mvgps) {
    t.disabled = true; const info = $('#mvInfo');
    try { const c = await getFix(c => { info.textContent = gpsStatus(c); }); $('#sheet')._mv.set(c.lat, c.lng); if (PIN.marker) { PIN.marker.setLatLng([c.lat, c.lng]); PIN.map.setView([c.lat, c.lng], 17); } info.textContent += ` · ${gpsStatus(c)}`; }
    catch (err) { geoHelp(err); } t.disabled = false; return;
  }
  if (d.mvsave) {
    const mv = $('#sheet')._mv, p = mv.pos;
    const list = (state.settings.mySpots || []).map(s => s.id === mv.id ? (() => { const n = { ...s, lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) }; delete n.fw; return n; })() : s);
    saveMySpots(list); $('#sheet').classList.remove('on'); toast('Spot moved'); render(); return;
  }
  if (d.usespot) { e.preventDefault(); state.spotId = d.usespot; state.settings.spotId = d.usespot; Store.saveSettings(); $('#sheet').classList.remove('on'); render(); window.scrollTo(0, 0); }
});
