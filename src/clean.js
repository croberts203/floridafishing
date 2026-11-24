// Clean tab: a fillet / dressing video for each species, recommended gear, and shop links.
// Videos are YouTube ids checked with YouTube's oEmbed (exist and allow embedding). The player
// only loads when tapped, so the tab stays light.
const CLEAN = {
  bass: { v: ['FFCPpZqPBhU'], g: ['electric'] },
  smallmouth: { v: ['tKa4xS75bQQ'], g: ['electric'] },
  bream: { v: ['9QUKevJ43PI'], g: ['scaler', 'electric'], tip: 'Small bream are great scaled, gutted and fried whole.' },
  redear: { v: ['C2bDV2g-ai8'], g: ['electric', 'scaler'] },
  crappie: { v: ['eXwooBvFVsw'], g: ['electric'] },
  catfish: { v: ['U5xGgxQN35I'], g: ['skinpliers'], tip: 'Mind the pectoral and dorsal spines. Skin catfish rather than scaling, and trim the fat and dark meat for a milder taste.' },
  shad: { v: ['cBea1ah0CBg'], g: ['tweezers'], tip: 'Shad are famously bony. Boning a fillet takes practice, so many anglers smoke or can them instead.' },
  trout: { v: ['W5ELahdcrrU'], g: [], tip: 'Seatrout flesh is soft. Ice them right away and fillet them cold.' },
  flounder: { v: ['J5eEnfLorqw'], g: [], tip: 'Flatfish give four fillets, two from the top and two from the bottom.' },
  redfish: { v: ['3eLX1QmOkjw'], g: ['bigknife'], tip: 'Try “on the half shell”: leave the scales and skin on and grill the fillets scale side down.' },
  blackdrum: { v: ['x1umQbQlOMY'], g: ['bigknife'], tip: 'Smaller drum (under about 15 lb) eat best. Big ones often have harmless spaghetti worms you can pick out.' },
  sheepshead: { v: ['TGpnZmthaxQ'], g: ['bigknife', 'shears'], tip: 'Their tough scales dull knives fast. Keep a sharpener handy and cut around the rib cage rather than through it.' },
  pompano: { v: ['Uv9Jm4tzH80'], g: ['scaler'] },
  whiting: { v: ['nCYw3Ql5xj4'], g: ['scaler'] },
  bluefish: { v: ['Cbcj2t5tYTQ'], g: ['bleed'], tip: 'Bleed and ice them right away, then cut out the dark bloodline for a much milder fillet. Best eaten fresh.' },
  cobia: { v: ['7W2gg20zl8M'], g: ['bigknife'] },
  tarpon: { cr: 'Tarpon are catch and release in most places (in Florida you need a tag to keep one). Keep big fish in the water, revive them, and release quickly.' },
  spanish: { v: ['6S7FVfq55ho'], g: ['bleed'], tip: 'Their skin is thin and the meat soft. Ice them right away and use a sharp, flexible knife.' },
  jack: { v: ['dllaUvDr1xs'], g: ['bigknife', 'bleed'], tip: 'Bleed them at once and cut away all the dark red meat. Most people release jacks.' },
  tripletail: { v: ['4PuNISdRZNk'], g: ['bigknife', 'shears'] },
  king: { v: ['5AucdJFgYsE'], g: ['bigknife', 'bleed'], tip: 'Big kings are often cut into steaks. Bleed them, and trim the dark meat for a milder taste.' },
  mahi: { v: ['1W1f3gf58s0'], g: ['bigknife', 'bleed'] },
  reef: { v: ['0O1eRGdgLXM', 'cBv6bnv_11o'], g: ['bigknife', 'shears'], tip: 'Snapper first, then grouper (with the cheeks). Many states require reef fish landed whole, so check before cleaning at sea.' },
  walleye: { v: ['G_3CjM1uh44'], g: ['electric'], tip: 'Don\'t forget the cheeks, and remove the pin bones for boneless fillets.' },
  perch: { v: ['IiWKE535H5c'], g: ['electric'] },
  pike: { v: ['VjbmTxhX7qE'], g: ['tweezers'], tip: 'Pike have a row of Y-bones above the ribs. This method takes them out for boneless fillets.' },
  musky: { cr: 'Musky are almost always released, and most waters have very high size limits. Support the fish horizontally, keep it in the water, and release it quickly.', v: ['VjbmTxhX7qE'], note: 'If you do legally keep one, it cleans like a pike:' },
  rainbow: { v: ['JTOihgUlJWY'], g: ['tweezers'], tip: 'Small trout are best gutted and cooked whole. Bigger ones fillet nicely.' },
  brown: { v: ['JTOihgUlJWY'], g: ['tweezers'] },
  brook: { v: ['63ZXI4EXdM0'], g: [], tip: 'Brookies are small. Gut them, rinse out the bloodline along the spine and cook them whole.' },
  laketrout: { v: ['JnqB5Yx0Q6U'], g: ['bigknife', 'tweezers'], tip: 'Trim the fatty belly and dark lateral line on big lakers for a cleaner taste.' },
  salmongl: { v: ['FCUPpj1HV54'], g: ['bigknife', 'tweezers'] },
  striperfw: { v: ['hOqGpRzRMxc'], g: ['electric'], tip: 'Cut out the red “mud stripe” along the lateral line.' },
  whitebass: { v: ['Hdr8EOhkSp8'], g: ['electric'], tip: 'Cut out all the red meat along the lateral line. That\'s the secret to mild white bass.' },
  carp: { v: ['c_yd8PKdmT8'], g: ['bigknife'], tip: 'Score the fillets closely so the small bones cook away, or grind the meat for fish cakes.' },
  striper: { v: ['qHhjnMn7L_U'], g: ['bigknife'], tip: 'Trim the red bloodline. Check your state\'s slot limit before you keep one.' },
  fluke: { v: ['Wlv0_nBnJ-A'], g: [], tip: 'Four fillets per fish, like other flatfish.' },
  seabass: { v: ['75pvCcswIu8'], g: ['shears'], tip: 'Watch the sharp dorsal spines.' },
  tautog: { v: ['hLbpXLNc98c'], g: ['bigknife', 'shears'], tip: 'Tog have tough skin and heavy ribs. A stiff knife and cut gloves help.' },
  albie: { v: ['Jgj1Z093rtg'], g: ['bleed', 'bigknife'], tip: 'Bleed false albacore immediately and remove every bit of the dark bloodline. Bonito are better eating.' },
  weakfish: { v: ['MkhrLfEmiNA'], g: [], tip: 'Soft flesh. Ice them quickly.' },
  scup: { v: ['H7twhrdaZfE'], g: ['scaler'] },
  snook: { v: ['mm--AvsT254'], g: ['bigknife'], tip: 'Always skin snook, because the skin gives a soapy taste. Check the slot limit and season first.' },
  bonefish: { cr: 'Bonefish are catch and release in Florida and most other places, and they\'re very bony anyway. Keep them in the water and revive them before letting go.' },
  permit: { v: ['imvSo64hr2s'], g: ['bigknife'], tip: 'Permit are often released (Florida has special rules in the southern zone), so check the rules first.' },
  mangrove: { v: ['i2dZqGCJXlc'], g: ['scaler'] },
  calico: { v: ['QKmu0F90Mbg'], g: [] },
  yellowtail: { v: ['9JgrwOQtTiQ'], g: ['bigknife', 'bleed'] },
  calhalibut: { v: ['P0m2cgtOcwI'], g: [], tip: 'Four fillets per fish, like other flatfish.' },
  surfperch: { v: ['BoD0y8MXNVw'], g: ['scaler'] },
  rockfish: { v: ['Igh6j8cqudc'], g: ['shears'], tip: 'Watch the venomous spines on scorpionfish-type rockfish. Gloves help.' },
  lingcod: { v: ['BjxeSHBAZkE'], g: ['bigknife'], tip: 'Some lingcod have blue-green flesh. It\'s safe and turns white when cooked.' },
  salmonpac: { v: ['QoFH5Muq_8Y'], g: ['bigknife', 'tweezers', 'bleed'] },
  pachalibut: { v: ['Lf73jOtAILA'], g: ['bigknife'], tip: 'Bleed big halibut by cutting the gills. Don\'t forget the cheeks.' },
  ulua: { v: ['_gyn7tUb3fQ'], g: ['bigknife', 'bleed'], tip: 'This shows the basic method for trevally-type fish. Large ulua can carry ciguatera in some areas, so ask locally before eating big ones.' },
};
const GEAR = {
  fillet: { n: 'Flexible fillet knife, 7–9"', why: 'The one tool you need. Flex lets the blade ride over the backbone and ribs.', q: 'fillet knife 7 inch flexible' },
  sharpener: { n: 'Knife sharpener', why: 'A sharp knife is safer and wastes less meat.', q: 'fillet knife sharpener' },
  glove: { n: 'Cut-resistant fillet glove', why: 'Wear it on the hand holding the fish.', q: 'cut resistant fillet glove' },
  board: { n: 'Fillet board with tail clamp', why: 'Holds slippery fish still.', q: 'fish fillet board with clamp' },
  bags: { n: 'Vacuum sealer or freezer bags', why: 'Frozen fillets keep for months without freezer burn.', q: 'vacuum sealer for fish' },
  electric: { n: 'Electric fillet knife', why: 'Makes fast work of a big mess of panfish, crappie, walleye or bass.', q: 'electric fillet knife' },
  skinpliers: { n: 'Catfish skinning pliers', why: 'Grip and pull the skin off in one go.', q: 'catfish skinning pliers' },
  scaler: { n: 'Fish scaler', why: 'For fish you cook skin-on or whole.', q: 'fish scaler tool' },
  bigknife: { n: 'Stiff 10–12" fillet or breaking knife', why: 'For big, heavy-boned fish and cutting through ribs.', q: '12 inch breaking knife fish' },
  shears: { n: 'Heavy-duty kitchen shears', why: 'Snips fins, spines and rib bones.', q: 'heavy duty kitchen shears fish' },
  tweezers: { n: 'Fish bone tweezers', why: 'Pulls pin bones and Y-bones from fillets.', q: 'fish bone tweezers' },
  bleed: { n: 'Bleeding knife and an ice slurry', why: 'Bleeding and icing right away gives a much milder fillet.', q: 'fish bleeding knife' },
};
const BASE_GEAR = ['fillet', 'sharpener', 'glove', 'board', 'bags'];
const SHOPS = {
  google: { n: 'Google Shopping', u: q => 'https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(q) },
  amazon: { n: 'Amazon', u: q => 'https://www.amazon.com/s?k=' + encodeURIComponent(q) },
  walmart: { n: 'Walmart', u: q => 'https://www.walmart.com/search?q=' + encodeURIComponent(q) },
  ebay: { n: 'eBay', u: q => 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q) },
};
const cleanShop = () => { const k = lsGet('ff.shop', 'google'); return SHOPS[k] ? k : 'google'; };
function cleanList() {
  const all = (typeof SPMAP !== 'undefined' ? Object.values(SPMAP) : SPECIES).filter(s => CLEAN[s.id]);
  const here = new Set(eligible(spot()).map(s => s.id));
  return { here: all.filter(s => here.has(s.id)), other: all.filter(s => !here.has(s.id)).sort((a, b) => a.name.localeCompare(b.name)) };
}
function cleanSpId() {
  const L = cleanList(), ok = id => id && CLEAN[id] && (L.here.concat(L.other)).some(s => s.id === id);
  if (ok(state.cleanSp)) return state.cleanSp;
  if (state.spId !== 'auto' && ok(state.spId)) return state.spId;
  return (L.here[0] || L.other[0]).id;
}
function ytCard(id) {
  return `<div class="ytbox" data-yt="${id}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="Video thumbnail" loading="lazy"><span class="ytplay">▶</span></div><div class="small muted ytcred" data-ytcred="${id}"><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Watch on YouTube</a></div>`;
}
function viewClean() {
  const id = cleanSpId(), L = cleanList(), sp = SPMAP[id] || SPECIES.find(s => s.id === id), c = CLEAN[id], shop = cleanShop();
  const opt = s => `<option value="${s.id}" ${s.id === id ? 'selected' : ''}>${esc(s.name)}</option>`;
  const sel = `<select id="cleanSel">${L.here.length ? `<optgroup label="Fish at this spot">${L.here.map(opt).join('')}</optgroup>` : ''}<optgroup label="${L.here.length ? 'Everything else' : 'All species'}">${L.other.map(opt).join('')}</optgroup></select>`;
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent((c.cr && !c.v ? 'how to release ' : 'how to fillet ') + sp.name.replace(/\(.*?\)/g, ''))}`;
  let html = `<div class="card"><h2>Clean your catch</h2><div class="small muted" style="margin:-2px 0 8px">How to fillet and dress each fish, plus the gear that makes it easy.</div>${sel}</div>`;
  html += `<div class="card"><div class="hrow">${Art.fish(id, { w: 80, cls: 'spart' })}<div style="flex:1;min-width:0"><b>${esc(sp.name)}</b><div class="small muted">${esc(sp.grp || '')}</div></div></div>`;
  if (c.cr) html += `<div class="note" style="margin:10px 0">🔄 ${esc(c.cr)}</div>`;
  if (c.v) { if (c.note) html += `<div class="small" style="margin:8px 0 4px">${esc(c.note)}</div>`; html += c.v.map(ytCard).join(''); }
  if (c.tip) html += `<div class="small" style="margin:10px 0 0"><b>Tip:</b> ${esc(c.tip)}</div>`;
  html += `<div class="small" style="margin:10px 0 0"><a href="${search}" target="_blank" rel="noopener">More videos on YouTube ›</a> · <a href="#" data-tabgo="species">Size &amp; bag limits ›</a></div></div>`;
  if (c.v) {
    const gear = [...new Set([...BASE_GEAR.slice(0, 1), ...(c.g || []), ...BASE_GEAR.slice(1)])];
    html += `<div class="card"><h2>Recommended equipment</h2>${gear.map(k => { const g = GEAR[k]; return `<div class="gearrow"><div style="flex:1;min-width:0"><b>${esc(g.n)}</b><div class="small muted">${esc(g.why)}</div></div><a class="gearbuy" href="${SHOPS[shop].u(g.q)}" target="_blank" rel="noopener">Shop ›</a></div>`; }).join('')}
      <div class="small muted" style="margin-top:10px">Shop at <select id="cleanShop" style="width:auto;display:inline-block;padding:4px 8px">${Object.entries(SHOPS).map(([k, s]) => `<option value="${k}" ${k === shop ? 'selected' : ''}>${s.n}</option>`).join('')}</select></div>
      <div class="small muted" style="margin-top:6px">Links open a product search so you can compare prices. Local tackle shops carry most of this too.</div></div>`;
  }
  html += `<div class="card"><h2>Keep it fresh</h2><div class="small">• Ice fish right away, ideally in an ice-and-saltwater slurry.<br>• Clean them within a few hours, keeping the knife and board cold and clean.<br>• Many states require some fish to stay whole until you're off the water, so check the rules before filleting on the boat.<br>• Rinse fillets, pat them dry, and refrigerate or vacuum seal and freeze.</div></div>`;
  return html;
}
document.addEventListener('click', e => {
  const y = e.target.closest('[data-yt]'); if (!y || y.querySelector('iframe')) return;
  const id = y.dataset.yt;
  y.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="Fish cleaning video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
});
document.addEventListener('change', e => {
  if (e.target.id === 'cleanSel') { state.cleanSp = e.target.value; render(); }
  else if (e.target.id === 'cleanShop') { try { localStorage.setItem('ff.shop', JSON.stringify(e.target.value)); } catch (er) { } render(); }
});
function cleanCredits() {
  document.querySelectorAll('[data-ytcred]').forEach(el => {
    const id = el.dataset.ytcred; if (el.dataset.done) return; el.dataset.done = 1;
    fetch('https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=' + id).then(r => r.ok ? r.json() : null).then(j => {
      if (j) el.innerHTML = `${esc(j.title)} · <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">${esc(j.author_name)} on YouTube</a>`;
    }).catch(() => { });
  });
}
