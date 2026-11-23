// ===== Error reports, offline, trip report, fishing crew, boat ramps — website build =====

// ---------- Error reports: the first few errors in a visit go to an insert-only table so problems get fixed ----------
var ERR_SENT = new Set();
function reportError(msg, stack) {
  try {
    msg = String(msg || 'error').slice(0, 500); const key = msg.slice(0, 120);
    if (ERR_SENT.has(key) || ERR_SENT.size >= 5 || /ResizeObserver|Script error\.?$|extension:\/\//i.test(msg + (stack || ''))) return;
    ERR_SENT.add(key);
    const body = { msg, stack: String(stack || '').slice(0, 2000), url: (location.pathname + location.hash).slice(0, 300), ua: navigator.userAgent.slice(0, 300), build: (document.querySelector('meta[name="build"]') || {}).content || '' };
    if (Cloud.user && Cloud.sb) Cloud.sb.from('forecast_errors').insert(body).then(() => { }, () => { });
    else fetch(SB_URL + '/rest/v1/forecast_errors', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body), keepalive: true }).catch(() => { });
  } catch (e) { }
}
window.addEventListener('error', e => reportError(e.message, e.error && e.error.stack));
window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; if (/Failed to fetch|NetworkError|Load failed|aborted|timeout/i.test(r.message || String(r))) return; reportError('promise: ' + (r.message || String(r)), r.stack); });

// ---------- Offline: everything you've looked at is saved; this pre-loads all your spots for the week ----------
function offlineBanner() {
  if (navigator.onLine !== false) return '';
  const k = Object.keys(localStorage).filter(x => x.startsWith('ff.wx.')).map(x => { try { return JSON.parse(localStorage.getItem(x)).fetched; } catch (e) { return 0; } });
  const t = k.length ? Math.max(...k) : 0;
  return `<div class="alert">📴 <b>You're offline.</b> Showing the forecast saved ${t ? fmtD(t) + ' ' + fmtT(t) : 'earlier'} — tides and sun/moon are still exact; weather is the last forecast downloaded.</div>`;
}
window.addEventListener('online', () => render());
window.addEventListener('offline', () => render());
async function prepOffline(btn) {
  const list = spots().filter(s => s.lat != null); let n = 0;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  for (const s of list) {
    try { natWeather(s); for (let d = 0; d < 7; d++) weekCell(s, midnight(Date.now() + d * 864e5 + 3600e3)); n++; } catch (e) { }
  }
  await new Promise(r => setTimeout(r, 6000)); // let the downloads finish
  for (const s of list) { try { for (let d = 0; d < 7; d++) weekCell(s, midnight(Date.now() + d * 864e5 + 3600e3)); } catch (e) { } }
  if (typeof loadLeaflet === 'function') { try { await loadLeaflet(); } catch (e) { } }
  state.settings.offlineAt = Date.now(); Store.saveSettings();
  toast(`Saved ${n} spot${n === 1 ? '' : 's'} for offline use`); render();
}
function offlineCard() {
  const at = state.settings.offlineAt;
  return `<div class="card"><h2>Offline</h2><div class="small">The app works without signal: tides, sun and moon are calculated on your phone, and the last weather forecast and map tiles you viewed are saved. Before a trip out of range, save all your spots for the week.</div>
   <div class="row" style="margin-top:8px"><button class="btn ghost" data-prepoffline="1">⬇ Save my spots for offline</button></div>${at ? `<div class="note">Last saved ${fmtD(at)} ${fmtT(at)}.</div>` : ''}</div>`;
}

