// ===== Illustrations: original vector fish for every species, plus water scenes =====
// Each fish is drawn from a few parameters (body depth, snout, fins, tail, markings, colors)
// in a 200x100 box, facing left.
const Art = (() => {
  let uid = 0;
  const F = (n) => +n.toFixed(1);
  // seeded random so a species always gets the same spots
  const rng = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; };

  const BASE = { N: 16, P: 150, top: 24, bot: 20, ped: 7, my: 2, blunt: .45, tail: 'fork', tailH: null, dorsal: 'split', anal: 'std', eye: 3.4, mouth: 1,
    back: '#3d5566', side: '#b9c6cf', belly: '#f2f4f5', fin: null, mark: '#1d2a33', pat: [] };
  const S = {
    bass: { top: 25, bot: 21, dorsal: 'sun', tail: 'emarg', mouth: 1.7, back: '#34502a', side: '#86a050', belly: '#ece8c6', mark: '#22361a', pat: [['stripe', 0, 4.5, .75]] },
    smallmouth: { top: 24, bot: 20, dorsal: 'sun', tail: 'emarg', mouth: 1.4, back: '#5a4628', side: '#a8864f', belly: '#ecdcbc', mark: '#3e2e18', eyeC: '#c0392b', pat: [['bars', 10, .4]] },
    walleye: { top: 19, bot: 16, N: 12, dorsal: 'split', eye: 4.4, eyeC: '#e8e4b0', mouth: 1.4, back: '#4e4a24', side: '#b8a865', belly: '#f2efe0', mark: '#3a3518', pat: [['bars', 5, .35, 'saddle']] },
    perch: { top: 22, bot: 17, dorsal: 'split', back: '#3e4e18', side: '#d7bf3e', belly: '#f4ecd0', mark: '#2a3010', fin: '#c9a43a', ventral: '#e07a2a', pat: [['bars', 6, .8]] },
    pike: { N: 6, P: 158, top: 14, bot: 13, ped: 6, blunt: .2, snout: 'duck', dorsal: 'rear', anal: 'rear', tail: 'fork', mouth: 2, back: '#334d24', side: '#7d9a4e', belly: '#eeecd6', mark: '#e2eaa8', pat: [['spots', 34, 2.2, 'all', .9, 'oval']] },
    musky: { N: 6, P: 158, top: 15, bot: 14, ped: 6, blunt: .2, snout: 'duck', dorsal: 'rear', anal: 'rear', mouth: 2, back: '#5a5a38', side: '#b3ad7e', belly: '#efeedc', mark: '#3e3c22', pat: [['bars', 9, .55, 'tiger']] },
    rainbow: { top: 20, bot: 17, dorsal: 'soft', adipose: 1, tail: 'emarg', back: '#41604f', side: '#c8d2c6', belly: '#f4f4f2', mark: '#1e2a22', pat: [['band', '#e07a9c', .75], ['spots', 40, 1.3, 'backtail', .9]] },
    brown: { top: 21, bot: 17, dorsal: 'soft', adipose: 1, tail: 'square', back: '#5e4420', side: '#c49a4c', belly: '#f4e2b0', mark: '#2a1c0c', fin: '#a07838', pat: [['spots', 30, 1.9, 'back', .95], ['halo', 9, 1.6, '#d33a2a']] },
    brook: { top: 20, bot: 17, dorsal: 'soft', adipose: 1, tail: 'square', back: '#34462e', side: '#7f8650', belly: '#e27a36', mark: '#cfd69a', fin: '#d6602f', finEdge: '#f6f6f0', pat: [['vermic', 9], ['halo', 10, 1.4, '#e03a3a', '#5aa0e0']] },
    laketrout: { top: 19, bot: 16, dorsal: 'soft', adipose: 1, tail: 'deep', back: '#3e4a54', side: '#8c969c', belly: '#eef0f0', mark: '#e0e6e8', pat: [['spots', 50, 1.6, 'all', .85]] },
    salmongl: { top: 21, bot: 18, dorsal: 'soft', adipose: 1, tail: 'fork', back: '#35566a', side: '#c4ccd2', belly: '#f4f6f6', mark: '#16222a', pat: [['spots', 30, 1.5, 'backtail', .9]] },
    salmonpac: { top: 22, bot: 18, dorsal: 'soft', adipose: 1, tail: 'fork', back: '#2f4f64', side: '#c2cad0', belly: '#f4f6f6', mark: '#16222a', pat: [['spots', 34, 1.5, 'backtail', .9]] },
    striper: { top: 21, bot: 18, dorsal: 'split', tail: 'fork', mouth: 1.4, back: '#33465a', side: '#cfd5db', belly: '#f6f7f8', mark: '#2a3440', pat: [['stripes', 7, .8]] },
    striperfw: { top: 22, bot: 19, dorsal: 'split', tail: 'fork', mouth: 1.4, back: '#3a4c5c', side: '#d2d8dc', belly: '#f6f7f8', mark: '#2a3440', pat: [['stripes', 6, .7]] },
    whitebass: { top: 27, bot: 22, dorsal: 'split', tail: 'fork', back: '#4a5a66', side: '#d8dde0', belly: '#f6f7f8', mark: '#5a6670', pat: [['stripes', 6, .45]] },
    carp: { top: 27, bot: 21, blunt: .7, dorsal: 'longsoft', tail: 'fork', barbels: 'short', back: '#5e4e22', side: '#c09a4a', belly: '#f0dcae', mark: '#6e5424', fin: '#9a6e3a', pat: [['scales', .4]] },
    fluke: { flat: 1, back: '#8a7456', mark: '#3e3020', pat: [['ocelli', 7]] },
    flounder: { flat: 1, back: '#7a6a4c', mark: '#3a2e1e', pat: [['ocelli', 3]] },
    calhalibut: { flat: 1, back: '#76705a', mark: '#4a4434', pat: [['blotch', 12]] },
    pachalibut: { flat: 1, back: '#5e5a4c', mark: '#3c3a30', tail: 'lunate', pat: [['blotch', 14]] },
    seabass: { top: 25, bot: 20, dorsal: 'sun', tail: 'square', mouth: 1.4, back: '#22272e', side: '#3e4650', belly: '#68707a', mark: '#a9c0d4', fin: '#2e3640', pat: [['spots', 40, 1.1, 'all', .35]] },
    tautog: { top: 25, bot: 20, blunt: .85, dorsal: 'longspiny', tail: 'square', back: '#2e2e28', side: '#56564a', belly: '#8a8a76', mark: '#1e1e18', pat: [['blotch', 7]] },
    albie: { top: 22, bot: 19, ped: 4, dorsal: 'mack', finlets: 1, tail: 'lunate', back: '#284f68', side: '#c6d0d8', belly: '#f4f6f8', mark: '#16303e', pat: [['vermic', 8, 'back'], ['spots', 5, 2, 'belly', .9]] },
    weakfish: { top: 19, bot: 16, dorsal: 'drum', tail: 'emarg', back: '#506458', side: '#bfc8b4', belly: '#f0f0e6', mark: '#3c4a40', fin: '#cdbf6a', pat: [['spots', 60, 1, 'back', .55]] },
    scup: { top: 31, bot: 25, N: 22, P: 146, blunt: .8, dorsal: 'sun', tail: 'fork', back: '#7d868e', side: '#d4d8dc', belly: '#f2f4f5', mark: '#7a9ac0', pat: [['stripes', 8, .35]] },
    snook: { top: 19, bot: 17, blunt: .25, dorsal: 'split', tail: 'fork', mouth: 1.8, my: 5, back: '#46523e', side: '#d4d8cf', belly: '#f4f4ee', mark: '#101410', fin: '#cfbd6c', pat: [['lateral', 1.8]] },
    bonefish: { top: 19, bot: 17, dorsal: 'soft', tail: 'deep', snout: 'over', back: '#6a868a', side: '#d6e0e2', belly: '#f6f8f8', mark: '#5f787c', pat: [['stripes', 7, .35, 'up']] },
    permit: { N: 24, P: 142, top: 36, bot: 33, blunt: .95, dorsal: 'jack', anal: 'jack', tail: 'lunate', tailH: 34, back: '#7e8e9a', side: '#ced6dc', belly: '#f2f4f5', fin: '#3a444c', pat: [] },
    mangrove: { top: 23, bot: 19, dorsal: 'sun', tail: 'emarg', mouth: 1.5, back: '#5a4436', side: '#9c6c54', belly: '#dcbaa2', mark: '#3e2c22', fin: '#9a5a48', pat: [['spots', 70, .9, 'all', .35]] },
    calico: { top: 24, bot: 20, dorsal: 'sun', tail: 'square', mouth: 1.6, back: '#344028', side: '#878c66', belly: '#e8e6d0', mark: '#e2e6c6', pat: [['spots', 24, 2.6, 'back', .75]] },
    yellowtail: { top: 20, bot: 17, ped: 4, dorsal: 'jack', anal: 'jack', tail: 'fork', back: '#2a4c66', side: '#c8d0d6', belly: '#f4f6f8', fin: '#e2c040', tailC: '#e8c63a', pat: [['band', '#e6c43a', .9]] },
    surfperch: { top: 30, bot: 26, N: 22, P: 146, blunt: .8, dorsal: 'longsoft', tail: 'fork', back: '#76888c', side: '#c8d0cc', belly: '#f0f2f0', mark: '#c87a3e', pat: [['bars', 7, .35]] },
    rockfish: { top: 26, bot: 22, dorsal: 'sun', tail: 'emarg', eye: 4.6, mouth: 1.8, back: '#8a3424', side: '#cc5e3c', belly: '#ecb48e', mark: '#7a2c1c', fin: '#c24e32', pat: [['blotch', 5]] },
    lingcod: { N: 10, P: 156, top: 16, bot: 14, blunt: .3, dorsal: 'longspiny', tail: 'square', mouth: 2.2, back: '#5e5e46', side: '#9a9a78', belly: '#e2e0cc', mark: '#3e3e2c', pat: [['blotch', 12]] },
    ulua: { N: 22, P: 144, top: 33, bot: 27, blunt: 1, dorsal: 'jack', anal: 'jack', tail: 'lunate', tailH: 30, back: '#303a44', side: '#8a929a', belly: '#c8ccd0', fin: '#2a3138', pat: [['scute']] },
    bream: { N: 24, P: 142, top: 33, bot: 29, blunt: .85, dorsal: 'sun', tail: 'emarg', mouth: .7, back: '#334633', side: '#6b7c58', belly: '#e8a84a', mark: '#22301e', ear: '#101820', pat: [['bars', 6, .35]] },
    redear: { N: 24, P: 142, top: 32, bot: 28, blunt: .85, dorsal: 'sun', tail: 'emarg', mouth: .7, back: '#4e5e40', side: '#a2a868', belly: '#e8d08a', mark: '#3a4430', ear: '#c0392b', pat: [['spots', 40, 1, 'all', .3]] },
    crappie: { N: 22, P: 144, top: 30, bot: 27, blunt: .6, dorsal: 'sun', anal: 'big', tail: 'emarg', eye: 4.4, my: -2, back: '#34443a', side: '#c6ccba', belly: '#f2f4ee', mark: '#1e2a22', pat: [['spots', 60, 1.8, 'all', .8, 'blob']] },
    catfish: { cat: 1, top: 18, bot: 17, ped: 6, blunt: .9, dorsal: 'cat', anal: 'cat', adipose: 1, tail: 'deep', barbels: 'long', eye: 2.6, back: '#43525e', side: '#8e9aa4', belly: '#eef0f2', mark: '#2a343c', pat: [['spots', 14, 1.4, 'side', .8]] },
    shad: { top: 24, bot: 23, dorsal: 'soft', tail: 'deep', my: -1, back: '#34566a', side: '#cfd8de', belly: '#f4f6f8', mark: '#1a2a34', pat: [['row', 5]] },
    trout: { top: 19, bot: 16, dorsal: 'drum', tail: 'square', mouth: 1.6, back: '#465a6a', side: '#b8c4cc', belly: '#f2f4f4', mark: '#141c22', mouthC: '#e0a63a', pat: [['spots', 46, 1.4, 'backtail', .9]] },
    redfish: { top: 22, bot: 19, dorsal: 'drum', tail: 'square', snout: 'under', back: '#6e4224', side: '#c98a52', belly: '#f0dcc0', fin: '#b0683a', mark: '#141010', pat: [['scales', .25], ['eyespot', 1]] },
    blackdrum: { N: 18, P: 146, top: 31, bot: 23, blunt: .8, dorsal: 'drum', tail: 'square', barbels: 'chin', snout: 'under', back: '#333333', side: '#77776f', belly: '#c8c8c0', mark: '#2a2a28', pat: [['bars', 4, .3]] },
    sheepshead: { N: 18, P: 146, top: 30, bot: 24, blunt: .8, dorsal: 'sun', tail: 'emarg', mouth: .8, back: '#4e5454', side: '#c8ccc8', belly: '#eceeea', mark: '#141616', fin: '#5a6060', pat: [['bars', 6, .9]] },
    pompano: { N: 22, P: 144, top: 27, bot: 25, blunt: 1, dorsal: 'jack', anal: 'jack', tail: 'deep', tailH: 28, back: '#8e9aa4', side: '#d8dee2', belly: '#f0e488', fin: '#dcc25a', pat: [] },
    whiting: { top: 17, bot: 15, blunt: .4, dorsal: 'split', tail: 'emarg', barbels: 'chin', snout: 'over', back: '#7a7a68', side: '#c8c6b8', belly: '#f0f0ec', mark: '#55554a', pat: [['bars', 6, .35, 'oblique']] },
    bluefish: { top: 21, bot: 18, dorsal: 'split', tail: 'fork', mouth: 1.9, back: '#336170', side: '#b8c8cc', belly: '#f0f4f4', mark: '#101c22', pat: [['pecspot']] },
    cobia: { N: 8, P: 156, top: 17, bot: 15, ped: 6, blunt: .15, snout: 'flat', dorsal: 'cobia', anal: 'jack', tail: 'fork', mouth: 1.8, back: '#33281f', side: '#6a584a', belly: '#d8d0c0', mark: '#1e1812', pat: [['stripes', 2, .85, 'wide']] },
    tarpon: { top: 23, bot: 21, dorsal: 'tarpon', tail: 'deep', tailH: 30, eye: 4.6, my: -4, mouth: 1.8, back: '#5a7c8c', side: '#d0dce2', belly: '#f4f6f8', mark: '#8aa0ac', fin: '#6a8494', pat: [['scales', .55, 'big']] },
    spanish: { N: 10, P: 154, top: 16, bot: 15, ped: 4, blunt: .2, dorsal: 'mack', finlets: 1, tail: 'lunate', back: '#335473', side: '#d0d8de', belly: '#f6f8f8', mark: '#e2b840', pat: [['spots', 26, 2, 'side', .95, 'oval']] },
    jack: { N: 22, P: 144, top: 28, bot: 24, blunt: 1, dorsal: 'jack', anal: 'jack', tail: 'lunate', tailH: 30, back: '#36544e', side: '#b8c0a8', belly: '#e8e0b0', fin: '#d8b840', mark: '#121a18', pat: [['gillspot'], ['scute']] },
    tripletail: { N: 20, P: 140, top: 28, bot: 24, blunt: .7, dorsal: 'triple', anal: 'triple', tail: 'round', back: '#4e4230', side: '#8a7a58', belly: '#b8a882', mark: '#33291c', pat: [['blotch', 9]] },
    king: { N: 6, P: 158, top: 15, bot: 14, ped: 4, blunt: .15, dorsal: 'mack', finlets: 1, tail: 'lunate', mouth: 1.6, back: '#334862', side: '#c4ccd4', belly: '#f4f6f8', mark: '#556070', pat: [['lateral', .9, 'dip']] },
    mahi: { N: 18, P: 156, top: 24, bot: 17, ped: 4, blunt: 1.2, dorsal: 'long', anal: 'long', tail: 'deep', tailH: 26, back: '#1f8a6a', side: '#d4c43a', belly: '#efe070', fin: '#2a78b0', mark: '#2a6ab8', pat: [['spots', 40, 1.3, 'all', .9]] },
    reef: { top: 24, bot: 21, dorsal: 'sun', tail: 'square', mouth: 2, back: '#52432f', side: '#8a7258', belly: '#cdb898', mark: '#3a2e20', fin: '#6a5640', pat: [['blotch', 9]] },
  };

  // sample a cubic bezier
  const bez = (p0, p1, p2, p3, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
  const interp = (pts, x) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[x < pts[0][0] ? 0 : pts.length - 1][1]; };

  function fish(id, opts = {}) {
    const p = { ...BASE, ...(S[id] || {}) };
    if (p.flat) return flat(id, p, opts);
    const u = ++uid, { N, P, top, bot, ped, my } = p, ny = 50 + my, L = P - N;
    const fin = p.fin || p.back, X = (f) => N + L * f;
    const Hx = X(.36), Bx = X(.42), k = p.blunt;
    // body outline: two cubics on top, two on the bottom
    const t1 = [[N, ny], [N + 2, ny - top * k * 1.15], [Hx - (Hx - N) * .5, 50 - top], [Hx, 50 - top]];
    const t2 = [[Hx, 50 - top], [Hx + (P - Hx) * .4, 50 - top], [P - (P - Hx) * .3, 50 - ped - 2], [P, 50 - ped]];
    const b2 = [[P, 50 + ped], [P - (P - Bx) * .3, 50 + ped + 2], [Bx + (P - Bx) * .4, 50 + bot], [Bx, 50 + bot]];
    const b1 = [[Bx, 50 + bot], [Bx - (Bx - N) * .55, 50 + bot], [N + 3, ny + bot * .55 * Math.max(.4, k)], [N, ny]];
    if (p.snout === 'duck') { t1[1] = [N + 10, ny - 4]; b1[2] = [N + 10, ny + 4]; }
    if (p.snout === 'flat') { t1[1] = [N + 6, ny - top * .5]; }
    const top_ = bez(...t1).concat(bez(...t2)), botP = bez(...b2).concat(bez(...b1)).reverse();
    const tY = (x) => interp(top_, x), bY = (x) => interp(botP, x);
    const c = (a) => a.map(F).join(',');
    const body = `M${c(t1[0])}C${c(t1[1])} ${c(t1[2])} ${c(t1[3])}C${c(t2[1])} ${c(t2[2])} ${c(t2[3])}L${c(b2[0])}C${c(b2[1])} ${c(b2[2])} ${c(b2[3])}C${c(b1[1])} ${c(b1[2])} ${c(b1[3])}Z`;

    // ---- fins ----
    const finsBack = [], finsFront = [];
    const finPath = (a, b, h, edgeY, dir, shape) => { // dir -1 = up (dorsal), +1 = down (anal)
      const ya = edgeY(a), yb = edgeY(b), w = b - a;
      if (shape === 'spiny') {
        const n = Math.max(3, Math.round(w / 5)); let d = `M${F(a)},${F(ya)}`; const rays = [];
        for (let i = 0; i <= n; i++) { const x = a + w * i / n, prof = Math.sin(Math.PI * (.15 + .75 * i / n)), y = edgeY(x) + dir * h * prof; d += `L${F(x)},${F(y)}`; if (i < n) { const xm = x + w / n * .5; d += `L${F(xm)},${F(edgeY(xm) + dir * h * prof * .72)}`; } rays.push(`M${F(x)},${F(edgeY(x))}L${F(x)},${F(y)}`); }
        return { d: d + `L${F(b)},${F(yb)}Z`, rays };
      }
      if (shape === 'lobe') return { d: `M${F(a)},${F(ya)}C${F(a + w * .1)},${F(ya + dir * h * 1.4)} ${F(a + w * .32)},${F(ya + dir * h * 1.1)} ${F(a + w * .45)},${F(edgeY(a + w * .45) + dir * h * .45)}C${F(a + w * .7)},${F(edgeY(a + w * .7) + dir * h * .35)} ${F(b - w * .1)},${F(yb + dir * h * .3)} ${F(b)},${F(yb)}Z`, rays: [] };
      if (shape === 'round') return { d: `M${F(a)},${F(ya)}C${F(a + w * .05)},${F(ya + dir * h * 1.1)} ${F(b - w * .05)},${F(yb + dir * h * 1.3)} ${F(b + w * .1)},${F(yb + dir * h * .2)}L${F(b)},${F(yb)}Z`, rays: [] };
      const rays = []; for (let i = 1; i < 6; i++) { const x = a + w * i / 6; rays.push(`M${F(x)},${F(edgeY(x))}L${F(x + w * .08)},${F(edgeY(x) + dir * h * (1.05 - i * .1))}`); }
      return { d: `M${F(a)},${F(ya)}C${F(a + w * .12)},${F(ya + dir * h * 1.35)} ${F(b - w * .35)},${F(yb + dir * h * .95)} ${F(b)},${F(yb)}Z`, rays };
    };
    const addFin = (list, a, b, h, edge, dir, shape, color = fin) => { const f = finPath(X(a), X(b), h, edge, dir, shape); list.push(`<path d="${f.d}" fill="${color}" opacity=".92"/>` + (f.rays.length ? `<path d="${f.rays.join('')}" stroke="#000" stroke-opacity=".18" stroke-width=".6"/>` : '') + (p.finEdge ? `<path d="${f.d}" fill="none" stroke="${p.finEdge}" stroke-width="1" opacity=".8"/>` : '')); };
    const D = { // dorsal configurations: [start, end, height(fraction of top), shape]
      split: [[.3, .48, .62, 'spiny'], [.53, .74, .5, 'soft']],
      sun: [[.32, .56, .5, 'spiny'], [.55, .8, .62, 'soft']],
      drum: [[.3, .45, .55, 'spiny'], [.47, .82, .38, 'soft']],
      soft: [[.38, .56, .62, 'soft']],
      longsoft: [[.33, .78, .42, 'soft']],
      longspiny: [[.28, .62, .38, 'spiny'], [.61, .86, .4, 'soft']],
      rear: [[.68, .86, .7, 'soft']],
      cobia: [[.3, .44, .18, 'spiny'], [.47, .8, .55, 'lobe']],
      mack: [[.26, .46, .42, 'spiny'], [.56, .66, .55, 'soft']],
      jack: [[.3, .4, .32, 'spiny'], [.44, .84, .5, 'lobe']],
      tarpon: [[.46, .6, .75, 'soft']],
      long: [[.08, .93, .38, 'soft']],
      cat: [[.3, .42, .9, 'soft']],
      triple: [[.3, .6, .3, 'spiny'], [.6, .82, .9, 'round']],
    }[p.dorsal] || [];
    D.forEach(([a, b, h, sh]) => addFin(finsBack, a, b, top * h, tY, -1, sh));
    const A = { std: [[.64, .8, .5, 'soft']], big: [[.58, .84, .7, 'soft']], rear: [[.7, .86, .7, 'soft']], jack: [[.5, .84, .55, 'lobe']], long: [[.48, .93, .45, 'soft']], cat: [[.6, .88, .45, 'soft']], triple: [[.62, .82, .9, 'round']] }[p.anal] || [];
    A.forEach(([a, b, h, sh]) => addFin(finsBack, a, b, bot * h, bY, 1, sh));
    if (p.adipose) { const x = X(.83), y = tY(x); finsBack.push(`<path d="M${F(x - 5)},${F(y + 1)}Q${F(x)},${F(y - 6)} ${F(x + 5)},${F(y + 1)}Z" fill="${fin}"/>`); }
    if (p.finlets) for (let i = 0; i < 5; i++) { const x = X(.72 + i * .05); finsBack.push(`<path d="M${F(x)},${F(tY(x) + .5)}l3,-3.5l1,3.5ZM${F(x)},${F(bY(x) - .5)}l3,3.5l1,-3.5Z" fill="${p.tailC || '#e8c040'}" opacity=".9"/>`); }
    // pelvic
    const pvx = X(.32); finsBack.push(`<path d="M${F(pvx)},${F(bY(pvx) - 2)}l10,${F(bot * .38)}l3,-${F(bot * .3)}Z" fill="${p.ventral || fin}" opacity=".9"/>`);
    // tail
    const th = p.tailH || Math.max(top, bot) * 1.05, tx = P - 3, R = P + 34;
    const tailD = {
      fork: `M${tx},${50 - ped}C${P + 10},${50 - ped - 3} ${P + 22},${50 - th + 6} ${R},${50 - th}L${P + 20},50L${R},${50 + th}C${P + 22},${50 + th - 6} ${P + 10},${50 + ped + 3} ${tx},${50 + ped}Z`,
      deep: `M${tx},${50 - ped}C${P + 10},${50 - ped - 3} ${P + 24},${50 - th + 4} ${R + 2},${50 - th - 2}L${P + 13},50L${R + 2},${50 + th + 2}C${P + 24},${50 + th - 4} ${P + 10},${50 + ped + 3} ${tx},${50 + ped}Z`,
      lunate: `M${tx},${50 - ped + 1}Q${P + 12},${50 - th * .55} ${R + 2},${50 - th - 2}Q${P + 16},${50 - th * .2} ${P + 12},50Q${P + 16},${50 + th * .2} ${R + 2},${50 + th + 2}Q${P + 12},${50 + th * .55} ${tx},${50 + ped - 1}Z`,
      emarg: `M${tx},${50 - ped}C${P + 12},${50 - ped - 4} ${P + 24},${50 - th + 4} ${R - 2},${50 - th + 2}Q${P + 26},50 ${R - 2},${50 + th - 2}C${P + 24},${50 + th - 4} ${P + 12},${50 + ped + 4} ${tx},${50 + ped}Z`,
      square: `M${tx},${50 - ped}C${P + 12},${50 - ped - 4} ${P + 22},${50 - th + 4} ${R - 4},${50 - th + 3}Q${R},50 ${R - 4},${50 + th - 3}C${P + 22},${50 + th - 4} ${P + 12},${50 + ped + 4} ${tx},${50 + ped}Z`,
      round: `M${tx},${50 - ped}C${P + 16},${50 - th - 2} ${R + 4},${50 - th * .6} ${R + 2},50C${R + 4},${50 + th * .6} ${P + 16},${50 + th + 2} ${tx},${50 + ped}Z`,
    }[p.tail] || '';
    const tailRays = [-.8, -.45, -.1, .25, .6].map(f => `M${P + 2},${F(50 + f * ped)}L${R - 6},${F(50 + f * th * .95)}`).join('');
    finsBack.push(`<path d="${tailD}" fill="${p.tailC || fin}"/><path d="${tailRays}" stroke="#000" stroke-opacity=".15" stroke-width=".6"/>` + (p.tailTip ? `<path d="M${R - 6},${50 + th - 6}L${R + 1},${50 + th + 1}L${R - 9},${50 + th - 1}Z" fill="${p.tailTip}"/>` : '') + (p.finEdge ? `<path d="${tailD}" fill="none" stroke="${p.finEdge}" stroke-width="1" opacity=".7"/>` : ''));

    // ---- markings, clipped to the body ----
    const r = rng(id), M = [], mk = p.mark;
    const inBody = (x, y, pad = 1.5) => y > tY(x) + pad && y < bY(x) - pad;
    for (const [kind, a1, a2, a3, a4, a5] of p.pat) {
      if (kind === 'bars') { const n = a1, op = a2, x0 = X(.2), x1 = X(.86); for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + .5) / n, w = (x1 - x0) / n * (a3 === 'tiger' ? .38 : .5), sk = a3 === 'oblique' ? 6 : 0; const yb = a3 === 'saddle' ? 50 : 50 + bot * .7; M.push(a3 === 'tiger' ? `<path d="M${F(x)},${F(tY(x))}q${F(w)},${F(top * .6)} 0,${F(top + bot * .5)}q${F(w * .8)},-${F(top * .5)} ${F(w)},-${F(top + bot * .5)}Z" fill="${mk}" opacity="${op}"/>` : `<path d="M${F(x - w / 2 + sk)},${F(tY(x) - 2)}L${F(x + w / 2 + sk)},${F(tY(x) - 2)}L${F(x + w / 2 - sk)},${F(yb)}L${F(x - w / 2 - sk)},${F(yb)}Z" fill="${mk}" opacity="${op}"/>`); } }
      if (kind === 'stripes') { const n = a1, op = a2; for (let i = 0; i < n; i++) { const y = 50 - top * .72 + (top * .72 + bot * (a3 === 'up' ? .1 : .55)) * i / Math.max(1, n - 1); M.push(`<path d="M${X(.12)},${F(y + 1)}C${X(.4)},${F(y - 1)} ${X(.7)},${F(y + (50 - y) * .35)} ${P + 2},${F(y + (50 - y) * .7)}" stroke="${mk}" stroke-width="${a3 === 'wide' ? 4 : 1.7}" fill="none" opacity="${op}"/>`); } }
      if (kind === 'stripe') { M.push(`<path d="M${X(.12)},${F(50 + a2)}l8,-2l8,3l8,-3l8,3l8,-2l8,3l8,-3l8,3l8,-2l8,3l8,-2l8,2l8,-2l8,2l8,-1" transform="scale(${F(L / 136)},1)" transform-origin="${X(.12)} 50" stroke="${mk}" stroke-width="${a1 || 5}" fill="none" stroke-linejoin="round" opacity="${a3}"/>`); }
      if (kind === 'lateral') { M.push(`<path d="M${X(.18)},${F(50 - top * .15)}C${X(.4)},${F(50 - top * .28)} ${X(.7)},${a2 === 'dip' ? F(50 + 4) : F(50 - top * .12)} ${P + 6},50" stroke="${mk}" stroke-width="${a1}" fill="none"/>`); }
      if (kind === 'band') { M.push(`<path d="M${X(.08)},${F(50 - 2)}C${X(.4)},${F(50 - 6)} ${X(.7)},${F(50 - 3)} ${P + 4},50" stroke="${a1}" stroke-width="${F(top * .42)}" fill="none" stroke-linecap="round" opacity="${a2}"/>`); }
      if (kind === 'spots' || kind === 'halo') {
        const n = a1, rad = a2, where = kind === 'halo' ? 'side' : a3, op = kind === 'halo' ? 1 : a4;
        let tries = 0, got = 0;
        while (got < n && tries++ < n * 30) {
          const x = X(.1 + r() * .95), yt = tY(Math.min(x, P)), yb2 = bY(Math.min(x, P));
          let y = yt + (yb2 - yt) * r();
          if (where === 'back' && y > 50 + 2) continue; if (where === 'belly' && y < 50 + bot * .2) continue; if (where === 'side' && Math.abs(y - 50) > top * .45) continue;
          if (where === 'backtail' && y > 50 + 4 && x < X(.7)) continue;
          if (x > P) { if (where === 'side' || where === 'belly') continue; y = 50 + (r() - .5) * 2 * (p.tailH || top) * (x - P) / 34 * .9; } else if (!inBody(x, y)) continue;
          got++;
          if (kind === 'halo') M.push(`<circle cx="${F(x)}" cy="${F(y)}" r="${F(rad + 1.4)}" fill="${a4 || '#f2e6c6'}" opacity=".85"/><circle cx="${F(x)}" cy="${F(y)}" r="${rad}" fill="${a3}"/>`);
          else if (a5 === 'oval') M.push(`<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(rad * 1.6)}" ry="${rad}" fill="${mk}" opacity="${op}"/>`);
          else if (a5 === 'blob') M.push(`<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(rad * (1 + r()))}" ry="${F(rad * (.7 + r() * .6))}" fill="${mk}" opacity="${op}"/>`);
          else M.push(`<circle cx="${F(x)}" cy="${F(y)}" r="${F(rad * (.7 + r() * .6))}" fill="${mk}" opacity="${op}"/>`);
        }
      }
      if (kind === 'blotch') { for (let i = 0; i < a1; i++) { const x = X(.12 + r() * .82), y = 50 + (r() - .55) * top * 1.2; M.push(`<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(5 + r() * 7)}" ry="${F(3 + r() * 5)}" fill="${mk}" opacity="${F(.25 + r() * .3)}" transform="rotate(${F(r() * 60 - 30)} ${F(x)} ${F(y)})"/>`); } }
      if (kind === 'vermic') { for (let i = 0; i < a1; i++) { const x = X(.15 + r() * .75), y = tY(x) + 2 + r() * top * .55; M.push(`<path d="M${F(x)},${F(y)}q3,-3 6,0t6,0" stroke="${mk}" stroke-width="1.6" fill="none" opacity=".85"/>`); } }
      if (kind === 'eyespot') { const x = X(.94), y = 50 - top * .2 * .5 - 2; M.push(`<circle cx="${F(x)}" cy="${F(y)}" r="5.2" fill="#f4e2c4" opacity=".7"/><circle cx="${F(x)}" cy="${F(y)}" r="4.2" fill="${mk}"/>`); }
      if (kind === 'row') { for (let i = 0; i < a1; i++) { const x = X(.24 + i * .07); M.push(`<circle cx="${F(x)}" cy="${F(50 - top * .35 + i * .6)}" r="${i ? 1.6 : 2.6}" fill="${mk}" opacity=".85"/>`); } }
      if (kind === 'pecspot') { M.push(`<ellipse cx="${X(.22)}" cy="${F(50 + 3)}" rx="3.2" ry="3.8" fill="${mk}"/>`); }
      if (kind === 'gillspot') { M.push(`<ellipse cx="${X(.17)}" cy="${F(50 - top * .3)}" rx="2.6" ry="3.2" fill="${mk}"/>`); }
      if (kind === 'scute') { M.push(`<path d="M${X(.7)},${F(50 + 1)}L${P},50" stroke="#000" stroke-opacity=".25" stroke-width="3" stroke-dasharray="1.5 1.5"/>`); }
      if (kind === 'scales') { const big = a2 === 'big', s = big ? 7 : 4.5; let d = ''; for (let x = X(.18); x < P - 2; x += s) for (let y = 50 - top; y < 50 + bot; y += s * .8) { const xo = x + ((Math.round((y - 50) / (s * .8)) & 1) ? s / 2 : 0); d += `M${F(xo)},${F(y)}a${F(s * .55)},${F(s * .55)} 0 0 0 0,${F(s * .9)}`; } M.push(`<path d="${d}" stroke="${big ? '#5a7280' : '#000'}" stroke-opacity="${a1}" stroke-width=".7" fill="none"/>`); }
    }
    if (p.ear) M.push(`<ellipse cx="${F(X(.2))}" cy="${F(50 - top * .12)}" rx="3.4" ry="4.6" fill="${p.ear}"/>`);

    // ---- head details ----
    const ex = N + L * .085 + (p.blunt > .8 ? 2 : 4), ey = ny - top * .26 - (p.blunt > .8 ? 3 : 0), er = p.eye;
    const gx = X(.2);
    const gill = `<path d="M${F(gx - 2)},${F(tY(gx) + 4)}Q${F(gx + 6)},${F(50 + 2)} ${F(gx - 1)},${F(bY(gx) - 3)}" stroke="#000" stroke-opacity=".28" stroke-width="1.2" fill="none"/>`;
    const mlen = 7 * p.mouth, mouth = p.snout === 'under' ? `<path d="M${N + 4},${F(ny + 4)}q${F(mlen * .5)},1 ${F(mlen)},-1" stroke="#1a1a1a" stroke-opacity=".55" stroke-width="1.2" fill="none"/>`
      : `<path d="M${N + .5},${F(ny + .5)}L${F(N + mlen)},${F(ny + 1.5 + p.mouth)}" stroke="${p.mouthC || '#1a1a1a'}" stroke-opacity=".6" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    let barb = '';
    if (p.barbels === 'long') barb = `<path d="M${N + 3},${ny + 1}q-10,4 -14,16M${N + 4},${ny + 2}q-4,8 -2,18M${N + 6},${ny + 3}q2,8 6,13M${N + 4},${ny - 1}q-8,-6 -14,-6" stroke="${p.back}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    if (p.barbels === 'short') barb = `<path d="M${N + 2},${ny + 1}q-4,3 -5,7" stroke="${p.back}" stroke-width="1.2" fill="none"/>`;
    if (p.barbels === 'chin') barb = `<path d="M${N + 8},${F(ny + bot * .45)}l-1,4M${N + 11},${F(ny + bot * .5)}l0,4M${N + 14},${F(ny + bot * .55)}l1,4" stroke="${p.side}" stroke-width="1" stroke-linecap="round"/>`;
    const pec = `<path d="M${F(gx + 3)},${F(50 + 3)}q14,-2 18,6q-10,3 -18,-2Z" fill="${p.ventral || fin}" opacity=".85"/>`;
    const sheen = `<path d="M${X(.12)},${F(50 - top * .55)}C${X(.35)},${F(50 - top * .9)} ${X(.65)},${F(50 - top * .7)} ${X(.9)},${F(50 - ped - 1)}" stroke="#fff" stroke-opacity=".18" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

    const gid = 'fg' + u, cid = 'fc' + u;
    return wrap(opts, `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.back}"/><stop offset=".48" stop-color="${p.side}"/><stop offset="1" stop-color="${p.belly}"/></linearGradient><clipPath id="${cid}"><path d="${body}"/></clipPath></defs>
      ${barb}${finsBack.join('')}<path d="${body}" fill="url(#${gid})"/><g clip-path="url(#${cid})">${M.join('')}<rect x="0" y="${F(50 + bot * .35)}" width="200" height="40" fill="#fff" opacity=".08"/></g>
      ${sheen}${gill}${pec}${mouth}<circle cx="${F(ex)}" cy="${F(ey)}" r="${er + .9}" fill="${p.eyeC || '#e9d9a0'}"/><circle cx="${F(ex)}" cy="${F(ey)}" r="${F(er * .62)}" fill="#111"/><circle cx="${F(ex - er * .3)}" cy="${F(ey - er * .35)}" r="${F(er * .25)}" fill="#fff" opacity=".85"/>
      <path d="${body}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".8"/>`, id);
  }

  function flat(id, p, opts) {
    const u = ++uid, r = rng(id), gid = 'fg' + u, cid = 'fc' + u;
    const body = 'M14,50C16,30 50,18 92,18C130,18 148,34 150,46L150,54C148,66 130,82 92,82C50,82 16,70 14,50Z';
    const frill = 'M30,40C40,10 120,6 146,38L150,46L150,54L146,62C120,94 40,90 30,60Z';
    const tail = p.tail === 'lunate' ? 'M148,46Q170,30 186,22Q172,50 186,78Q170,70 148,54Z' : 'M148,45C168,34 184,38 186,50C184,62 168,66 148,55Z';
    const M = [];
    for (const [kind, n] of p.pat) {
      if (kind === 'ocelli') for (let i = 0; i < n; i++) { const x = 52 + r() * 88, y = 30 + r() * 40; M.push(`<circle cx="${F(x)}" cy="${F(y)}" r="5" fill="#e8dcc0" opacity=".55"/><circle cx="${F(x)}" cy="${F(y)}" r="3.4" fill="${p.mark}"/>`); }
      if (kind === 'blotch') for (let i = 0; i < n; i++) { const x = 30 + r() * 115, y = 26 + r() * 48; M.push(`<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(4 + r() * 6)}" ry="${F(3 + r() * 4)}" fill="${p.mark}" opacity="${F(.3 + r() * .3)}"/>`); }
    }
    for (let i = 0; i < 26; i++) { const x = 30 + r() * 115, y = 24 + r() * 52; M.push(`<circle cx="${F(x)}" cy="${F(y)}" r="${F(.6 + r() * 1.2)}" fill="#f4ead0" opacity=".35"/>`); }
    return wrap(opts, `<defs><radialGradient id="${gid}" cx=".45" cy=".45" r=".6"><stop offset="0" stop-color="${p.back}" stop-opacity=".8"/><stop offset="1" stop-color="${p.back}"/></radialGradient><clipPath id="${cid}"><path d="${body}"/></clipPath></defs>
      <path d="${frill}" fill="${p.back}" opacity=".75"/><path d="${frill}" fill="none" stroke="#000" stroke-opacity=".2" stroke-dasharray="1 2.5" stroke-width="4"/><path d="${tail}" fill="${p.back}" opacity=".85"/>
      <path d="${body}" fill="url(#${gid})"/><g clip-path="url(#${cid})">${M.join('')}</g><path d="M40,50C70,47 110,47 148,50" stroke="#000" stroke-opacity=".2" fill="none"/>
      <path d="M22,56q6,2 10,-1" stroke="#1a1a1a" stroke-opacity=".6" stroke-width="1.4" fill="none"/>
      <circle cx="34" cy="38" r="3.6" fill="#e9d9a0"/><circle cx="34" cy="38" r="2.2" fill="#111"/><circle cx="40" cy="45" r="3.4" fill="#e9d9a0"/><circle cx="40" cy="45" r="2.1" fill="#111"/>
      <path d="${body}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".8"/>`, id);
  }

  function wrap(opts, inner, id) {
    const w = opts.w || 120, flip = opts.flip ? ' transform="translate(200,0) scale(-1,1)"' : '';
    if (opts.raw) return `<g${flip}>${inner}</g>`;
    return `<svg class="fish ${opts.cls || ''}" viewBox="-14 0 214 100" width="${w}" height="${F(w * 100 / 214)}" role="img" aria-label="${esc(SPMAP && SPMAP[id] ? SPMAP[id].name : id)}"><g${flip}>${inner}</g></svg>`;
  }

  // ---- water scene behind the target fish ----
  const WATERS = {
    fresh: ['#2f5b4a', '#16362c', '#0d241c'], greatlakes: ['#3b6a86', '#1c3c52', '#0f2434'], inshore: ['#3f7a7a', '#1d4a4c', '#0f2a2c'],
    surf: ['#5aa4b4', '#2a6a80', '#163e52'], nearshore: ['#2f7aa8', '#174c74', '#0b2a46'], offshore: ['#1f5f9e', '#0e3a6e', '#06203e'],
  };
  function scene(id, water, opts = {}) {
    const u = ++uid, [c1, c2, c3] = WATERS[water] || WATERS.inshore, r = rng(id + water);
    const H = 150, W = 400, g = 'sg' + u, rays = 'sr' + u;
    let floor = '';
    if (water === 'fresh') {
      floor = `<path d="M0,${H}L0,128Q60,118 120,126T240,124T400,122L400,${H}Z" fill="#0a1c14"/>` + Array.from({ length: 9 }, (_, i) => { const x = 10 + i * 46 + r() * 20, h = 40 + r() * 50; return `<path d="M${F(x)},${H}Q${F(x - 6)},${F(H - h / 2)} ${F(x + 2)},${F(H - h)}" stroke="#2c5a36" stroke-width="3" fill="none" opacity=".8"/>`; }).join('') +
        Array.from({ length: 4 }, (_, i) => `<ellipse cx="${F(40 + i * 100 + r() * 30)}" cy="7" rx="16" ry="4" fill="#3d7a3a" opacity=".85"/>`).join('');
    } else if (water === 'inshore') {
      floor = `<path d="M0,${H}L0,126Q80,116 160,126T320,122T400,128L400,${H}Z" fill="#14302a"/>` + Array.from({ length: 14 }, () => { const x = r() * W, h = 18 + r() * 26; return `<path d="M${F(x)},${H}q${F(r() * 8 - 4)},-${F(h / 2)} ${F(r() * 10 - 5)},-${F(h)}" stroke="#3a6a48" stroke-width="2" fill="none" opacity=".75"/>`; }).join('') +
        Array.from({ length: 6 }, () => `<ellipse cx="${F(r() * W)}" cy="${F(136 + r() * 8)}" rx="${F(5 + r() * 5)}" ry="3" fill="#6a6458" opacity=".7"/>`).join('');
    } else if (water === 'surf') {
      floor = `<path d="M0,${H}L0,122Q100,108 200,120T400,116L400,${H}Z" fill="#c8b48a" opacity=".55"/><path d="M0,22Q50,12 100,22T200,22T300,22T400,22L400,0L0,0Z" fill="#fff" opacity=".18"/>`;
    } else if (water === 'greatlakes') {
      floor = `<path d="M0,${H}L0,128Q100,120 200,128T400,124L400,${H}Z" fill="#0c1e28"/>` + Array.from({ length: 7 }, () => `<ellipse cx="${F(r() * W)}" cy="${F(132 + r() * 10)}" rx="${F(10 + r() * 14)}" ry="${F(6 + r() * 5)}" fill="#2a3a44"/>`).join('');
    } else {
      floor = (water === 'nearshore' ? `<path d="M0,${H}L0,128Q60,112 120,124Q170,108 220,126Q300,114 400,126L400,${H}Z" fill="#0a2236"/>` + Array.from({ length: 5 }, () => { const x = r() * W; return `<path d="M${F(x)},${H - 18}q-6,-14 2,-24M${F(x)},${H - 18}q8,-10 4,-22" stroke="#c0604a" stroke-width="2.4" fill="none" opacity=".55"/>`; }).join('') : '') +
        Array.from({ length: 3 }, () => `<g opacity=".8">${Array.from({ length: 6 }, () => `<circle cx="${F(30 + r() * 340 + 0)}" cy="${F(4 + r() * 8)}" r="${F(2 + r() * 3)}" fill="#b89a3a"/>`).join('')}</g>`).join('');
    }
    const bubbles = Array.from({ length: 8 }, () => `<circle cx="${F(r() * W)}" cy="${F(30 + r() * 90)}" r="${F(1 + r() * 2.2)}" fill="none" stroke="#fff" stroke-opacity=".35"/>`).join('');
    const sun = opts.night ? `<circle cx="340" cy="-4" r="22" fill="#e8ecf0" opacity=".25"/>` : '';
    const f = fish(id, { raw: 1 });
    const flat_ = (S[id] || {}).flat, fs = flat_ ? 1.05 : 1.25, fy = flat_ ? 70 : 60;
    return `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc((SPMAP[id] || {}).name || '')}">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
      <linearGradient id="${rays}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#${g})"/>${sun}
      <path d="M60,0L110,0L60,${H}L0,${H}Z M170,0L200,0L190,${H}L140,${H}Z M280,0L330,0L360,${H}L300,${H}Z" fill="url(#${rays})"/>
      <path d="M0,3Q25,-1 50,3T100,3T150,3T200,3T250,3T300,3T350,3T400,3" stroke="#fff" stroke-opacity=".35" fill="none" stroke-width="1.5"/>
      ${floor}${bubbles}
      <g transform="translate(${F(200 - 100 * fs)},${F(fy - 50 * fs)}) scale(${fs})"><ellipse cx="100" cy="${flat_ ? 90 : 96}" rx="70" ry="5" fill="#000" opacity=".22"/>${f}</g></svg>`;
  }

  // small logo for the header
  const logo = `<svg class="logo" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#123247" stroke="#3fd0b5" stroke-width="1.5"/><path d="M5,26q4,-3 8,0t8,0t8,0t7,0" stroke="#3b8fd9" stroke-width="2" fill="none"/><path d="M9,17c4,-6 12,-7 17,-2l5,-4v12l-5,-4c-5,5 -13,4 -17,-2z" fill="#3fd0b5"/><circle cx="13.5" cy="16.5" r="1.3" fill="#06221c"/><circle cx="30" cy="8" r="2.6" fill="#f2b84b"/></svg>`;

  return { fish, scene, logo, has: (id) => !!S[id] };
})();
