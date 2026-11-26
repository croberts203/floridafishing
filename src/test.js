// Checks run on every push (GitHub Actions) and locally: node src/test.js
// 1) index.html / sw.js / bite-alerts core.js are exactly what src/ builds (nobody edited generated files)
// 2) the page script parses   3) the forecast engine scores a sample day sensibly
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'); let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-'));
const coreBefore = fs.readFileSync(path.join(root, 'supabase/functions/bite-alerts/core.js'), 'utf8');
execFileSync(process.execPath, [path.join(__dirname, 'build.js'), tmp]);
const coreAfter = fs.readFileSync(path.join(root, 'supabase/functions/bite-alerts/core.js'), 'utf8');
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest'])
  ok(fs.readFileSync(path.join(tmp, f), 'utf8') === fs.readFileSync(path.join(root, f), 'utf8'), `${f} matches src/ (edit src/ and run "node src/build.js", never the generated file)`);
ok(coreBefore === coreAfter, 'supabase/functions/bite-alerts/core.js matches src/');
execFileSync(process.execPath, [path.join(root, 'tackle/build.js'), path.join(tmp, 'tackle')]);
const tk = fs.readFileSync(path.join(tmp, 'tackle/index.html'), 'utf8');
ok(tk === fs.readFileSync(path.join(root, 'tackle/index.html'), 'utf8'), 'tackle/index.html matches tackle/src/ (run "node tackle/build.js")');
try { [...tk.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m => new vm.Script(m[1])); ok(true, 'Tackle Box script parses'); } catch (e) { ok(false, 'Tackle Box script parses: ' + e.message); }
const html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
try { scripts.forEach(s => new vm.Script(s)); ok(scripts.length > 0, `page script parses (${Math.round(scripts.join('').length / 1024)} KB)`); } catch (e) { ok(false, 'page script parses: ' + e.message); }
(async () => {
  const { Engine, SPECIES, speciesFits, regionOf, TIDE_CACHE } = await import(path.join(root, 'supabase/functions/bite-alerts/core.js'));
  const sp = { id: 'mayport', name: 'Mayport', water: 'inshore', lat: 30.398, lng: -81.428, station: { id: '8720218' } };
  const t0 = Date.UTC(2026, 10, 24) + 5 * 3600e3;
  TIDE_CACHE['8720218'] = Array.from({ length: 16 }, (_, i) => ({ t: t0 + (i - 4) * 6.2 * 3600e3, h: i % 2 ? .2 : 4.8, type: i % 2 ? 'L' : 'H' }));
  const day = Engine.buildDay(t0, sp, { lat: sp.lat, lng: sp.lng });
  const pool = SPECIES.filter(s => speciesFits(s, sp));
  const res = pool.map(s => Engine.scoreSpecies(day, s, { pressure: 'f', wind: 8, sky: 'partly', clarity: 'stained', wtemp: 64 }, { region: regionOf(sp.lat, sp.lng, sp.water) }));
  ok(pool.length >= 8 && pool.every(s => s.waters.includes('inshore')), `Mayport species list looks right (${pool.length})`);
  ok(res.every(r => r.day >= 0 && r.day <= 100 && r.series.length === 96), 'scores are 0-100 with 96 time steps');
  ok(day.ast.sunrise && day.ast.sunset && day.ast.sunset > day.ast.sunrise, 'sunrise/sunset computed');
  ok(!SPECIES.some(s => !Array.isArray(s.temp) || s.temp.length !== 4), 'every species has a temperature range');
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed'); process.exit(fail ? 1 : 0);
})();
