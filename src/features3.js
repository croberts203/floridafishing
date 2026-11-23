// ===== Lure & fly colors, water clarity estimate, wind direction and river flow — website build =====

// ---------- Water clarity: your setting wins; otherwise estimate it from rain, river flow, wind and water type ----------
function estClarity(sp, a, flow) {
  if (!sp) return null;
  const order = ['clear', 'stained', 'muddy'];
  const base = { offshore: 0, nearshore: 0, surf: 1, inshore: 1, greatlakes: 0, fresh: 1 }[sp.water] ?? 1;
  let lvl = base; const why = [];
  if (sp.water === 'offshore' || sp.water === 'nearshore') why.push('open water is usually clear');
  if (a && a.rain48 != null) {
    if (a.rain48 >= 25) { lvl += sp.water === 'offshore' ? 0 : 2; why.push(`${Math.round(a.rain48 / 25.4 * 10) / 10}" of rain in 48 h`); }
    else if (a.rain48 >= 8) { lvl += sp.water === 'offshore' ? 0 : 1; why.push(`some rain in the last 2 days`); }
  }
  if (flow && flow.ratio >= 1.6) { lvl += 1; why.push('river running high'); }
  if (a && a.wind != null && ['surf', 'inshore', 'greatlakes'].includes(sp.water) && a.wind >= 16) { lvl += 1; why.push(`${a.wind} mph wind stirring it up`); }
  if (sp.water === 'fresh' && typeof fwKindOf === 'function') { const k = fwKindOf(sp); if (k === 'river' && !why.length) why.push('rivers usually carry some color'); if ((k === 'lake' || k === 'reservoir') && !why.length) why.push('typical lake color'); }
  if (!why.length) why.push(sp.water === 'surf' ? 'surf usually has some color' : 'typical for this water');
  return { v: order[Math.max(0, Math.min(2, lvl))], why: 'estimated: ' + why.join(', ') };
}

