// Florida recreational regulations relevant to NE Florida (Nassau–St. Johns). Checked against FWC sources on 2026-11-19.
// closed: [[startMonth, startDay, endMonth, endDay]] (1-based, inclusive). Always confirm at MyFWC.com before keeping fish.
const REGS_CHECKED = '2026-11-19';
const REGS = {
  redfish: { size: '18–27" total length (slot)', bag: '1 per person, 4 per vessel', season: 'Open year-round', notes: 'Northeast management region. Hook-and-line only; no gigging, spearing or snatching.', url: 'https://myfwc.com/fishing/saltwater/recreational/red-drum/' },
  trout: { size: '15–19" total length (slot)', bag: '3 per person', season: 'Open year-round', notes: 'Northeast region rules in effect since Apr 1, 2026 — no over-slot fish allowed in this region.', url: 'https://myfwc.com/fishing/saltwater/recreational/spotted-seatrout/' },
  flounder: { size: '14" total length minimum', bag: '5 per person', season: 'Closed Oct 15 – Nov 30', closed: [[10, 15, 11, 30]], notes: 'Applies in state and federal waters off Florida (all flounder species).', url: 'https://myfwc.com/fishing/saltwater/recreational/flounder/' },
  blackdrum: { size: '14–24" total length (slot)', bag: '5 per person, may include one over 24"', season: 'Open year-round', notes: 'Snatching prohibited.', url: 'https://myfwc.com/fishing/saltwater/recreational/black-drum/' },
  sheepshead: { size: '12" total length minimum', bag: '8 per person; 50 per vessel in March & April', season: 'Open year-round', notes: 'State rules extend into federal waters.', url: 'https://myfwc.com/fishing/saltwater/recreational/sheepshead/' },
  pompano: { size: '11" fork length minimum', bag: '6 per person', season: 'Open year-round', notes: 'Hook and line, cast net, and beach or haul seine only.', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  whiting: { size: 'None', bag: 'Not individually regulated — up to 100 lb per person with a recreational license', season: 'Open year-round', notes: 'Southern kingfish is not individually regulated in Florida state waters.', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  bluefish: { size: '12" fork length minimum', bag: 'Check FWC — Atlantic limits were reduced', season: 'Open year-round', notes: 'Bag limit not confirmed in this app; verify before keeping.', url: 'https://myfwc.com/fishing/saltwater/recreational/' , verify: true },
  cobia: { size: '36" fork length minimum', bag: '1 per person or 2 per vessel, whichever is less', season: 'Open year-round', notes: 'Gulf and Atlantic state waters.', url: 'https://myfwc.com/fishing/saltwater/recreational/cobia/' },
  tarpon: { size: '—', bag: 'Catch and release only (one $50 harvest tag per year, only for a potential IGFA record)', season: 'Open year-round', notes: 'Tarpon over 40" must stay in the water during release.', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  spanish: { size: '12" fork length minimum', bag: '15 per person', season: 'Open year-round', notes: '', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  king: { size: '24" fork length minimum', bag: 'Atlantic: 2 per person (per FWC 2024 summary) — verify', season: 'Open year-round', notes: 'Federal rules apply beyond 3 nm.', url: 'https://myfwc.com/fishing/saltwater/recreational/', verify: true },
  tripletail: { size: '18" total length minimum', bag: '2 per person', season: 'Open year-round', notes: 'Hook and line only; no snatch hooks.', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  mahi: { size: '20" fork length minimum (Atlantic)', bag: '5 per person, 30 per private vessel (Atlantic)', season: 'Open year-round', notes: '', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  jack: { size: 'None', bag: 'Unregulated species', season: 'Open year-round', notes: '', url: 'https://myfwc.com/fishing/saltwater/recreational/' },
  reef: { size: 'Varies by species', bag: 'Varies — snapper/grouper aggregates', season: 'Several species have closed or very short seasons (e.g., red snapper, gag/black grouper)', notes: 'Too many species and changes to list here — check FWC/federal rules before every trip.', url: 'https://myfwc.com/fishing/saltwater/recreational/', verify: true },
  bass: { size: 'No minimum; only 1 may be 16" or longer', bag: '5 black bass per day', season: 'Open year-round', notes: 'Some lakes and Fish Management Areas have special rules.', url: 'https://myfwc.com/fishing/freshwater/regulations/general/' },
  bream: { size: 'None', bag: '50 panfish per day (combined: bluegill, redear, warmouth, stumpknocker, etc.)', season: 'Open year-round', notes: '', url: 'https://myfwc.com/fishing/freshwater/regulations/general/' },
  redear: { size: 'None', bag: '50 panfish per day (combined)', season: 'Open year-round', notes: '', url: 'https://myfwc.com/fishing/freshwater/regulations/general/' },
  'panfish-other': { size: 'None', bag: '50 panfish per day (combined)', season: 'Open year-round', notes: '', url: 'https://myfwc.com/fishing/freshwater/regulations/general/' },
  crappie: { size: 'None statewide', bag: '25 per day', season: 'Open year-round', notes: 'Some waters have special size limits.', url: 'https://myfwc.com/fishing/freshwater/regulations/general/' },
  shad: { size: 'None', bag: '10 per day (American, hickory, Alabama shad & blueback herring combined)', season: 'Open year-round', notes: 'Hook and line only.', url: 'https://myfwc.com/fishing/freshwater/regulations/general/' },
  catfish: { size: 'None statewide', bag: 'Nongame fish — no statewide bag limit in fresh water', season: 'Open year-round', notes: 'Special rules on some Fish Management Areas; verify.', url: 'https://myfwc.com/fishing/freshwater/regulations/general/', verify: true },
};
function regStatus(id, t) {
  const r = REGS[id]; if (!r || !r.closed) return { open: true };
  if (typeof WEB_BUILD !== 'undefined') { const st = natState(spot()); if (st && st !== 'FL') return { open: true }; }
  const d = new Date(t), md = (d.getMonth() + 1) * 100 + d.getDate();
  for (const [sm, sd, em, ed] of r.closed) {
    const a = sm * 100 + sd, b = em * 100 + ed;
    if (a <= b ? (md >= a && md <= b) : (md >= a || md <= b)) return { open: false, until: `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][em]} ${ed}` };
  }
  return { open: true };
}
function regJurisdiction(spot) {
  if (spot.water === 'fresh') return 'Florida freshwater rules (statewide)';
  if (spot.water === 'offshore') return 'Federal waters (beyond 3 nm in the Atlantic) — FWC rules shown where they extend; federal rules may be stricter';
  return 'Florida Atlantic state waters, Northeast Florida management regions';
}
