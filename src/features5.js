// ===== Check the water: a photo gives the light level (from its exposure data) and Claude reads clarity & tint =====

// Read exposure time, f-number and ISO from a JPEG's EXIF block (no library needed).
async function readExposure(file) {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer(), v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 4 < v.byteLength) {
      const m = v.getUint16(p), len = v.getUint16(p + 2);
      if (m === 0xFFE1 && v.getUint32(p + 4) === 0x45786966) return parseTiff(v, p + 10);
      if ((m & 0xFF00) !== 0xFF00) break;
      p += 2 + len;
    }
  } catch (e) { }
  return null;
}
function parseTiff(v, t) {
  const le = v.getUint16(t) === 0x4949, u16 = o => v.getUint16(t + o, le), u32 = o => v.getUint32(t + o, le);
  const out = {};
  const rat = o => { const a = u32(o), b = u32(o + 4); return b ? a / b : null; };
  const str = (o, n) => { let s = ''; for (let i = 0; i < n - 1; i++) s += String.fromCharCode(v.getUint8(t + o + i)); return s; };
  const ifd = (off, cb) => { const n = u16(off); for (let i = 0; i < n; i++) { const e = off + 2 + i * 12; cb(u16(e), u16(e + 2), u32(e + 4), e + 8); } };
  let exifOff = null;
  ifd(u32(4), (tag, type, cnt, vo) => { if (tag === 0x8769) exifOff = u32(vo - 0); });
  if (exifOff == null) return null;
  ifd(exifOff, (tag, type, cnt, vo) => {
    if (tag === 0x829A) out.t = rat(u32(vo));          // ExposureTime (s)
    else if (tag === 0x829D) out.f = rat(u32(vo));     // FNumber
    else if (tag === 0x8827) out.iso = u16(vo);        // ISO
    else if (tag === 0x9003 && cnt >= 19) out.taken = str(u32(vo), cnt); // DateTimeOriginal "YYYY:MM:DD HH:MM:SS"
  });
  if (!out.t || !out.f || !out.iso) return null;
  out.ev = Math.log2(out.f * out.f / out.t) - Math.log2(out.iso / 100); // exposure value at ISO 100
  if (out.taken) { const [d, h] = out.taken.split(' '), [Y, M, D] = d.split(':').map(Number), [hh, mm, ss] = h.split(':').map(Number); out.takenMs = new Date(Y, M - 1, D, hh, mm, ss).getTime(); }
  return out;
}
// EV100 → what an angler would call it
function lightFromEV(ev) {
  if (ev < 4) return { band: 'night', label: 'dark — night or deep twilight' };
  if (ev < 8) return { band: 'low', label: 'very low light — dawn, dusk or a storm' };
  if (ev < 11.5) return { band: 'low', label: 'low light — heavy overcast or shade' };
  if (ev < 13.5) return { band: 'bright', label: 'moderate — bright overcast or hazy sun' };
  return { band: 'bright', label: 'bright sun' };
}
var TINT_TIP = {
  tannic: 'Tea-stained (tannic) water: chartreuse, gold, orange and white stand out; browns and green pumpkin disappear.',
  green: 'Green water: chartreuse and white show up well; natural greens blend in.',
  brown: 'Muddy brown water: go dark (black, purple) for a silhouette, or loud chartreuse, with rattles or vibration.',
  blue: 'Blue open water: natural blue/white, silver and pink — or dark colors on the surface at low light.',
  clear: 'Clear water: natural, translucent colors and lighter line; fish see everything.',
};

// The latest water check for a spot, if it's still current.
function waterCheck(sp, maxH) {
  const w = (state.settings.waterCheck || {})[sp && sp.id];
  return w && Date.now() - w.t < (maxH || 8) * 3600e3 && midnight(w.t) === midnight(Date.now()) ? w : null;
}

