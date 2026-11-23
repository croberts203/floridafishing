// Shared tide engine: astronomical arguments + nodal factors (Schureman), harmonic sum.
(function (root) {
  const D = Math.PI / 180;
  function astro(ms) {
    const jd = ms / 86400000 + 2440587.5;
    const Tc = (jd - 2451545.0) / 36525;
    const s = 218.3165 + 481267.8813 * Tc;
    const h = 280.4661 + 36000.7698 * Tc;
    const p = 83.3535 + 4069.0137 * Tc;
    const N = 125.0445 - 1934.1363 * Tc;
    const T = 180 + 360 * (((jd + 0.5) % 1 + 1) % 1);
    return { s, h, p, N, T };
  }
  function nodal(N) {
    const n = N * D, c = Math.cos, sn = Math.sin;
    return {
      M2: [1.0004 - 0.0373 * c(n) + 0.0002 * c(2 * n), -2.14 * sn(n)],
      O1: [1.0089 + 0.1871 * c(n) - 0.0147 * c(2 * n), 10.80 * sn(n) - 1.34 * sn(2 * n)],
      K1: [1.0060 + 0.1150 * c(n) - 0.0088 * c(2 * n), -8.86 * sn(n) + 0.68 * sn(2 * n)],
      K2: [1.0241 + 0.2863 * c(n) + 0.0083 * c(2 * n), -17.74 * sn(n) + 0.68 * sn(2 * n)],
      ONE: [1, 0],
    };
  }
  // Each constituent: speed (deg/hr), V(a) and nodal [f,u]
  const CONS = {
    M2: { w: 28.9841042, V: a => 2 * a.T - 2 * a.s + 2 * a.h, n: f => f.M2 },
    S2: { w: 30.0, V: a => 2 * a.T, n: f => f.ONE },
    N2: { w: 28.4397295, V: a => 2 * a.T - 3 * a.s + 2 * a.h + a.p, n: f => f.M2 },
    K2: { w: 30.0821373, V: a => 2 * a.T + 2 * a.h, n: f => f.K2 },
    K1: { w: 15.0410686, V: a => a.T + a.h - 90, n: f => f.K1 },
    O1: { w: 13.9430356, V: a => a.T - 2 * a.s + a.h + 90, n: f => f.O1 },
    P1: { w: 14.9589314, V: a => a.T - a.h + 90, n: f => f.ONE },
    Q1: { w: 13.3986609, V: a => a.T - 3 * a.s + a.h + a.p + 90, n: f => f.O1 },
    N2b: null,
    '2N2': { w: 27.8953548, V: a => 2 * a.T - 4 * a.s + 2 * a.h + 2 * a.p, n: f => f.M2 },
    NU2: { w: 28.5125831, V: a => 2 * a.T - 3 * a.s + 4 * a.h - a.p, n: f => f.M2 },
    L2: { w: 29.5284789, V: a => 2 * a.T - a.s + 2 * a.h - a.p + 180, n: f => f.M2 },
    M4: { w: 57.9682084, V: a => 2 * (2 * a.T - 2 * a.s + 2 * a.h), n: f => [f.M2[0] ** 2, 2 * f.M2[1]] },
    MS4: { w: 58.9841042, V: a => 4 * a.T - 2 * a.s + 2 * a.h, n: f => f.M2 },
    MN4: { w: 57.4238337, V: a => 4 * a.T - 5 * a.s + 4 * a.h + a.p, n: f => [f.M2[0] ** 2, 2 * f.M2[1]] },
    M6: { w: 86.9523127, V: a => 3 * (2 * a.T - 2 * a.s + 2 * a.h), n: f => [f.M2[0] ** 3, 3 * f.M2[1]] },
    MK3: { w: 44.0251729, V: a => 3 * a.T - 2 * a.s + 3 * a.h - 90, n: f => [f.M2[0] * f.K1[0], f.M2[1] + f.K1[1]] },
    SA: { w: 0.0410686, V: a => a.h, n: f => f.ONE },
    SSA: { w: 0.0821373, V: a => 2 * a.h, n: f => f.ONE },
  };
  delete CONS.N2b;
  // Fitted constituents and the minor ones inferred from them (equilibrium ratios, same phase lag)
  const INFER = { S2: [['K2', 0.272]], K1: [['P1', 0.331]], O1: [['Q1', 0.192]], N2: [['2N2', 0.133], ['NU2', 0.190]], M2: [['L2', 0.028]] };
  const FIT = ['M2', 'S2', 'N2', 'K1', 'O1', 'M4', 'MS4', 'MN4', 'M6', 'MK3'];

  // Basis value and time-derivative (ft per hour) for a fitted constituent incl. its inferred partners
  function basis(name, ms) {
    const a = astro(ms), f = nodal(a.N);
    let c = 0, s = 0, dc = 0, ds = 0;
    const list = [[name, 1]].concat(INFER[name] || []);
    for (const [nm, r] of list) {
      const k = CONS[nm], [fa, u] = k.n(f);
      const arg = (k.V(a) + u) * D, w = k.w * D;
      c += r * fa * Math.cos(arg); s += r * fa * Math.sin(arg);
      dc += -r * fa * w * Math.sin(arg); ds += r * fa * w * Math.cos(arg);
    }
    return [c, s, dc, ds];
  }
  // model = {Z0, H:{M2:[A,B],...}, sa:[amp, phaseDeg]}
  function height(model, ms) {
    let z = model.Z0, dz = 0;
    for (const nm of FIT) {
      const [A, B] = model.H[nm]; const [c, s, dc, ds] = basis(nm, ms);
      z += A * c + B * s; dz += A * dc + B * ds;
    }
    if (model.sa) { // seasonal mean sea level
      const a = astro(ms);
      z += model.sa[0] * Math.cos((a.h - model.sa[1]) * D) + (model.sa[2] || 0) * Math.cos((2 * a.h - (model.sa[3] || 0)) * D);
    }
    return [z, dz];
  }
  function extremes(model, startMs, endMs, offsets) {
    const step = 6 * 60000, out = [];
    let [, dPrev] = height(model, startMs - step);
    for (let t = startMs; t <= endMs + step; t += step) {
      const [, d] = height(model, t);
      if ((dPrev > 0 && d <= 0) || (dPrev < 0 && d >= 0)) {
        // refine by bisection on derivative
        let lo = t - step, hi = t;
        for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; const dm = height(model, m)[1]; if ((dPrev > 0) === (dm > 0)) lo = m; else hi = m; }
        const tm = (lo + hi) / 2; const z = height(model, tm)[0];
        out.push({ t: tm, h: z, type: dPrev > 0 ? 'H' : 'L' });
      }
      dPrev = d;
    }
    return out.filter(e => e.t >= startMs && e.t <= endMs);
  }
  root.Tide = { astro, nodal, CONS, FIT, basis, height, extremes };
})(typeof window !== 'undefined' ? window : globalThis);
