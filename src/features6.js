// ===== Choose your features: each person switches off what they don't use; those cards, buttons and tips disappear =====
var FEATURES = [
  { g: 'Forecast screen', k: 'bestbet', name: "Today's best bet", help: 'Best catch, time, lure, color and your tackle shop' },
  { g: 'Forecast screen', k: 'colors', name: 'Lure & fly colors', help: 'Color picks for the light and water' },
  { g: 'Forecast screen', k: 'watercheck', name: 'Check the water (photo)', help: 'Measure light and clarity with your camera' },
  { g: 'Forecast screen', k: 'now', name: 'Right now', help: 'Live water level, temperature, buoys and river gauges' },
  { g: 'Forecast screen', k: 'pickspot', name: 'Pick a spot', help: 'Ranks your spots for the day' },
  { g: 'Forecast screen', k: 'week', name: 'Week planner', help: 'The next 7 days for all your spots' },
  { g: 'Forecast screen', k: 'others', name: 'Other good bets', help: 'Other species biting at this spot' },
  { g: 'Forecast screen', k: 'tides', name: 'Tide table', help: '' },
  { g: 'Forecast screen', k: 'solunar', name: 'Sun, moon & solunar', help: '' },
  { g: 'Forecast screen', k: 'marine', name: 'Marine forecast & advisories', help: 'Seas, wind and small craft advisories — for boaters' },
  { g: 'Forecast screen', k: 'rules', name: 'Fishing rules', help: 'Size, bag limits and seasons' },
  { g: 'Forecast screen', k: 'flybench', name: 'Fly recipes (Fly Bench)', help: 'Flies to tie for the fish you’re after' },
  { g: 'More', k: 'alerts', name: 'Bite alerts', help: 'Notifications when your spot is about to fire' },
  { g: 'More', k: 'map', name: 'Map', help: 'Your spots, catches, hot spots and boat ramps' },
  { g: 'More', k: 'clean', name: 'Clean your catch', help: 'Fillet videos and gear for each fish' },
  { g: 'More', k: 'crew', name: 'Fishing crew', help: 'Share catches and plans with friends' },
  { g: 'More', k: 'trip', name: 'Trip reports', help: '' },
  { g: 'More', k: 'forecastcheck', name: 'Forecast report card', help: 'How well the forecast matched your catches' },
  { g: 'More', k: 'tips', name: 'First-time tips', help: 'Step-by-step pointers on each screen' },
];
function featOn(k) { const f = (state.settings && state.settings.features) || {}; return f[k] !== false; }
function featureSheet(first) {
  const groups = [...new Set(FEATURES.map(f => f.g))];
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">${first ? 'Make it yours' : 'Choose your features'}</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <div class="small muted" style="margin:6px 0 4px">Untick anything you don’t use and it disappears from the app. You can change this anytime in Settings.</div>
   <div class="row" style="margin:6px 0"><button class="btn sm ghost" data-featall="1">All on</button><button class="btn sm ghost" data-featbasic="1">Just the basics</button></div>
   ${groups.map(g => `<h3>${esc(g)}</h3>${FEATURES.filter(f => f.g === g).map(f => `<label class="featrow"><input type="checkbox" data-feat="${f.k}" ${featOn(f.k) ? 'checked' : ''}><span><b>${esc(f.name)}</b>${f.help ? `<span class="small muted">${esc(f.help)}</span>` : ''}</span></label>`).join('')}`).join('')}
   <div class="row" style="margin-top:12px"><button class="btn" data-featsave="1">Save</button></div></div>`;
  $('#sheet').classList.add('on');
}
function featureCard() {
  const off = FEATURES.filter(f => !featOn(f.k)).length;
  return `<div class="card"><h2>Your features</h2><div class="small">${off ? `${off} feature${off === 1 ? ' is' : 's are'} switched off.` : 'Everything is switched on.'} Hide what you don’t use to keep the app simple.</div><div class="row" style="margin-top:8px"><button class="btn ghost" data-featopen="1">☑️ Choose features</button></div></div>`;
}
// offered once, after the welcome
function featurePrompt() {
  if (state.settings.featPrompted || !(state.settings.welcomed || (state.settings.mySpots || []).length)) return '';
  return `<div class="card featprompt"><div class="hrow"><div style="flex:1"><b>Make it yours</b><div class="small muted">Pick the features you want — hide the rest.</div></div><button class="btn sm" data-featopen="1" data-first="1">Choose</button><button class="btn sm ghost" data-featskip="1">Not now</button></div></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-featopen],[data-featsave],[data-featall],[data-featbasic],[data-featskip]'); if (!t) return;
  e.preventDefault();
  if (t.dataset.featopen) { state.settings.featPrompted = true; Store.saveSettings(); return featureSheet(!!t.dataset.first); }
  if (t.dataset.featskip) { state.settings.featPrompted = true; Store.saveSettings(); return render(); }
  const boxes = [...document.querySelectorAll('[data-feat]')];
  if (t.dataset.featall) return boxes.forEach(b => b.checked = true);
  if (t.dataset.featbasic) { const keep = ['bestbet', 'colors', 'tides', 'solunar', 'rules', 'map', 'tips']; return boxes.forEach(b => b.checked = keep.includes(b.dataset.feat)); }
  if (t.dataset.featsave) {
    const f = {}; boxes.forEach(b => { if (!b.checked) f[b.dataset.feat] = false; });
    state.settings.features = f; Store.saveSettings();
    if (!featOn('map') && state.tab === 'map') state.tab = 'forecast';
    if (!featOn('clean') && state.tab === 'clean') state.tab = 'forecast';
    $('#sheet').classList.remove('on'); toast('Saved'); render();
    if (window.Stats) Stats.track('features_set');
  }
});