function waterSheet() {
  const sp = spot();
  $('#sheet').innerHTML = `<div class="in"><div class="hrow"><h2 style="flex:1;margin:0">Check the water</h2><button class="btn sm ghost" data-close="1">Close</button></div>
   <div class="small muted" style="margin:6px 0 10px">Take a photo of the water at ${esc(sp.name)} — aim at the water near you at an angle (not straight into the sun). Polarized sunglasses over the lens cut glare. The photo's exposure tells the light level; ${Cloud.user ? 'Claude reads the clarity and color' : '<b>sign in</b> (Catch log) to have Claude read the clarity and color too'}.</div>
   <label class="btn ghost" style="display:block;text-align:center">📷 Take photo<input id="wcFile" type="file" accept="image/*" capture="environment" style="display:none"></label>
   <img id="wcPrev" alt="" style="display:none;width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-top:10px">
   <div id="wcOut" style="margin-top:10px"></div></div>`;
  $('#sheet').classList.add('on');
  tourFor('water', { delay: 350 });
}
async function runWaterCheck(file) {
  Stats.track('water_check');
  const out = $('#wcOut'), sp = spot(), res = { t: Date.now() };
  $('#wcPrev').src = URL.createObjectURL(file); $('#wcPrev').style.display = 'block';
  const ex = await readExposure(file);
  const lines = [];
  if (ex) {
    const old = ex.takenMs && Math.abs(Date.now() - ex.takenMs) > 45 * 60e3;
    const L = lightFromEV(ex.ev);
    if (old) lines.push(`<div class="small muted">This photo was taken ${fmtD(ex.takenMs)} ${fmtT(ex.takenMs)}, so its light level isn't used for right now.</div>`);
    else { res.ev = Math.round(ex.ev * 10) / 10; res.light = L.band; res.lightLabel = L.label; lines.push(`<div class="kvrow"><span>☀️ Light</span><b>${esc(L.label)}</b></div>`); }
  } else lines.push('<div class="small muted">No exposure data in this photo (some apps strip it) — light comes from the sun angle and cloud forecast instead.</div>');
  out.innerHTML = lines.join('') + (Cloud.user ? '<div class="small muted">🔎 Reading the water…</div>' : '');
  if (Cloud.user && Cloud.sb && navigator.onLine !== false) {
    try {
      const img = await shrink(file);
      const { data: sess } = await Cloud.sb.auth.getSession();
      const r = await fetch(SB_URL + '/functions/v1/catch-photo', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.session.access_token, apikey: SB_KEY },
        body: JSON.stringify({ mode: 'water', image: img, media_type: 'image/jpeg', region: (REGION_LABEL[spotRegion(sp)] || 'the US') + (natState(sp) ? ', ' + natState(sp) : ''), water: (WATER_LABEL[sp.water] || sp.water) + (sp.water === 'fresh' && typeof fwKindOf === 'function' && fwKindOf(sp) ? ' ' + fwKindOf(sp) : ''), light: res.lightLabel || '' }) });
      const j = await r.json();
      if (!r.ok) lines.push(`<div class="small" style="color:var(--bad)">${esc(j.message || 'Couldn’t read the water')}</div>`);
      else if (j.is_water === false) lines.push('<div class="small">That doesn’t look like water — try again aimed at the water.</div>');
      else if (j.confident === false || j.glare) lines.push(`<div class="small">Hard to judge from this photo${j.note ? ': ' + esc(j.note) : ''}. ${esc(j.retake_tip || 'Try again at an angle, out of the glare.')}</div>`);
      if (r.ok && j.is_water !== false && ['clear', 'stained', 'muddy'].includes(j.clarity) && j.confident !== false) {
        Object.assign(res, { clarity: j.clarity, tint: j.tint, vis: j.visibility_ft, surface: j.surface, sky: j.sky, note: j.note });
        lines.push(`<div class="kvrow"><span>💧 Clarity</span><b>${esc(j.clarity)}${j.visibility_ft != null ? ` · ~${esc(j.visibility_ft)} ft` : ''}</b></div>
          ${j.tint ? `<div class="kvrow"><span>🎨 Color</span><b>${esc({ tannic: 'tea-stained (tannic)', green: 'green', brown: 'muddy brown', blue: 'blue', clear: 'clear' }[j.tint] || j.tint)}</b></div>` : ''}
          ${j.surface ? `<div class="kvrow"><span>🌊 Surface</span><b>${esc(j.surface)}</b></div>` : ''}${j.note ? `<div class="small muted">${esc(j.note)}</div>` : ''}`);
      }
    } catch (e) { lines.push('<div class="small muted">Couldn’t reach Claude — the light reading still counts.</div>'); }
  }
  if (res.light || res.clarity) {
    state.settings.waterCheck = state.settings.waterCheck || {}; state.settings.waterCheck[sp.id] = res; Store.saveSettings();
    render();
    // the color picks this photo produced, right here in the result
    try {
      const t0 = midnight(Date.now()), { res: rr } = scoreAll(t0), r = chosen(rr), c = cond(t0);
      const pk = colorPicks(r.sp, sp, Date.now(), c);
      lines.push(`<div class="colorbox"><div class="small"><b>🎨 ${state.fly ? 'Flies' : 'Lures'} for ${esc(r.sp.name)} right now</b> <span class="muted">(${esc(pk.why)})</span></div><div class="cchips">${pk.list.map(x => `<span class="cchip">${esc(x)}</span>`).join('')}</div>${pk.tip ? `<div class="small muted">${esc(pk.tip.trim())}</div>` : ''}</div>`);
    } catch (e) { }
    lines.push(`<div class="note">Saved for ${esc(sp.name)} — the score and color picks use this photo: light for about 90 minutes, clarity for the rest of today.</div><div class="row" style="margin-top:8px"><button class="btn" data-close="1">Done</button></div>`);
  }
  out.innerHTML = lines.join('');
}
document.addEventListener('change', e => { if (e.target.id === 'wcFile' && e.target.files[0]) runWaterCheck(e.target.files[0]); });
document.addEventListener('click', e => { if (e.target.closest('[data-watercheck]')) { e.preventDefault(); waterSheet(); } });
