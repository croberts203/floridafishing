// ===== Account management, "Add to Home Screen" nudge, and the "How do you fish?" first question =====

// ---------- Account: privacy policy and delete-account (the same account works in Fly Bench) ----------
function accountManageCard() {
  const priv = '<a href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a>';
  if (!Cloud.user) return `<div class="card"><h2>Account</h2><div class="small">You're using the app without an account — your spots and catches stay on this device. Sign in from the Catch log to sync them. One account works in both Fish Bite Forecast and <a href="https://app.flytyingrecipes.org" target="_blank" rel="noopener">Fly Bench</a>.</div><div class="small" style="margin-top:6px">${priv}</div></div>`;
  return `<div class="card"><h2>Account</h2><div class="small">Signed in as <b>${esc(Cloud.user.email)}</b>. The same login works in <a href="https://app.flytyingrecipes.org" target="_blank" rel="noopener">Fly Bench</a>.</div>
   <div class="small" style="margin-top:6px">${priv}</div>
   <details style="margin-top:10px"><summary class="small">Delete my account</summary>
    <div class="small" style="margin-top:6px">This permanently deletes your login and everything stored with it — in <b>both</b> apps: spots, catch log and photos, alerts, crews, and your Fly Bench recipes and materials. It can't be undone.</div>
    <div class="row" style="margin-top:8px"><input id="delType" placeholder="Type DELETE" autocomplete="off"><button class="btn" style="background:var(--bad);color:#fff" data-delacct="1">Delete</button></div></details></div>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-delacct]'); if (!b) return;
  if (($('#delType').value || '').trim() !== 'DELETE') { toast('Type DELETE to confirm'); return; }
  b.disabled = true; b.textContent = 'Deleting…';
  try {
    const { data: s } = await Cloud.sb.auth.getSession();
    const r = await fetch(SB_URL + '/functions/v1/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.session.access_token, apikey: SB_KEY }, body: JSON.stringify({ confirm: 'DELETE' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'Delete failed');
    await Cloud.sb.auth.signOut();
    toast('Your account and its data were deleted');
  } catch (err) { toast(err.message || 'Delete failed'); b.disabled = false; b.textContent = 'Delete'; }
});

// ---------- "Add to Home Screen": opens like an app, works offline, and on iPhone is needed for bite alerts ----------
var INSTALL = { evt: null };
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL.evt = e; if (state.tab === 'forecast') render(); });
window.addEventListener('appinstalled', () => { if (window.Stats) Stats.track('installed'); state.settings.installNudge = Date.now() + 3650 * 864e5; Store.saveSettings(); });
function isInstalled() { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } }
function visitDays() {
  const today = dkey(midnight(Date.now())); let v = {};
  try { v = JSON.parse(localStorage.getItem('ff.visitDays') || '{}'); } catch (e) { }
  if (!v.last || v.last !== today) { v = { n: (v.n || 0) + 1, last: today }; try { localStorage.setItem('ff.visitDays', JSON.stringify(v)); } catch (e) { } }
  return v.n;
}
function installCard() {
  if (isInstalled() || (state.settings.installNudge || 0) > Date.now()) return '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const mobile = ios || /Android/.test(navigator.userAgent);
  // wait until it's earned a spot: a second visit, a saved spot, or an alert turned on
  if (visitDays() < 2 && !(state.settings.mySpots || []).length) return '';
  if (!mobile && !INSTALL.evt) return '';
  return `<div class="card installcard"><div class="hrow"><div style="flex:1"><b>📲 Put it on your home screen</b><div class="small muted">Opens like an app, works with no signal${ios ? ', and lets bite alerts reach your iPhone' : ''}.</div></div>
   <button class="btn sm" data-install="1">${INSTALL.evt ? 'Install' : 'Show me'}</button><button class="btn sm ghost" data-installlater="1">Later</button></div></div>`;
}
function installSheet() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const steps = ios ? [['Tap the Share button', 'The square with an arrow ⬆️ — at the bottom of Safari (or top right on iPad). In Chrome it\'s at the top right.'], ['Choose “Add to Home Screen”', 'Scroll down the list if you don\'t see it.'], ['Tap “Add”', 'Fish Bite Forecast appears on your home screen. Open it from there from now on — alerts and offline work best that way.']]
    : [['Open the browser menu', 'The ⋮ at the top right in Chrome.'], ['Tap “Install app” or “Add to Home screen”', ''], ['Tap “Install”', 'Open it from your home screen from now on.']];
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Add to your home screen</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   ${steps.map(([t, d], i) => `<div class="instep"><span>${i + 1}</span><div><b>${t}</b>${d ? `<div class="small muted">${d}</div>` : ''}</div></div>`).join('')}</div>`;
  $('#sheet').classList.add('on');
}
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-install],[data-installlater]'); if (!t) return;
  if (t.dataset.installlater) { state.settings.installNudge = Date.now() + 21 * 864e5; Store.saveSettings(); render(); return; }
  if (window.Stats) Stats.track('install_prompt');
  if (INSTALL.evt) { INSTALL.evt.prompt(); const r = await INSTALL.evt.userChoice.catch(() => null); INSTALL.evt = null; if (r && r.outcome === 'accepted') { state.settings.installNudge = Date.now() + 3650 * 864e5; Store.saveSettings(); } render(); }
  else installSheet();
});

