// Low-precision sun & moon (after Meeus / suncalc). Good to a couple of minutes for rise/set/transit.
const Astro = (() => {
  const PI = Math.PI, rad = PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const toDays = ms => ms / dayMs - 0.5 + J1970 - J2000;
  const ra = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const sidereal = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const alt = (H, phi, dc) => Math.asin(Math.sin(phi) * Math.sin(dc) + Math.cos(phi) * Math.cos(dc) * Math.cos(H));
  function sunCoords(d) {
    const M = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + PI;
    return { dec: dec(L, 0), ra: ra(L, 0) };
  }
  function moonCoords(d) {
    const L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d);
    const l = L + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dist = 385001 - 20905 * Math.cos(M);
    return { ra: ra(l, b), dec: dec(l, b), dist };
  }
  function sunAlt(ms, lat, lng) {
    const d = toDays(ms), c = sunCoords(d), H = sidereal(d, rad * -lng) - c.ra;
    return alt(H, rad * lat, c.dec) / rad;
  }
  function moonPos(ms, lat, lng) {
    const d = toDays(ms), c = moonCoords(d), H = sidereal(d, rad * -lng) - c.ra;
    let h = alt(H, rad * lat, c.dec);
    h = h - Math.asin(6378.14 / c.dist) * Math.cos(h); // parallax
    let Hn = ((H % (2 * PI)) + 3 * PI) % (2 * PI) - PI; // -PI..PI, 0 = overhead
    return { alt: h / rad, H: Hn };
  }
  function moonIllum(ms) {
    const d = toDays(ms), s = sunCoords(d), m = moonCoords(d), sdist = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
    const ang = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { frac: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (ang < 0 ? -1 : 1) / PI };
  }
  function phaseName(p) {
    const n = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    return n[Math.floor(((p + 1 / 16) % 1) * 8)];
  }
  // Scan a window for events (step 4 min, refined by bisection)
  function crossings(fn, t0, t1, level) {
    const out = [], step = 4 * 60000; let prev = fn(t0) - level;
    for (let t = t0 + step; t <= t1; t += step) {
      const v = fn(t) - level;
      if ((prev < 0) !== (v < 0)) {
        let a = t - step, b = t;
        for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if ((fn(m) - level < 0) === (prev < 0)) a = m; else b = m; }
        out.push({ t: (a + b) / 2, up: prev < 0 });
      }
      prev = v;
    }
    return out;
  }
  function day(t0, lat, lng) {
    const t1 = t0 + dayMs;
    const sun = crossings(t => sunAlt(t, lat, lng), t0, t1, -0.833);
    const civ = crossings(t => sunAlt(t, lat, lng), t0, t1, -6);
    const moon = crossings(t => moonPos(t, lat, lng).alt, t0, t1, 0.133);
    // transits: hour angle sin crossing; overhead when H crosses 0 upward, underfoot when it wraps ±PI
    const tr = [], step = 4 * 60000; let pH = moonPos(t0, lat, lng).H;
    for (let t = t0 + step; t <= t1; t += step) {
      const H = moonPos(t, lat, lng).H;
      if (pH < 0 && H >= 0) tr.push({ t: refineH(t - step, t, lat, lng, 0), type: 'over' });
      else if (pH > 2 && H < -2) tr.push({ t: refineH(t - step, t, lat, lng, PI), type: 'under' });
      pH = H;
    }
    const il = moonIllum(t0 + dayMs / 2);
    return {
      sunrise: (sun.find(x => x.up) || {}).t, sunset: (sun.find(x => !x.up) || {}).t,
      dawn: (civ.find(x => x.up) || {}).t, dusk: (civ.find(x => !x.up) || {}).t,
      moonrise: (moon.find(x => x.up) || {}).t, moonset: (moon.find(x => !x.up) || {}).t,
      transits: tr, illum: il.frac, phase: il.phase, phaseName: phaseName(il.phase),
    };
  }
  function refineH(a, b, lat, lng, target) {
    const f = t => { let H = moonPos(t, lat, lng).H; if (target === PI) H = H < 0 ? H + 2 * PI : H; return H - target; };
    for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (f(m) < 0) a = m; else b = m; }
    return (a + b) / 2;
  }
  return { sunAlt, moonPos, moonIllum, phaseName, day };
})();
