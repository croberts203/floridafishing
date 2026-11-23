// ===== First-time tips for each screen and feature (fishforecast.net). Each runs once; Settings → "Show tips again". =====
var TOURS = {
  forecast: () => [
    { el: null, title: 'Welcome to Fish Bite Forecast', text: 'A quick 30-second tour of the forecast. Tap <b>Next</b>, or <b>Skip tips</b> anytime. Tips come back from Settings.' },
    { el: '#spotSel', title: 'Pick your spot', text: 'Choose where you’re fishing. Your saved spots are at the top.' },
    { el: '[data-locate]', title: 'Or use your location', text: 'Tap 📍 at the water to forecast exactly where you’re standing. <b>+ Spot</b> saves it.' },
    { el: '.days', title: 'Pick a day', text: 'The colored bar under each day shows how good the bite looks. Tap a day to see it.' },
    { el: '#spSel', title: 'Pick a fish', text: '“Best bet” ranks every species for this spot, or choose one fish to forecast.' },
    { el: 'main .hrow .score', title: 'The bite score', text: '0–100 for the whole day: <b>70+ great</b>, 50+ good, 30+ fair.' },
    { el: 'main .win', title: 'Best times', text: 'The windows when tide, moon, light and weather line up — and why.' },
    { el: '.colorbox', title: 'What color to throw', text: 'Lure or fly colors for the best window, from the light and water clarity.' },
    { el: '[data-watercheck]', title: 'Check the water', text: 'At the water, snap a photo — the app measures the light and reads the clarity, then updates the colors for right now.' },
    { el: '#chartwrap', title: 'The day at a glance', text: 'Green line = bite score, blue = tide, bands = solunar periods. Drag along it for any time.' },
    { el: '#flyseg', title: 'Fly or conventional', text: 'Switch to <b>Fly</b> to rank fish by how good they are on fly and get fly patterns instead of lures.' },
    { el: 'nav', title: 'That’s it!', text: 'Map, catch log and settings are down here. Each one has its own short tip the first time you open it.' },
  ],
  conditions: () => [
    { el: '#cPress', title: 'Conditions fill in by themselves', text: 'Barometer, wind, sky and water temperature come from the forecast. Change any of them if what you see is different.' },
    { el: '#cClar', title: 'Water clarity', text: '“Auto” estimates it from recent rain, river flow and wind. Pick Clear, Stained or Muddy if you can see it.' },
    { el: '#cFace', title: 'Which way your shore faces', text: 'Set this once per spot. Then wind blowing onto your bank (bait piles up) or off it counts in the score.' },
  ],
  map: () => [
    { el: '#mapSlot', title: 'Your fishing map', text: 'Spots are colored by today’s bite score — tap one for its forecast. Long-press (or right-click) anywhere to add a spot.' },
    { el: '.maptools', title: 'Layers', text: 'Show your catches, hot spots where you catch the most, and <b>boat ramps</b> near you.' },
  ],
  log: () => [
    { el: '[data-newcatch]', title: 'Log a catch', text: 'Each catch saves the tide, moon, light and weather automatically. After 5 of a species, the forecast learns your pattern.' },
    { el: '[data-photolog]', title: 'Or log from a photo', text: 'Snap the fish — the app reads the species (and length if a ruler is in the shot) and fills in the form.' },
    { el: '[data-trip]', title: 'Trip report', text: 'Turn a day of catches into a report to share or post to your crew.' },
    { el: '#crCode, [data-crplan]', title: 'Fishing crew', text: 'Start a crew and send friends the invite code, or join theirs. Share catches and plans; your spots stay private unless you choose.' },
  ],
  settings: () => [
    { el: '[data-aladd], [data-signin]', title: 'Bite alerts', text: 'Get a phone notification when your spot is about to fire, or a small craft advisory goes up.' },
    { el: '[data-prepoffline]', title: 'Going out of range?', text: 'Save your spots for offline use before you leave signal — tides, sun and moon always work offline.' },
    { el: '[data-tipsagain]', title: 'Tips', text: 'Tap here anytime to see these step-by-step tips again.' },
  ],
  water: () => [
    { el: '#sheet label.btn', title: 'Check the water', text: 'Aim at the water near you at an angle — not into the sun. Polarized sunglasses held over the lens cut glare.' },
  ],
  crew: () => [
    { el: '.code', title: 'Your invite code', text: 'Share this so friends can join. <b>share invite</b> sends a link.' },
    { el: '[data-crplan]', title: 'Plan a trip', text: 'Tell the crew when and where you’re going. Exact spots only if you tick the box.' },
  ],
};
function tourFor(name, opt) { if (!WEB || !window.Tour || !TOURS[name]) return; Tour.later('ff.' + name, TOURS[name](), opt); }
// after each screen draws, show its tips the first time
function toursAfterRender() {
  if (!WEB || !window.Tour || Tour.active() || document.querySelector('#sheet.on')) return;
  if (state.tab === 'forecast') { if (!Tour.seen('ff.forecast')) tourFor('forecast', { delay: 1200 }); }
  else if (state.tab === 'map') tourFor('map', { delay: 900 });
  else if (state.tab === 'log') { tourFor('log'); if (Tour.seen('ff.log') && document.querySelector('.code')) tourFor('crew'); }
  else if (state.tab === 'settings') tourFor('settings');
}
// the conditions card is far down the forecast: show its tips when it scrolls into view
var condObs = null;
function watchConditions() {
  if (!WEB || !window.Tour || Tour.seen('ff.conditions') || !('IntersectionObserver' in window)) return;
  const el = document.getElementById('cPress'); if (!el) return;
  if (condObs) condObs.disconnect();
  condObs = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && Tour.seen('ff.forecast') && !Tour.active()) { condObs.disconnect(); tourFor('conditions', { delay: 600 }); } }, { threshold: 1 });
  condObs.observe(el);
}
document.addEventListener('click', e => { if (e.target.closest('[data-tipsagain]')) { e.preventDefault(); Tour.reset(); toast('Tips will show again on each screen'); state.tab = 'forecast'; render(); window.scrollTo(0, 0); } });