// ---------- Lure and fly color picks ----------
// The rule of thumb anglers use: clear water + bright light → natural, translucent; stained → bright or metallic (gold,
// chartreuse); muddy or dark → solid dark silhouettes (black, purple) or loud colors with vibration; night → black.
var BAIT_FIRST = { catfish: 1, sheepshead: 1, blackdrum: 1, reef: 1, tautog: 1, scup: 1, carp: 1, whiting: 1, pachalibut: 1, lingcod: 0, surfperch: 1 };
var COLOR_SALT = {
  'clear-bright': { pick: ['Clear/silver flake', 'Pearl/white', 'Natural shrimp (tan or pink)'], fly: ['Tan or white shrimp (EP, Gotcha)', 'Tan/white Clouser', 'Olive over white baitfish'] },
  'clear-low': { pick: ['Pearl/chartreuse', 'Silver/blue back', 'White with a glow tail'], fly: ['White/chartreuse Clouser', 'Pearl Gummy minnow', 'Tan shrimp'] },
  'stained-bright': { pick: ['Gold or copper ("new penny")', 'Root beer/gold flake', 'Chartreuse tail'], fly: ['Copper or gold flash shrimp', 'Root beer Clouser', 'Chartreuse/white Clouser'] },
  'stained-low': { pick: ['Chartreuse', 'Pink/chartreuse ("electric chicken")', 'Gold spoon'], fly: ['Chartreuse/white Clouser', 'Pink/white shrimp', 'Black/gold Kwan'] },
  'muddy-bright': { pick: ['Black/chartreuse', 'Purple/chartreuse', 'Root beer/chartreuse with a rattle'], fly: ['Black/chartreuse', 'Purple/black with flash', 'Chartreuse with a rattle'] },
  'muddy-low': { pick: ['Black or dark purple', 'Black/chartreuse with a rattle', 'Gold spoon (flash)'], fly: ['Black/purple', 'Black/chartreuse', 'Dark crab'] },
  night: { pick: ['Black or dark purple (silhouette)', 'White or glow under dock lights', 'Noisy topwater, dark'], fly: ['Black or purple', 'White under lights', 'Dark crab or shrimp'] },
};
var COLOR_FRESH = {
  'clear-bright': { pick: ['Green pumpkin', 'Watermelon', 'Natural shad (white/silver)'], fly: ['Olive or brown nymph/streamer', 'Tan crayfish', 'White/silver baitfish'] },
  'clear-low': { pick: ['White or pearl', 'Black/blue', 'Shad with a chartreuse tail'], fly: ['White streamer', 'Black/olive Woolly Bugger', 'Popper (yellow or white)'] },
  'stained-bright': { pick: ['Chartreuse/white', 'Firetiger', 'Junebug or red craw'], fly: ['Chartreuse/white Clouser', 'Olive/yellow Woolly Bugger', 'Orange craw'] },
  'stained-low': { pick: ['Black/blue', 'Chartreuse with a dark back', 'Gold blade'], fly: ['Black/chartreuse', 'Black Woolly Bugger', 'Yellow popper'] },
  'muddy-bright': { pick: ['Black/blue', 'Bright chartreuse or orange with a rattle', 'Colorado-blade spinnerbait'], fly: ['Black with flash', 'Chartreuse', 'Big black popper'] },
  'muddy-low': { pick: ['Black/blue or black/red', 'Loud chartreuse crankbait', 'Big Colorado blade'], fly: ['Black/purple', 'Black Woolly Bugger', 'Black popper'] },
  night: { pick: ['Black or black/blue', 'Dark purple', 'Black buzzbait or jitterbug'], fly: ['Black popper or slider', 'Black/purple bugger', 'Black mouse'] },
};
var SPECIES_COLOR = {
  redfish: 'Gold and copper spoons are a redfish classic in any water.', trout: 'Seatrout love pink, white and chartreuse soft plastics.',
  flounder: 'Flounder respond to chartreuse and pink (and scented baits) worked slowly on the bottom.', snook: 'Snook: white, pearl and silver at night under lights.',
  tarpon: 'Tarpon: purple/black in dirty water, natural or white in clear.', bass: 'Bass: match the main forage — shad colors near open water, craw colors around rock and wood.',
  crappie: 'Crappie: chartreuse, pink/white and blue/white tubes or jigs.', bream: 'Bream: small crickets, worms, or black and chartreuse micro-jigs.',
  pompano: 'Pompano: pink or chartreuse jigs and teasers, or sand fleas.', spanish: 'Spanish mackerel: silver spoons and gold or silver jigs, worked fast.',
  bluefish: 'Bluefish: silver spoons and white bucktails; use wire.', cobia: 'Cobia: big bucktails or eels in white, chartreuse or pink.',
  walleye: 'Walleye: chartreuse/orange or firetiger in stained water; natural perch in clear.', smallmouth: 'Smallmouth: green pumpkin and natural goby/craw colors.',
  rainbow: 'Trout: natural olive/brown flies; brighter (pink, egg) in high or stained water.', brown: 'Brown trout: dark streamers at low light; natural colors in clear water.',
  pike: 'Pike: bright spoons and big flashy baits.', musky: 'Musky: black in low light, natural perch/sucker in clear water.',
  striper: 'Stripers: white/pearl or bone, darker at night.', albie: 'False albacore: small, slim and silver/green — match the bait.', bonefish: 'Bonefish: tan and pink over sand, olive over grass.',
};
function lightBand(smp, sky) {
  if (!smp) return 'bright';
  if (smp.lbin === 'Night') return 'night';
  if (smp.lbin === 'Dawn' || smp.lbin === 'Dusk') return 'low';
  if (sky === 'overcast' || sky === 'rain') return 'low';
  return 'bright';
}
function colorPicks(spc, sp, t, c) {
  const day = getDay(midnight(t), sp), i = Math.max(0, Math.min(day.samples.length - 1, Math.round((t - day.t0) / Engine.STEP)));
  const smp = day.samples[i], wc = typeof waterCheck === 'function' ? waterCheck(sp, 1.5) : null;
  const useWc = wc && wc.light && Math.abs(t - Date.now()) < 90 * 60e3; // the photo's light only applies near now
  const light = useWc ? wc.light : lightBand(smp, c.sky), clarity = c.clarity || 'stained';
  const fresh = ['fresh', 'greatlakes'].includes(sp.water), table = fresh ? COLOR_FRESH : COLOR_SALT;
  const key = light === 'night' ? 'night' : `${clarity}-${light}`, set = table[key] || table['stained-bright'];
  const moon = light === 'night' ? (day.ast.illum > .6 ? ' A bright moon backlights your bait — dark colors stand out best.' : ' Dark night: black, rattles and slow retrieves help fish find it.') : '';
  const lightTxt = { night: 'night', low: smp && (smp.lbin === 'Dawn' || smp.lbin === 'Dusk') ? (smp.lbin === 'Dawn' ? 'first light' : 'last light') : 'cloudy, low light', bright: 'bright light' }[light];
  const tint = c.tint && TINT_TIP[c.tint] ? ' ' + TINT_TIP[c.tint] : '';
  return { light, clarity, list: state.fly ? set.fly : set.pick, why: `${useWc ? 'measured: ' + wc.lightLabel : lightTxt}, ${clarity}${c.tint && c.tint !== 'clear' ? ' ' + c.tint : ''} water`, tip: (SPECIES_COLOR[spc.id] || '') + moon + tint, bait: !state.fly && BAIT_FIRST[spc.id] };
}
function colorCard(r, sp, c) {
  if (!r || !sp) return '';
  const wc = state.day0 === midnight(Date.now()) && typeof waterCheck === 'function' ? waterCheck(sp, 1.5) : null;
  const w = wc ? null : Engine.windows(r, getDay(state.day0, sp), 3).sort((a, b) => b.peak - a.peak)[0], t = wc ? Date.now() : w ? w.pk : r.bestStart;
  const p = colorPicks(r.sp, sp, t, c);
  const sw = { 'Clear/silver flake': '#cfd8dc', 'Pearl/white': '#f4f1ea', 'Gold or copper ("new penny")': '#c9873a', 'Chartreuse': '#c7e83a', 'Green pumpkin': '#5c6b2e', 'Watermelon': '#6f8f4a', 'Black or dark purple': '#2b2140', 'Black/blue': '#1d2440', 'Black/chartreuse': '#1d1d1d' };
  const chip = s => { const k = Object.keys(sw).find(x => s.startsWith(x.split(' ')[0])) ; const col = sw[s] || (/chartreuse/i.test(s) ? '#c7e83a' : /black|dark/i.test(s) ? '#222' : /gold|copper|root beer/i.test(s) ? '#b9802f' : /pink/i.test(s) ? '#f08fb0' : /white|pearl|silver|glow/i.test(s) ? '#eef0f0' : /green|olive|watermelon/i.test(s) ? '#6b7b3a' : /tan|natural|shrimp/i.test(s) ? '#d7b98c' : /purple/i.test(s) ? '#5a3a7a' : /orange|craw|firetiger/i.test(s) ? '#e0782f' : '#8aa'); return `<span class="cchip"><i style="background:${col}"></i>${esc(s)}</span>`; };
  return `<div class="colorbox"><div class="small"><b>🎨 ${state.fly ? 'Fly' : 'Lure'} colors</b> for ${wc ? 'right now' : w ? fmtT(w.a) + '–' + fmtT(w.b) : 'the best window'} <span class="muted">(${esc(p.why)})</span></div>
   <div class="cchips">${p.list.map(chip).join('')}</div>
   ${p.bait ? `<div class="small muted">${esc(r.sp.name)} are mostly caught on natural bait — colors matter less than fresh bait on the bottom.</div>` : ''}${p.tip ? `<div class="small muted">${esc(p.tip.trim())}</div>` : ''}
   ${c.auto && c.auto.clarity && !/photo/.test(c.auto.clarity) ? `<div class="small muted">Water clarity ${esc(c.auto.clarity)}.</div>` : ''}
   <div class="row" style="margin-top:6px"><button class="btn sm ghost" data-watercheck="1">📷 Check the water now</button></div></div>`;
}

