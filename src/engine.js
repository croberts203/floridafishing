// Forecast engine: spot tides, per-sample features, species scoring, catch-log patterns.
const Engine = (() => {
  const MIN = 60000, HR = 3600000, DAY = 864e5, STEP = 15 * MIN;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function spotExtremes(spot, t0, t1) {
    if (spot.station && typeof natTideExtremes === 'function') return natTideExtremes(spot.station.id);
    if (!spot.tide) return [];
    const o = spot.tide;
    return Tide.extremes(TIDE_MODEL, t0 - 8 * HR, t1 + 8 * HR)
      .map(e => e.type === 'H' ? { t: e.t + o.hi * MIN, h: e.h * o.hr, ref: e.h, type: 'H' } : { t: e.t + o.lo * MIN, h: e.h * o.lr, ref: e.h, type: 'L' })
      .sort((a, b) => a.t - b.t);
  }
  function tideAt(ext, t) {
    for (let i = 0; i < ext.length - 1; i++) {
      const a = ext[i], b = ext[i + 1];
      if (t >= a.t && t < b.t) {
        const dur = b.t - a.t, fr = (t - a.t) / dur;
        const h = a.h + (b.h - a.h) * (1 - Math.cos(Math.PI * fr)) / 2;
        const dh = (b.h - a.h) * Math.PI / 2 * Math.sin(Math.PI * fr) / (dur / HR);
        const lowH = Math.min(a.h, b.h), highH = Math.max(a.h, b.h);
        return { h, dh, flood: b.type === 'H', fr, prev: a, next: b, hRel: highH > lowH ? (h - lowH) / (highH - lowH) : .5 };
      }
    }
    return null;
  }
  function stageLabel(ts) {
    if (!ts) return '—';
    if (ts.fr < 0.08) return ts.flood ? 'Slack low, turning in' : 'Slack high, turning out';
    if (ts.fr > 0.92) return ts.flood ? 'Top of the flood' : 'Bottom of the ebb';
    const part = ts.fr < 0.34 ? 'Early' : ts.fr < 0.67 ? 'Mid' : 'Late';
    return part + (ts.flood ? ' incoming' : ' outgoing');
  }
  function stageBin(ts) { if (!ts) return null; return (ts.flood ? 'In-' : 'Out-') + (ts.fr < 0.34 ? 'early' : ts.fr < 0.67 ? 'mid' : 'late'); }

  function lightBin(alt, morning) {
    if (alt < -6) return 'Night';
    if (alt < 10) return morning ? 'Dawn' : 'Dusk';
    if (alt < 35) return morning ? 'Morning' : 'Afternoon';
    return 'Midday';
  }

  // Build features for one local day at a spot
  function buildDay(t0, spot, loc) {
    const days = [-1, 0, 1].map(k => Astro.day(t0 + k * DAY, loc.lat, loc.lng));
    const ast = days[1];
    const majors = days.flatMap(d => d.transits.map(x => x.t));
    const minors = days.flatMap(d => [d.moonrise, d.moonset].filter(Boolean));
    const ext = spotExtremes(spot, t0, t0 + DAY);
    let maxRate = 0.01;
    const samples = [];
    for (let t = t0; t < t0 + DAY; t += STEP) {
      const ts = ext.length ? tideAt(ext, t) : null;
      if (ts) maxRate = Math.max(maxRate, Math.abs(ts.dh));
      const alt = Astro.sunAlt(t, loc.lat, loc.lng);
      const noon = ast.sunrise && ast.sunset ? (ast.sunrise + ast.sunset) / 2 : t0 + 12 * HR;
      const dMaj = Math.min(...majors.map(m => Math.abs(t - m))) / MIN;
      const dMin = minors.length ? Math.min(...minors.map(m => Math.abs(t - m))) / MIN : 999;
      samples.push({ t, ts, alt, morning: t < noon, dMaj, dMin });
    }
    const phaseBoost = 0.82 + 0.18 * Math.abs(Math.cos(2 * Math.PI * ast.phase));
    for (const s of samples) {
      const sMaj = Math.max(0, 1 - Math.max(0, s.dMaj - 45) / 90);
      const sMin = 0.72 * Math.max(0, 1 - Math.max(0, s.dMin - 30) / 60);
      s.sol = Math.max(0.25, sMaj, sMin) * phaseBoost;
      s.solTag = s.dMaj <= 60 ? 'Major solunar' : s.dMin <= 45 ? 'Minor solunar' : '';
      s.cs = s.ts ? Math.abs(s.ts.dh) / maxRate : 0;
      s.lbin = lightBin(s.alt, s.morning);
    }
    // full-moon proximity in days
    const ph = ast.phase, dFull = Math.abs(ph - 0.5) * 29.53, dNew = Math.min(ph, 1 - ph) * 29.53;
    return { t0, spot, ast, ext: ext.filter(e => e.t >= t0 && e.t < t0 + DAY), extAll: ext, samples, majors, minors, dFull, dNew };
  }

  function lightScore(sp, s) {
    const [dawn, day, dusk, night] = sp.light, a = s.alt, edge = s.morning ? dawn : dusk;
    if (a < -12) return night;
    if (a < -6) return night + (edge - night) * (a + 12) / 6;
    if (a < 10) return edge;
    if (a < 25) return edge + (day - edge) * (a - 10) / 15;
    return day;
  }

  function weatherFactor(sp, c, fly) {
    let w = 1;
    const p = { ff: .15, f: .08, s: 0, r: -.04, pf: -.2 }[c.pressure || 's'] || 0;
    w += p * sp.ps;
    const tol = sp.wt * (fly ? 0.65 : 1), wind = +c.wind || 0;
    if (wind > tol) w -= Math.min(0.5, (wind - tol) * 0.03);
    if (c.clarity === 'clear') w += 0.05 * sp.sight * (fly ? 2 : 1);
    if (c.clarity === 'muddy') w -= 0.25 * sp.sight + (fly ? 0.1 : 0);
    if (c.sky === 'overcast') w += 0.05 * (1 - sp.sight) - 0.1 * sp.sight * (fly ? 1 : .5);
    if (c.sky === 'sun') w += 0.05 * sp.sight;
    if (c.sky === 'rain') w -= 0.03;
    if (c.flowF) w *= c.flowF; // river rising/falling (website)
    if (c.windF) w *= c.windF; // wind onto or off the shore (website)
    return clamp(w, 0.4, 1.25);
  }
  function tempFactor(sp, wt) {
    const [mn, lo, hi, mx] = sp.temp;
    if (wt == null || isNaN(wt)) return 1;
    if (wt <= mn || wt >= mx) return 0.12;
    if (wt < lo) return 0.12 + 0.88 * (wt - mn) / (lo - mn);
    if (wt > hi) return 0.12 + 0.88 * (mx - wt) / (mx - hi);
    return 1;
  }

  // personal multipliers from catch log
  function patterns(catches, spId) {
    const list = catches.filter(c => c.species === spId && c.cond);
    if (list.length < 5) return null;
    const cnt = (key, bins) => { const m = {}; bins.forEach(b => m[b] = 1); list.forEach(c => { const v = c.cond[key]; if (v in m) m[v] += 1; }); const tot = Object.values(m).reduce((a, b) => a + b, 0); for (const k in m) m[k] = m[k] / tot * bins.length; return m; };
    return { n: list.length, tide: cnt('stageBin', ['In-early', 'In-mid', 'In-late', 'Out-early', 'Out-mid', 'Out-late']), light: cnt('lbin', ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Dusk', 'Night']) };
  }

  function scoreSpecies(day, sp, cond, opts) {
    const month = new Date(day.t0 + 12 * HR).getMonth();
    const salt = !['fresh', 'greatlakes'].includes(day.spot.water);
    const wt = cond.wtemp !== '' && cond.wtemp != null ? +cond.wtemp : WATER_TEMP[salt ? 'salt' : 'fresh'][month];
    const season = opts.region && typeof seasonFactor === 'function' ? seasonFactor(sp, opts.region, month) : sp.season[month] / 10;
    const tf = tempFactor(sp, wt), wf = weatherFactor(sp, cond, opts.fly);
    const ff = opts.fly ? 0.3 + 0.7 * sp.fly.r / 3 : 1;
    let bed = 1;
    if (sp.moonBed && month >= 3 && month <= 7 && day.dFull <= 4) bed = 1.2;
    const pat = opts.usePatterns ? patterns(opts.catches || [], sp.id) : null;
    const useTide = sp.tide && day.ext.length;
    const out = []; let tailFlag = null;
    for (const s of day.samples) {
      const ls = lightScore(sp, s);
      let tsc = 0.6;
      if (useTide && s.ts) {
        const T = sp.tide;
        tsc = T.m * s.cs + (1 - T.m) * 0.55;
        tsc *= 1 + 0.3 * T.fb * (s.ts.flood ? 1 : -1);
        tsc *= 1 + 0.25 * T.hw * (2 * s.ts.hRel - 1);
        // tailing redfish on big flood tides into the spartina (Apr–Nov)
        if (sp.tailing && s.ts.flood && s.ts.hRel > 0.65 && month >= 3 && month <= 10) {
          const refHigh = s.ts.next.ref;
          if (refHigh >= 5.3) { tsc = Math.max(tsc, opts.fly ? 1.1 : 0.95); tailFlag = tailFlag || { t: s.ts.next.t, h: s.ts.next.h }; }
        }
        tsc = clamp(tsc, 0.05, 1.1);
      }
      let raw = useTide ? 0.12 + 0.36 * tsc + 0.24 * s.sol + 0.28 * ls : 0.12 + 0.4 * s.sol + 0.48 * ls;
      let pf = 1;
      if (pat) {
        const tb = s.ts ? stageBin(s.ts) : null;
        const a = tb && pat.tide[tb] ? Math.pow(pat.tide[tb], 0.35) : 1, b = pat.light[s.lbin] ? Math.pow(pat.light[s.lbin], 0.35) : 1;
        pf = clamp(a * b, 0.8, 1.25);
      }
      const v = clamp(100 * season * tf * wf * ff * bed * raw * pf, 0, 100);
      out.push({ t: s.t, v, tsc, ls, sol: s.sol });
    }
    // best 2-hour window
    let best = 0, bestI = 0; const W = 8;
    for (let i = 0; i + W <= out.length; i++) { let m = 0; for (let j = i; j < i + W; j++) m += out[j].v; m /= W; if (m > best) { best = m; bestI = i; } }
    return { sp, series: out, day: best, bestStart: out[bestI].t, bestEnd: out[bestI].t + W * STEP, season, tf, wf, wt, tail: tailFlag, pat, bed: bed > 1 };
  }

  function windows(res, day, n = 3) {
    const s = res.series, max = Math.max(...s.map(x => x.v)); if (max <= 0) return [];
    const thr = max * 0.82, wins = [];
    let i = 0;
    while (i < s.length) {
      if (s[i].v >= thr) { let j = i, pk = i; while (j < s.length && s[j].v >= thr) { if (s[j].v > s[pk].v) pk = j; j++; } wins.push({ a: s[i].t, b: s[j - 1].t + STEP, peak: s[pk].v, pk: s[pk].t, idx: pk }); i = j; } else i++;
    }
    wins.sort((a, b) => b.peak - a.peak);
    return wins.slice(0, n).map(w => {
      const smp = day.samples[w.idx], why = [];
      if (smp.ts && res.sp.tide) why.push(stageLabel(smp.ts).toLowerCase() + ' tide');
      if (smp.solTag) why.push(smp.solTag.toLowerCase());
      if (smp.lbin === 'Dawn' || smp.lbin === 'Dusk') why.push(smp.lbin === 'Dawn' ? 'first light' : 'last light');
      if (smp.lbin === 'Night' && res.sp.light[3] > .6) why.push('night bite');
      if (smp.lbin === 'Midday' && res.sp.sight > .7) why.push('high sun for spotting');
      return { ...w, why };
    }).sort((a, b) => a.a - b.a);
  }

  function rating(v) { return v >= 70 ? ['Great', 4] : v >= 50 ? ['Good', 3] : v >= 30 ? ['Fair', 2] : v >= 12 ? ['Slow', 1] : ['Poor', 0]; }

  return { buildDay, scoreSpecies, windows, tideAt, stageLabel, stageBin, rating, patterns, spotExtremes, DAY, HR, STEP };
})();