// ---------- Trip report: one day at one spot — the forecast, the conditions and what you caught ----------
function tripCatches(t0, spotId) { return state.catches.filter(c => c.ts >= t0 && c.ts < t0 + 864e5 && (!spotId || c.spot === spotId)); }
function tripReport(t0, spotId) {
  const sp = spots().find(s => s.id === spotId) || spot(), cs = tripCatches(t0, sp.id), all = tripCatches(t0);
  const list = cs.length ? cs : all; const prev = state.spotId; state.spotId = sp.id;
  let best = null, c = {};
  try { const r = scoreAll(t0); best = chosen(r.res); c = cond(t0); } catch (e) { }
  state.spotId = prev;
  const fish = list.reduce((a, x) => a + (+x.count || 1), 0), sp2 = {};
  list.forEach(x => sp2[x.species] = (sp2[x.species] || 0) + (+x.count || 1));
  const big = list.filter(x => +x.length).sort((a, b) => b.length - a.length)[0];
  const lines = [
    `🎣 Trip report — ${fmtD(t0)} · ${sp.name}`,
    best ? `Forecast: ${best.sp.name} ${Math.round(best.day)}/100 (${Engine.rating(best.day)[0]}), best ${fmtT(best.bestStart)}–${fmtT(best.bestEnd)}` : '',
    [c.pressure && { ff: 'barometer falling fast', f: 'barometer falling', s: 'steady barometer', r: 'barometer rising', pf: 'post-front' }[c.pressure], c.wind != null && `wind ${Math.round(c.wind)} mph${c.windDir != null ? ' ' + compass(c.windDir) : ''}`, c.sky, c.clarity && c.clarity + ' water', c.wtemp && `water ${Math.round(c.wtemp)}°F`].filter(Boolean).join(' · '),
    fish ? `Caught: ${fish} fish — ${Object.entries(sp2).map(([k, n]) => `${n} ${SPMAP[k] ? SPMAP[k].name : k}`).join(', ')}` : 'No fish logged this day.',
    big ? `Biggest: ${big.length}" ${SPMAP[big.species] ? SPMAP[big.species].name : big.species}${big.bait ? ' on ' + big.bait : ''} at ${fmtT(big.ts)}` : '',
    ...list.slice(0, 12).map(x => `• ${fmtT(x.ts)} ${SPMAP[x.species] ? SPMAP[x.species].name : x.species}${x.count > 1 ? ' ×' + x.count : ''}${x.length ? ' ' + x.length + '"' : ''}${x.bait ? ' — ' + x.bait : ''}${x.cond && x.cond.stage ? ' (' + x.cond.stage + ')' : ''}`),
    'fishforecast.net',
  ].filter(Boolean);
  return { sp, list, fish, best, text: lines.join('\n') };
}
function tripSheet(t0, spotId) {
  t0 = t0 || midnight(Date.now()); const tr = tripReport(t0, spotId);
  const days = [...new Set(state.catches.map(c => midnight(c.ts)))].sort((a, b) => b - a).slice(0, 30);
  if (!days.includes(t0)) days.unshift(t0);
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Trip report</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <div class="row" style="margin-top:8px"><select id="trDay">${days.map(d => `<option value="${d}"${d === t0 ? ' selected' : ''}>${fmtD(d)}</option>`).join('')}</select>
   <select id="trSpot">${spots().map(s => `<option value="${esc(s.id)}"${s.id === tr.sp.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
   <div class="trphotos">${tr.list.filter(x => x.photo || x.photoThumb).slice(0, 6).map(x => photoTag(x)).join('')}</div>
   <pre class="trtext">${esc(tr.text)}</pre>
   <div class="row"><button class="btn" data-trshare="1">Share</button><button class="btn ghost" data-trcopy="1">Copy</button>${Cloud.user && CREW.list.length ? '<button class="btn ghost" data-trcrew="1">Post to crew</button>' : ''}</div></div>`;
  $('#sheet').classList.add('on'); $('#sheet')._tr = { t0, spotId: tr.sp.id, text: tr.text, tr };
}
document.addEventListener('change', e => {
  if (e.target.id === 'trDay' || e.target.id === 'trSpot') tripSheet(+$('#trDay').value, $('#trSpot').value);
});

// ---------- Fishing crew: invite friends by code, share catches and plans, see a leaderboard ----------
var CREW = { list: [], cur: null, members: [], posts: [], loaded: false, loading: false, err: '' };
async function crewLoad(force) {
  if (!Cloud.user || !Cloud.sb || (CREW.loading && !force)) return;
  CREW.loading = true;
  try {
    const { data, error } = await Cloud.sb.from('forecast_crews').select('id,name,code,owner').order('created_at');
    if (error) throw error;
    CREW.list = data || [];
    if (!CREW.cur || !CREW.list.find(c => c.id === CREW.cur)) CREW.cur = (CREW.list[0] || {}).id || null;
    if (CREW.cur) {
      const [m, p] = await Promise.all([
        Cloud.sb.from('forecast_crew_members').select('user_id,display_name,joined_at').eq('crew_id', CREW.cur),
        Cloud.sb.from('forecast_crew_posts').select('id,user_id,kind,data,created_at').eq('crew_id', CREW.cur).order('created_at', { ascending: false }).limit(100)]);
      CREW.members = m.data || []; CREW.posts = p.data || [];
    } else { CREW.members = []; CREW.posts = []; }
    CREW.err = '';
  } catch (e) { CREW.err = e.message || String(e); }
  CREW.loaded = true; CREW.loading = false; if (state.tab === 'log') render();
}
function crewName(uid) { const m = CREW.members.find(x => x.user_id === uid); return m ? m.display_name : 'Former member'; }
function crewCard() {
  if (!Cloud.user) return `<div class="card"><h2>👥 Fishing crew</h2><div class="small muted">Sign in above to start a crew with your fishing buddies — share catches and trip plans, and see who's catching the most. Spots stay private unless you choose to share one.</div></div>`;
  if (!CREW.loaded) { crewLoad(); return `<div class="card"><h2>👥 Fishing crew</h2><div class="small muted">Loading…</div></div>`; }
  const c = CREW.list.find(x => x.id === CREW.cur);
  const join = `<div class="row" style="margin-top:8px"><input id="crName" placeholder="Your name in the crew" maxlength="40" value="${esc(state.settings.crewName || '')}"></div>
   <div class="row"><input id="crCode" placeholder="Invite code" maxlength="8" style="text-transform:uppercase"><button class="btn ghost" data-crjoin="1">Join</button></div>
   <div class="row"><input id="crNew" placeholder="New crew name" maxlength="60"><button class="btn ghost" data-crnew="1">Start a crew</button></div>`;
  if (!c) return `<div class="card"><h2>👥 Fishing crew</h2><div class="small">Start a crew and send the invite code to your buddies, or join theirs. Members see shared catches, plans and a leaderboard. Your spots stay private unless you share one.</div>${CREW.err ? `<div class="small" style="color:var(--bad)">${esc(CREW.err)}</div>` : ''}${join}</div>`;
  const since = Date.now() - 30 * 864e5, board = {};
  CREW.posts.filter(p => p.kind === 'catch' && Date.parse(p.created_at) > since).forEach(p => { const b = board[p.user_id] = board[p.user_id] || { n: 0, big: 0 }; b.n += +p.data.count || 1; b.big = Math.max(b.big, +p.data.length || 0); });
  const rows = Object.entries(board).sort((a, b) => b[1].n - a[1].n);
  const post = p => {
    const d = p.data || {}, who = crewName(p.user_id), mine = p.user_id === Cloud.user.id, when = `${fmtD(Date.parse(p.created_at))}`;
    const loc = d.lat != null ? ` · <a href="https://maps.apple.com/?ll=${+d.lat},${+d.lng}&q=${encodeURIComponent(d.spot || 'Spot')}" target="_blank" rel="noopener">📍 ${esc(d.spot || 'map')}</a>` : d.area ? ` · ${esc(d.area)}` : '';
    const body = p.kind === 'catch' ? `<b>${esc(who)}</b> caught ${d.count > 1 ? esc(d.count) + ' ' : ''}${esc(d.species || 'fish')}${d.length ? ` · ${esc(d.length)}"` : ''}${d.bait ? ` on ${esc(d.bait)}` : ''}${loc}${d.text ? `<pre class="trtext">${esc(d.text)}</pre>` : ''}`
      : `<b>${esc(who)}</b> is going fishing ${esc(d.when || '')}${d.area ? ' · ' + esc(d.area) : ''}${loc}${d.note ? `<div class="small">${esc(d.note)}</div>` : ''}`;
    return `<div class="crpost">${d.thumb ? `<img class="crthumb" src="${esc(d.thumb)}" alt="">` : ''}<div style="flex:1;min-width:0">${body}<div class="small muted">${when}${mine ? ` · <a href="#" data-crdel="${esc(p.id)}">delete</a>` : ''}</div></div></div>`;
  };
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">👥 ${esc(c.name)}</h2>${CREW.list.length > 1 ? `<select id="crPick">${CREW.list.map(x => `<option value="${x.id}"${x.id === c.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}</div>
   <div class="small muted">Invite code <b class="code">${esc(c.code)}</b> <a href="#" data-crinvite="1">share invite</a> · ${CREW.members.length} member${CREW.members.length === 1 ? '' : 's'} · <a href="#" data-crreload="1">refresh</a></div>
   ${rows.length ? `<h3>Last 30 days</h3>${rows.map(([u, b], i) => `<div class="kvrow"><span>${['🥇', '🥈', '🥉'][i] || i + 1 + '.'} ${esc(crewName(u))}</span><b>${b.n} fish${b.big ? ` · biggest ${b.big}"` : ''}</b></div>`).join('')}` : ''}
   <div class="row" style="margin-top:8px"><button class="btn sm" data-crplan="1">📅 Share a trip plan</button>${featOn('trip') ? '<button class="btn sm ghost" data-trip="1">Trip report</button>' : ''}</div>
   <h3>Crew feed</h3>${CREW.posts.length ? CREW.posts.slice(0, 40).map(post).join('') : '<div class="small muted">Nothing shared yet. When you log a catch you can share it with the crew.</div>'}
   <details style="margin-top:10px"><summary class="small">Join or start another crew · leave</summary>${join}<div class="row"><button class="btn sm ghost" data-crleave="1">Leave ${esc(c.name)}</button></div></details></div>`;
}
async function crewShareCatch(c, withSpot) {
  if (!Cloud.user || !CREW.cur) return;
  const s = spots().find(x => x.id === c.spot), d = { species: SPMAP[c.species] ? SPMAP[c.species].name : c.species, count: +c.count || 1, length: c.length || null, bait: c.bait || null, ts: c.ts, area: s ? (natState(s) || '') : '' };
  if (withSpot && (c.lat != null || (s && s.lat != null))) { d.lat = +(c.lat ?? s.lat).toFixed(4); d.lng = +(c.lng ?? s.lng).toFixed(4); d.spot = s ? s.name : ''; }
  if (c.photoThumb && c.photoThumb.length < 15000) d.thumb = c.photoThumb;
  const { error } = await Cloud.sb.from('forecast_crew_posts').insert({ crew_id: CREW.cur, kind: 'catch', data: d });
  if (error) toast(error.message); else { toast('Shared with ' + (CREW.list.find(x => x.id === CREW.cur) || {}).name); crewLoad(true); }
}
function crewShareRow() {
  if (!Cloud.user || !CREW.list.length) return '';
  return `<div class="row"><label class="chk"><input type="checkbox" id="cfCrew"${state.settings.crewShare ? ' checked' : ''}> Share with ${esc((CREW.list.find(x => x.id === CREW.cur) || CREW.list[0]).name)}</label><label class="chk"><input type="checkbox" id="cfCrewSpot"> include the spot</label></div>`;
}
function crewPlanSheet() {
  const s = spot();
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Share a trip plan</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <label>When</label><input id="cpWhen" value="${esc(new Date(Date.now() + 864e5).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }))} at dawn" maxlength="80">
   <label>Where (general area)</label><input id="cpArea" value="${esc(s.name)}" maxlength="80">
   <label class="chk"><input type="checkbox" id="cpSpot"> include the exact spot on a map</label>
   <label>Note</label><input id="cpNote" placeholder="Room for one more — bring shrimp" maxlength="200">
   <div class="row" style="margin-top:10px"><button class="btn" data-cpsend="1">Share</button></div></div>`;
  $('#sheet').classList.add('on');
}
document.addEventListener('click', async e => {
  const d = e.target.closest('[data-prepoffline],[data-trip],[data-trshare],[data-trcopy],[data-trcrew],[data-crjoin],[data-crnew],[data-crinvite],[data-crreload],[data-crleave],[data-crdel],[data-crplan],[data-cpsend]'); if (!d) return;
  const x = d.dataset; e.preventDefault();
  if (x.prepoffline) { Stats.track('offline_saved'); return prepOffline(d); }
  if (x.trip) Stats.track('trip_report');
  if (x.trip) return tripSheet(state.day0 <= midnight(Date.now()) ? state.day0 : midnight(Date.now()), state.spotId);
  const tr = $('#sheet')._tr;
  if (x.trshare && tr) { if (navigator.share) { try { await navigator.share({ title: 'Trip report', text: tr.text }); } catch (er) { } } else { await navigator.clipboard.writeText(tr.text); toast('Copied'); } return; }
  if (x.trcopy && tr) { try { await navigator.clipboard.writeText(tr.text); toast('Copied'); } catch (er) { toast('Couldn’t copy'); } return; }
  if (x.trcrew && tr) { const big = tr.tr.list[0] || {}; const { error } = await Cloud.sb.from('forecast_crew_posts').insert({ crew_id: CREW.cur, kind: 'catch', data: { species: tr.tr.fish + ' fish', count: 0, text: tr.text, thumb: big.photoThumb && big.photoThumb.length < 15000 ? big.photoThumb : undefined } }); toast(error ? error.message : 'Posted to crew'); if (!error) { $('#sheet').classList.remove('on'); crewLoad(true); } return; }
  const name = (($('#crName') || {}).value || '').trim(); if (name) { state.settings.crewName = name; Store.saveSettings(); }
  if (x.crjoin) { const code = ($('#crCode').value || '').trim(); if (!code) return toast('Enter the invite code'); const { data, error } = await Cloud.sb.rpc('forecast_join_crew', { invite: code, my_name: name || 'Angler' }); if (error) return toast(error.message); CREW.cur = data.id; Stats.track('crew_join'); toast('Joined ' + data.name); return crewLoad(true); }
  if (x.crnew) { const n = ($('#crNew').value || '').trim(); if (!n) return toast('Name the crew'); const { data, error } = await Cloud.sb.rpc('forecast_create_crew', { crew_name: n, my_name: name || 'Me' }); if (error) return toast(error.message); CREW.cur = data.id; Stats.track('crew_create'); toast('Crew started — invite code ' + data.code); return crewLoad(true); }
  const c = CREW.list.find(y => y.id === CREW.cur);
  if (x.crinvite && c) { const t = `Join my fishing crew "${c.name}" on Fish Bite Forecast: open https://fishforecast.net/#crew=${c.code} (sign in, then Catch log → Join).`; if (navigator.share) { try { await navigator.share({ text: t }); } catch (er) { } } else { await navigator.clipboard.writeText(t); toast('Invite copied'); } return; }
  if (x.crreload) return crewLoad(true);
  if (x.crleave && c) { if (!confirmInline(d, 'Tap again to leave')) return; await Cloud.sb.from('forecast_crew_members').delete().eq('crew_id', c.id).eq('user_id', Cloud.user.id); CREW.cur = null; toast('Left ' + c.name); return crewLoad(true); }
  if (x.crdel) { if (!confirmInline(d, 'tap again to delete')) return; await Cloud.sb.from('forecast_crew_posts').delete().eq('id', x.crdel); return crewLoad(true); }
  if (x.crplan) return crewPlanSheet();
  if (x.cpsend) { const sp = spot(), data = { when: $('#cpWhen').value.trim().slice(0, 80), area: $('#cpArea').value.trim().slice(0, 80), note: $('#cpNote').value.trim().slice(0, 200) }; if ($('#cpSpot').checked && sp.lat != null) { data.lat = +sp.lat.toFixed(4); data.lng = +sp.lng.toFixed(4); data.spot = sp.name; } const { error } = await Cloud.sb.from('forecast_crew_posts').insert({ crew_id: CREW.cur, kind: 'plan', data }); toast(error ? error.message : 'Plan shared'); if (!error) { $('#sheet').classList.remove('on'); crewLoad(true); } }
});
// two-tap confirm without a browser dialog
function confirmInline(el, msg) { if (el.dataset.armed) return true; el.dataset.armed = '1'; const t = el.textContent; el.textContent = msg; setTimeout(() => { delete el.dataset.armed; el.textContent = t; }, 3000); return false; }
document.addEventListener('change', e => { if (e.target.id === 'crPick') { CREW.cur = e.target.value; crewLoad(true); } if (e.target.id === 'cfCrew') { state.settings.crewShare = e.target.checked; Store.saveSettings(); } });

// ---------- Boat ramps on the map (OpenStreetMap, loaded for the area you're looking at) ----------
var RAMPS = { cells: {}, busy: false };
function rampCellKey(lat, lng) { return Math.floor(lat / .5) + ',' + Math.floor(lng / .5); }
async function rampsFor(lat, lng) {
  const k = rampCellKey(lat, lng); if (RAMPS.cells[k]) return RAMPS.cells[k];
  const saved = lsGet('ff.ramps.' + k, null); if (saved && saved.t > Date.now() - 30 * 864e5) return RAMPS.cells[k] = saved.list;
  const [a, b] = k.split(',').map(Number), bb = `${a * .5},${b * .5},${a * .5 + .5},${b * .5 + .5}`;
  const q = `[out:json][timeout:25];(nwr["leisure"="slipway"](${bb});nwr["amenity"="boat_ramp"](${bb}););out center tags 300;`;
  let j = null;
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']) {
    try { const r = await fetch(host + '?data=' + encodeURIComponent(q)); if (r.ok) { j = await r.json(); break; } } catch (e) { }
  }
  if (!j) throw new Error('ramps unavailable');
  const list = (j.elements || []).map(el => ({ lat: el.lat ?? (el.center || {}).lat, lng: el.lon ?? (el.center || {}).lon, name: (el.tags || {}).name || 'Boat ramp', fee: (el.tags || {}).fee, access: (el.tags || {}).access })).filter(r => r.lat != null && r.access !== 'private' && r.access !== 'no');
  lsSet('ff.ramps.' + k, { t: Date.now(), list }); return RAMPS.cells[k] = list;
}
async function drawRamps() {
  const m = MAP.map; if (!m || !MAP.show.ramps || RAMPS.busy) return;
  RAMPS.busy = true;
  try {
    if (m.getZoom() < 9) { toast('Zoom in to see boat ramps'); return; }
    const b = m.getBounds(), cells = new Set();
    for (let la = b.getSouth(); la < b.getNorth() + .5; la += .5) for (let lo = b.getWest(); lo < b.getEast() + .5; lo += .5) cells.add([la, lo]);
    const lists = await Promise.all([...cells].slice(0, 6).map(([la, lo]) => rampsFor(la, lo).catch(() => [])));
    if (MAP.layers.ramps) m.removeLayer(MAP.layers.ramps);
    const g = L.layerGroup();
    lists.flat().forEach(r => L.marker([r.lat, r.lng], { icon: L.divIcon({ html: '<div class="rpin">⛵</div>', className: 'mpinwrap', iconSize: [24, 24], iconAnchor: [12, 12] }) })
      .bindPopup(`<b>${esc(r.name)}</b>${r.fee === 'yes' ? '<br>Fee' : r.fee === 'no' ? '<br>Free' : ''}<br><a href="https://maps.apple.com/?daddr=${r.lat},${r.lng}" target="_blank" rel="noopener">Directions</a> · <span class="small muted">© OpenStreetMap</span>`).addTo(g));
    MAP.layers.ramps = g.addTo(m); Stats.track('ramps');
    if (!lists.flat().length) toast('No boat ramps mapped here');
  } finally { RAMPS.busy = false; }
}