// ---------- Wind direction: is it blowing onto the shore you fish? ----------
var FACING = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
function spotFacing(sp) { const f = sp.faces || (state.settings.facing || {})[sp.id]; return f && FACING[f] != null ? FACING[f] : null; }
// returns { factor, text } — onshore wind stacks bait (and fish) against the shore; strong offshore wind flattens and clears it
function windEffect(sp, c) {
  if (c.windDir == null || c.wind == null) return null;
  const f = spotFacing(sp), from = compass(c.windDir);
  if (f == null) return { factor: 1, text: `Wind from the ${from} at ${Math.round(c.wind)} mph` };
  const diff = Math.abs(((c.windDir - f) % 360 + 540) % 360 - 180); // 0 = blowing straight onto this shore
  if (diff <= 50 && c.wind >= 6 && c.wind <= 20) return { factor: 1.07, text: `Wind from the ${from} at ${Math.round(c.wind)} mph is blowing onto your shore — bait and fish stack up on that bank` };
  if (diff <= 50 && c.wind > 20) return { factor: .95, text: `Strong onshore wind (${from} ${Math.round(c.wind)} mph) — rough, muddy water on this shore` };
  if (diff >= 130 && c.wind >= 12) return { factor: .97, text: `Offshore wind (${from} ${Math.round(c.wind)} mph) — calmer, clearer water but bait pushed away from this bank` };
  return { factor: 1, text: `Wind from the ${from} at ${Math.round(c.wind)} mph — crosswind on this spot` };
}