// ---------- "How do you fish?" — one question that sets up the app (replaces the features checklist the first time) ----------
function howFishCard() {
  if (state.settings.featPrompted || !(state.settings.welcomed || (state.settings.mySpots || []).length)) return '';
  const chip = (g, k, l) => `<button class="chip" data-hf="${g}:${k}">${l}</button>`;
  return `<div class="card howfish"><b>How do you fish?</b> <span class="small muted">Tap all that fit — the app sets itself up.</span>
   <div class="small muted" style="margin-top:8px">Where</div><div>${chip('w', 'salt', '🌊 Saltwater inshore & surf')}${chip('w', 'off', '🚤 Offshore')}${chip('w', 'lake', '🏞️ Lakes & ponds')}${chip('w', 'river', '🏔️ Rivers & streams')}</div>
   <div class="small muted" style="margin-top:6px">From</div><div>${chip('f', 'bank', 'Bank, pier or wading')}${chip('f', 'boat', 'Boat or kayak')}</div>
   <div class="small muted" style="margin-top:6px">With</div><div>${chip('g', 'conv', 'Lures & bait')}${chip('g', 'fly', 'Fly rod')}</div>
   <div class="row" style="margin-top:10px"><button class="btn" data-hfdone="1">Set it up</button><button class="btn ghost" data-featopen="1">Choose features myself</button><button class="btn sm ghost" data-featskip="1">Skip</button></div></div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-hf]'); if (c) { c.classList.toggle('on'); return; }
  if (!e.target.closest('[data-hfdone]')) return;
  const on = new Set([...document.querySelectorAll('[data-hf].on')].map(x => x.dataset.hf));
  const salt = on.has('w:salt') || on.has('w:off'), fresh = on.has('w:lake') || on.has('w:river'), boat = on.has('f:boat') || on.has('w:off'), fly = on.has('g:fly'), conv = on.has('g:conv');
  const f = {};
  if (on.size) {
    if (!boat) f.marine = false;                 // seas and small craft advisories are for boaters
    if (!salt) { f.tides = false; f.marine = false; } // freshwater only
    if (!fly) f.flybench = false;
    if (!on.has('w:river') && !salt) f.now = false;   // live gauges matter for rivers and the coast
  }
  state.settings.features = f; state.settings.featPrompted = true; state.settings.howFish = [...on];
  if (fly && !conv) { state.fly = true; state.settings.fly = true; }
  Store.saveSettings(); toast('Set up — change anything in Settings → Your features'); render();
  if (window.Stats) { Stats.track('howfish_set'); on.forEach(x => Stats.track('hf_' + x.replace(':', '_'))); }
});
