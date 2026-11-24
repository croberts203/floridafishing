// ===== Week planner, fly bench (Fly Tying Recipes link) and bite alerts — website build =====

// ---------- Week planner ----------
var weekCache = new Map();
{ const clr = dayCache.clear.bind(dayCache); dayCache.clear = () => { weekCache.clear(); clr(); }; }
function condAt(sp, t0) { // conditions for any spot, not just the selected one
  const keep = state.spotId; state.spotId = sp.id;
  try { return cond(t0); } finally { state.spotId = keep; }
}
function weekCell(sp, t0) {
  const day = getDay(t0, sp), c = condAt(sp, t0);
  const k = [sp.id, t0, state.spId, state.fly ? 1 : 0, state.catches.length, day.extAll.length, JSON.stringify(c)].join('|');
  if (weekCache.has(k)) return weekCache.get(k);
  let pool = sp.lat != null ? SPECIES.filter(s => speciesFits(s, sp)) : SPECIES.filter(s => s.waters.includes(sp.water));
  if (state.spId !== 'auto') pool = pool.filter(s => s.id === state.spId);
  const opts = { fly: state.fly, usePatterns: state.settings.usePatterns, catches: state.catches, region: spotRegion(sp) };
  const best = pool.map(s => Engine.scoreSpecies(day, s, c, opts)).sort((a, b) => b.day - a.day)[0];
  const sf = safety(sp, t0), v = best ? { best, sf, v: best.day * sf.f } : null;
  weekCache.set(k, v); return v;
}
function viewWeek() {
  const t0 = midnight(Date.now()), days = Array.from({ length: 7 }, (_, i) => midnight(t0 + i * 864e5 + 3600e3));
  const list = spots().slice(0, 6);
  if (!list.length) return '';
  let top = null;
  const rows = list.map(sp => ({ sp, cells: days.map(d => { const c = weekCell(sp, d); if (c && (!top || c.v > top.v)) top = { ...c, sp, d }; return c; }) }));
  const head = days.map((d, i) => { const dt = new Date(d); return `<th>${i === 0 ? 'Today' : dt.toLocaleDateString([], { weekday: 'short' })}<br><b>${dt.getDate()}</b></th>`; }).join('');
  const body = rows.map(({ sp, cells }) => `<tr><td class="wsp">${esc(sp.name)}</td>${cells.map((c, i) => {
    if (!c) return '<td><span class="wc none">–</span></td>';
    const [, n] = Engine.rating(c.v), isTop = top && top.sp === sp && top.d === days[i];
    return `<td><button class="wc score s${n}${isTop ? ' top' : ''}${days[i] === state.day0 && sp.id === state.spotId ? ' cur' : ''}" data-wk="${esc(sp.id)}|${days[i]}" title="${esc(c.best.sp.name)} · best ${fmtT(c.best.bestStart)}${c.sf.why ? ' · ' + esc(c.sf.why) : ''}">${Math.round(c.v)}${c.sf.f === 0 ? '<i>⛔</i>' : c.sf.f < 1 ? '<i>⚠</i>' : ''}</button></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">Week ahead</h2><span class="small muted">${state.spId === 'auto' ? 'best species at each spot' : esc(SPMAP[state.spId].name)}</span></div>
   ${top ? `<div class="small" style="margin:6px 0 2px">Best bet: <b>${esc(top.sp.name)}</b> on <b>${fmtD(top.d)}</b> — ${esc(top.best.sp.name)}, ${fmtT(top.best.bestStart)}–${fmtT(top.best.bestEnd)}</div>` : ''}
   <div class="wk"><table><tr><th></th>${head}</tr>${body}</table></div>
   <div class="note">Each square is the best 2-hour bite window that day, lowered for rough water. ⚠ rough or advisory, ⛔ not a boating day. Tap a square to open it. Weather beyond 3–4 days is less certain.</div></div>`;
}

// ---------- Fly bench: recipes from Fly Tying Recipes (same Supabase project) ----------
var FLY_APP = 'https://app.flytyingrecipes.org';
// forecast species -> Fly Tying Recipes species ids
var FLY_MAP = { redfish: [1], trout: [2], flounder: [3], fluke: [3], blackdrum: [4], sheepshead: [5], pompano: [6], whiting: [7], snook: [8], tarpon: [9], cobia: [10], jack: [11], spanish: [13], bluefish: [14], bass: [15], bream: [16, 18], redear: [17], crappie: [19], catfish: [20], rainbow: [21], brown: [22], brook: [23], pike: [25], smallmouth: [26], carp: [27], shad: [28], striper: [29], striperfw: [29], bonefish: [30], permit: [31] };
var FLYDATA = { st: 'idle', rows: null, inv: null, uid: undefined };
function loadFlies() {
  const uid = Cloud.user ? Cloud.user.id : null;
  if (!Cloud.sb || (FLYDATA.st !== 'idle' && FLYDATA.st !== 'error' && FLYDATA.uid === uid)) return;
  FLYDATA.st = 'loading'; FLYDATA.uid = uid;
  (async () => {
    const r = await Cloud.sb.from('fly_species').select('species_id, flies(id, name, fly_type, hook_sizes, difficulty, photo_url, photo_credit, youtube_url, fishing_tips, is_starter, author_id, fly_materials(part, material_text, material_id, sort))');
    if (r.error) { FLYDATA.st = 'error'; render(); return; }
    let inv = null;
    if (uid) { const q = await Cloud.sb.from('inventory').select('material_id, quantity'); if (!q.error) inv = q.data; }
    FLYDATA.rows = r.data || []; FLYDATA.inv = inv; FLYDATA.st = 'ok'; render();
  })();
}
function fliesFor(spId) {
  const ids = FLY_MAP[spId]; if (!ids || !FLYDATA.rows) return [];
  const uid = FLYDATA.uid, m = new Map();
  FLYDATA.rows.forEach(r => { if (ids.includes(r.species_id) && r.flies) m.set(r.flies.id, r.flies); });
  return [...m.values()].sort((a, b) => (b.author_id === uid) - (a.author_id === uid) || a.name.localeCompare(b.name));
}
function flyNeeds(f) { // null = no inventory to check against
  const inv = FLYDATA.inv; if (!inv || !inv.length) return null;
  const have = new Map(inv.map(i => [i.material_id, +i.quantity]));
  return (f.fly_materials || []).filter(m => m.material_id && !(have.get(m.material_id) > 0));
}
var flyMark = f => { const n = flyNeeds(f); return n == null ? '' : n.length ? ` <span class="need">need ${n.length}</span>` : ' <span class="ok">✓</span>'; };
function flyBench(spId, compact) {
  loadFlies();
  const head = '<h3>From Fly Tying Recipes</h3>';
  if (!FLY_MAP[spId]) return compact ? '' : head + '<div class="small muted">No recipes for this species yet.</div>';
  if (FLYDATA.st !== 'ok') return compact ? '' : head + `<div class="small muted">${FLYDATA.st === 'error' ? 'Couldn’t load recipes right now.' : 'Loading recipes…'}</div>`;
  const fl = fliesFor(spId);
  if (!fl.length) return compact ? '' : head + '<div class="small muted">No recipes for this species yet.</div>';
  if (compact) return `<div class="flyrow"><span class="small muted">Tie on</span>${fl.slice(0, 4).map(f => `<button class="chip" data-flyopen="${f.id}">${esc(f.name)}${flyMark(f)}</button>`).join('')}</div>`;
  const note = !Cloud.user ? 'Sign in with your Fly Tying Recipes account to see your own recipes and what you can tie from your stock.'
    : !(FLYDATA.inv && FLYDATA.inv.length) ? 'Add your materials in Fly Tying Recipes to see which of these you can tie right now.' : '✓ = you have every listed material; “need” = items missing from your inventory.';
  return head + fl.map(f => `<div class="flyitem" data-flyopen="${f.id}"><b>${esc(f.name)}</b>${f.author_id && f.author_id === FLYDATA.uid ? ' <span class="tag">yours</span>' : ''}${flyMark(f)}<div class="small muted">${esc([f.fly_type, f.hook_sizes && 'hook ' + f.hook_sizes, f.difficulty].filter(Boolean).join(' · '))}</div></div>`).join('') +
    `<div class="note">${note} <a href="${FLY_APP}/#fish=${encodeURIComponent(spId)}" target="_blank" rel="noopener">See every fly for this fish in Fly Bench</a></div>`;
}
function openFly(id) {
  const f = (FLYDATA.rows || []).map(r => r.flies).find(x => x && String(x.id) === String(id)); if (!f) return;
  const need = flyNeeds(f), needIds = new Set((need || []).map(m => m.material_id));
  const mats = (f.fly_materials || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const yt = f.youtube_url && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(f.youtube_url) ? f.youtube_url : null;
  const photo = f.photo_url && /^https:\/\//.test(f.photo_url) ? f.photo_url : null;
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">${esc(f.name)}</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   ${photo ? `<img src="${esc(photo)}" alt="" style="width:100%;border-radius:12px;margin-top:10px">${f.photo_credit ? `<div class="small muted">${/^Illustration/i.test(f.photo_credit) ? 'Illustration by Fly Bench' : 'Photo: ' + esc(f.photo_credit)}</div>` : ''}` : ''}
   <div class="small muted" style="margin-top:8px">${esc([f.fly_type, f.hook_sizes && 'hook ' + f.hook_sizes, f.difficulty].filter(Boolean).join(' · '))}</div>
   <h3>Materials</h3><ul class="ls">${mats.map(m => `<li>${need ? (needIds.has(m.material_id) ? '<span class="need">✗</span> ' : m.material_id ? '<span class="ok">✓</span> ' : '') : ''}${m.part ? `<b>${esc(m.part)}:</b> ` : ''}${esc(m.material_text || '')}</li>`).join('')}</ul>
   ${f.fishing_tips ? `<h3>Fishing it</h3><div class="small">${esc(f.fishing_tips)}</div>` : ''}
   <div class="row" style="margin-top:12px">${yt ? `<a class="btn ghost" href="${esc(yt)}" target="_blank" rel="noopener">▶ Tying video</a>` : ''}<a class="btn" href="${FLY_APP}/#tie=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">Tie it step by step in Fly Bench</a></div></div>`;
  $('#sheet').classList.add('on');
}

// ---------- Bite alerts (web push) ----------
var ALERT_FN = SB_URL + '/functions/v1/bite-alerts';
var ALERT = { rules: null, uid: undefined, push: null, busy: false };
var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
var isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
var pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function loadAlerts() {
  const uid = Cloud.user ? Cloud.user.id : null;
  if (!Cloud.sb || ALERT.uid === uid) return;
  ALERT.uid = uid; ALERT.rules = null;
  if (pushSupported()) navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(s => { ALERT.push = !!s; render(); }).catch(() => { });
  if (!uid) { ALERT.rules = []; return; }
  Cloud.sb.from('forecast_alerts').select('id, spot, species, min_score, days, sca, fly, enabled, last_run').order('created_at').then(r => { ALERT.rules = r.error ? [] : r.data; render(); });
}
function u8(b64) { const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64.length % 4) % 4)); return Uint8Array.from(s, c => c.charCodeAt(0)); }
async function enablePush() {
  if (!Cloud.user) { toast('Sign in first'); return; }
  if (isIOS && !isStandalone()) { pushHelp(); return; }
  if (!pushSupported()) { toast('This browser can’t receive notifications'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { pushHelp(true); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const { key } = await (await fetch(ALERT_FN + '?vapid')).json();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(key) });
    const j = sub.toJSON();
    const { error } = await Cloud.sb.from('forecast_push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' });
    if (error) throw error;
    ALERT.push = true; toast('Notifications are on for this device'); render();
  } catch (e) { toast('Couldn’t turn on notifications'); console.warn(e); }
}
async function testPush() {
  const s = (await Cloud.sb.auth.getSession()).data.session; if (!s) return;
  const r = await fetch(ALERT_FN + '?test', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, apikey: SB_KEY } });
  const j = await r.json().catch(() => ({}));
  toast(j.sent ? 'Test sent — check your notifications' : 'No device is set up for notifications yet');
}
function pushHelp(blocked) {
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Turn on notifications</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   ${blocked ? `<p class="small">Notifications are blocked for this site. ${isIOS ? 'On iPhone: Settings → Notifications → Fish Bite → Allow Notifications.' : 'Tap the icon left of the address → Permissions (Site settings) → Notifications → Allow, then try again.'}</p>`
    : `<p class="small">On iPhone, alerts work once the app is on your Home Screen (iOS 16.4 or later):</p><ol class="small"><li>Tap the <b>Share</b> button in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open <b>Fish Bite</b> from your Home Screen, sign in, and tap <b>Turn on notifications</b> here.</li></ol>`}
   <button class="btn" data-close="1" style="margin-top:8px">OK</button></div>`;
  $('#sheet').classList.add('on');
}
var alertSpot = sp => ({ id: sp.id, name: sp.name, water: sp.water, lat: sp.lat, lng: sp.lng, station: sp.station ? { id: sp.station.id, name: sp.station.name } : null,
  faces: sp.faces || (state.settings.facing || {})[sp.id] || null, fwKind: sp.water === 'fresh' && typeof fwKindOf === 'function' ? fwKindOf(sp) || null : null });
function openAlertForm(pre = {}) {
  const list = spots().filter(s => s.lat != null);
  const sp = list.find(s => s.id === (pre.spot || state.spotId)) || list[0];
  const pool = SPECIES.filter(s => speciesFits(s, sp));
  const spc = pre.species || (state.spId !== 'auto' && pool.find(s => s.id === state.spId) ? state.spId : 'auto');
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">New bite alert</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <label>Spot</label><select id="alSpot">${list.map(s => `<option value="${esc(s.id)}"${s.id === sp.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
   <label>Species</label><select id="alSp"><option value="auto">Any species (best bet)</option>${pool.map(s => `<option value="${s.id}"${s.id === spc ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
   <div class="row"><div><label>Alert when the score reaches</label><select id="alMin">${[50, 60, 70, 80].map(v => `<option value="${v}"${v === (pre.min || 70) ? ' selected' : ''}>${v}+ (${Engine.rating(v)[0].toLowerCase()})</option>`).join('')}</select></div>
   <div><label>Days</label><select id="alDays"><option value="any">Any day</option><option value="weekend"${pre.days === 'weekend' ? ' selected' : ''}>Weekends only</option></select></div></div>
   ${sp.water !== 'fresh' ? `<label class="chk"><input type="checkbox" id="alSca" checked> Also tell me about small craft advisories, gale and storm warnings here</label>` : ''}
   ${state.fly ? `<label class="chk"><input type="checkbox" id="alFly" checked> Score for fly fishing</label>` : ''}
   <div class="note">Checked about 5:40 AM, 11:40 AM and 5:40 PM Eastern. You’ll get at most one bite alert a day per alert — the best of the next 3 days.</div>
   <button class="btn" data-alsave="1" style="margin-top:10px">Save alert</button></div>`;
  $('#sheet').classList.add('on');
}
async function saveAlert() {
  const sp = spots().find(s => s.id === $('#alSpot').value); if (!sp) return;
  const row = { spot: alertSpot(sp), species: $('#alSp').value, min_score: +$('#alMin').value, days: $('#alDays').value, sca: !!($('#alSca') && $('#alSca').checked), fly: !!($('#alFly') && $('#alFly').checked) };
  const { error } = await Cloud.sb.from('forecast_alerts').insert(row);
  if (error) { toast('Couldn’t save the alert'); return; }
  Stats.track('alert_on');
  $('#sheet').classList.remove('on'); toast('Alert saved'); ALERT.uid = undefined; loadAlerts();
  if (!ALERT.push) enablePush();
}
function alertsCard() {
  loadAlerts();
  if (!Cloud.user) return `<div class="card"><h2>🔔 Bite alerts</h2><div class="small">Get a notification when your spot is going to fire, or when a small craft advisory goes up. Sign in on the Catch log tab to set alerts up.</div><button class="btn ghost" data-tabgo="log" style="margin-top:10px">Sign in</button></div>`;
  const rules = ALERT.rules;
  const dev = !pushSupported() && !isIOS ? '<div class="alert">This browser can’t receive notifications.</div>'
    : ALERT.push ? `<div class="small" style="margin-top:6px">✅ Notifications are on for this device. <a href="#" data-pushtest="1">Send a test</a></div>`
    : `<button class="btn" data-pushon="1" style="margin-top:10px">Turn on notifications on this device</button>${isIOS && !isStandalone() ? '<div class="small muted" style="margin-top:4px">On iPhone, add the app to your Home Screen first.</div>' : ''}`;
  return `<div class="card"><div class="hrow"><h2 style="flex:1;margin:0">🔔 Bite alerts</h2><button class="btn sm" data-aladd="1">+ Alert</button></div>${dev}
   ${rules == null ? '<div class="small muted" style="margin-top:8px">Loading…</div>' : rules.length ? rules.map(r => `<div class="spotrow"><div class="hrow">${r.species !== 'auto' && Art.has(r.species) ? Art.fish(r.species, { w: 54, cls: 'thumb' }) : ''}<div style="flex:1;min-width:0"><b>${esc(r.spot.name)}</b><div class="small muted">${esc(r.species === 'auto' ? 'Any species' : (SPMAP[r.species] || {}).name || r.species)} · ${r.min_score}+ · ${r.days === 'weekend' ? 'weekends' : 'any day'}${r.sca ? ' · advisories' : ''}${r.fly ? ' · fly' : ''}</div></div>
     <label class="sw"><input type="checkbox" data-alon="${r.id}"${r.enabled ? ' checked' : ''}><span></span></label><button class="btn sm danger" data-aldel="${r.id}" style="margin-left:6px">✕</button></div></div>`).join('')
    : '<div class="small muted" style="margin-top:8px">No alerts yet. Tap + Alert, or 🔔 on the forecast.</div>'}</div>`;
}
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-wk],[data-flyopen],[data-pushon],[data-pushtest],[data-aladd],[data-alsave],[data-aldel],[data-tabgo],[data-albell]'); if (!t) return;
  const d = t.dataset;
  if (d.wk) { const [id, t0] = d.wk.split('|'); state.spotId = id; state.settings.spotId = id; state.day0 = +t0; Store.saveSettings(); render(); window.scrollTo(0, 0); return; }
  if (d.flyopen) { e.stopPropagation(); openFly(d.flyopen); return; }
  if (d.pushon) { enablePush(); return; }
  if (d.pushtest) { e.preventDefault(); testPush(); return; }
  if (d.aladd || d.albell) { if (!Cloud.user) { state.tab = 'settings'; render(); toast('Sign in to set alerts'); return; } openAlertForm(); return; }
  if (d.alsave) { saveAlert(); return; }
  if (d.aldel) { if (!confirmDelete(t)) return; await Cloud.sb.from('forecast_alerts').delete().eq('id', d.aldel); ALERT.uid = undefined; loadAlerts(); return; }
  if (d.tabgo) { state.tab = d.tabgo; render(); window.scrollTo(0, 0); return; }
}, true);
function confirmDelete(btn) { if (btn.dataset.armed) return true; btn.dataset.armed = '1'; btn.textContent = 'Delete?'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = '✕'; } }, 3000); return false; }
document.addEventListener('change', async e => {
  if (e.target.id === 'alSpot') { openAlertForm({ spot: e.target.value, min: +$('#alMin').value, days: $('#alDays').value }); return; }
  const id = e.target.dataset && e.target.dataset.alon;
  if (id) { const { error } = await Cloud.sb.from('forecast_alerts').update({ enabled: e.target.checked }).eq('id', id); if (error) toast('Couldn’t update'); else { const r = (ALERT.rules || []).find(x => x.id === id); if (r) r.enabled = e.target.checked; } }
});