// ---------- River flow: compare today with the past week ----------
function flowInfo(sp) {
  if (!sp || sp.water !== 'fresh' || (typeof fwKindOf === 'function' && fwKindOf(sp) !== 'river')) return null;
  const n = natNow(sp), u = n && n.usgs; if (!u || !u.flowCfs || !u.flowWeek || u.km > 25) return null;
  const now = u.flowCfs.v, med = u.flowWeek.median, d1 = u.flowWeek.change24; if (!med) return null;
  const ratio = now / med, rising = d1 != null && d1 > .1, falling = d1 != null && d1 < -.08;
  let factor = 1, text;
  if (ratio >= 2 && rising) { factor = .72; text = 'River is high and rising — muddy and fast; fish tight to banks, eddies and creek mouths'; }
  else if (ratio >= 1.4 && rising) { factor = .85; text = 'River is rising — fishing usually slows as it muddies'; }
  else if (ratio >= 1.3 && falling) { factor = 1.08; text = 'River is falling and clearing after a rise — often a good bite'; }
  else if (ratio <= .55) { factor = .93; text = 'River is low — fish concentrate in deeper holes; go light and stealthy'; }
  else text = `River flow is near normal for the week${rising ? ' (rising slightly)' : falling ? ' (falling slightly)' : ''}`;
  return { ratio, factor, text: `${text}. ${Math.round(now).toLocaleString()} cfs vs ${Math.round(med).toLocaleString()} cfs typical this week (${u.name}).` };
}

function facingRow(c) {
  const sp = spot(), cur = sp.faces || (state.settings.facing || {})[sp.id] || '';
  const dirs = [['', 'Not set'], ['N', 'North'], ['NE', 'Northeast'], ['E', 'East'], ['SE', 'Southeast'], ['S', 'South'], ['SW', 'Southwest'], ['W', 'West'], ['NW', 'Northwest']];
  return `<div class="row"><div><label>Which way does this shore face? (looking out at the water)</label><select id="cFace">${dirs.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('')}</select><div class="small muted">${c.windDir != null ? `Forecast wind from the ${compass(c.windDir)}. ` : ''}Set this and wind blowing onto your bank (bait stacks up) or off it (calmer, clearer) counts in the score.</div></div></div>`;
}
