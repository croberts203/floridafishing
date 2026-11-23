// Saltwater rules for Georgia and the Carolinas (state waters). Checked 2026-11-23 against:
//  GA: coastalgadnr.org/limits · SC: SCDNR 2026-27 guide (eregulations.com/southcarolina, updated Aug 11 2026; red drum law effective Jul 1 2026)
//  NC: DMF Recreational Size and Bag Limits (effective Nov 1 2026). Rules change often — the app always links the agency page.
// closed: [[startMonth, startDay, endMonth, endDay]] like regs.js; latMax/latMin limit a closure to part of the coast.
const SE_REGS_CHECKED = '2026-11-23';
const SE_REGS = {
  GA: { agency: 'Georgia DNR Coastal Resources Division', url: 'https://coastalgadnr.org/limits', note: 'Georgia fishing license plus the free Saltwater Information Program (SIP) permit required.', sp: {
    redfish: { size: '14–23" TL (slot)', bag: '5 per person', season: 'Open year-round', notes: 'Gamefish — rod and reel only. Changing Jan 1, 2027 to 3 per person and a 15–24" slot.' },
    trout: { size: '14" TL minimum', bag: '15 per person', season: 'Open year-round' },
    flounder: { size: '12" TL minimum', bag: '15 per person', season: 'Open year-round' },
    sheepshead: { size: '10" FL minimum', bag: '15 per person', season: 'Open year-round' },
    blackdrum: { size: '14" TL minimum', bag: '15 per person', season: 'Open year-round' },
    cobia: { size: '36" FL minimum', bag: '1 per person, 6 per boat', season: 'Open Mar 1 – Oct 31', closed: [[11, 1, 2, 28]] },
    spanish: { size: '12" FL minimum', bag: '15 per person', season: 'Open year-round' },
    king: { size: '24" FL minimum', bag: '3 per person', season: 'Open year-round' },
    bluefish: { size: '12" FL minimum', bag: '15 per person', season: 'Open May 1 – Feb 28', closed: [[3, 1, 4, 30]] },
    tarpon: { size: '68" FL minimum', bag: '1 per person', season: 'Open year-round', notes: 'Release smaller tarpon in the water.' },
    tripletail: { size: '18" TL minimum', bag: '2 per person', season: 'Open year-round' },
    weakfish: { size: '13" TL minimum', bag: '1 per person', season: 'Open year-round' },
    striper: { size: '22" TL minimum (27" in the Savannah River)', bag: '2 per person', season: 'Open year-round' },
    mahi: { size: '20" FL minimum', bag: '10 per person, 54 per boat', season: 'Open year-round' },
  } },
  SC: { agency: 'South Carolina DNR', url: 'https://www.eregulations.com/southcarolina/fishing/finfish-size-catch-limits', note: 'Saltwater fishing license required age 16+. Gamefish caught on natural bait with hooks 4/0 or larger need non-offset, non-stainless circle hooks.', sp: {
    redfish: { size: '18–25" TL (slot)', bag: '1 per person, 2 per boat', season: 'Open year-round; no gigging Dec 1 – Feb 28', notes: 'New rules since Jul 1, 2026. Rod and reel or gig only; possession prohibited in federal waters.' },
    trout: { size: '14" TL minimum', bag: '10 per person', season: 'Open year-round; no gigging Dec 1 – Feb 28' },
    flounder: { size: '16" TL minimum', bag: '5 per person, 10 per boat', season: 'Open year-round' },
    sheepshead: { size: '14" TL minimum', bag: '10 per person, 30 per boat', season: 'Open year-round' },
    blackdrum: { size: '14–27" TL (slot)', bag: '5 per person', season: 'Open year-round' },
    cobia: { size: '36" FL minimum', bag: '1 per person; 3 per boat south of 32°31′ N, 6 per boat north of it', season: 'Closed May 1–31 in state waters south of 32°31′ N (around Beaufort/Hilton Head)', closed: [[5, 1, 5, 31]], latMax: 32.517 },
    spanish: { size: '12" FL minimum', bag: '15 per person', season: 'Open year-round' },
    king: { size: '24" FL minimum', bag: '3 per person', season: 'Open year-round' },
    bluefish: { size: 'None listed', bag: '5 per person (7 on for-hire boats)', season: 'Open year-round' },
    whiting: { size: 'None', bag: '50 per person combined with croaker and spot', season: 'Open year-round', notes: 'Hook and line only.' },
    tarpon: { size: '77" FL minimum', bag: '1 per person', season: 'Open year-round', notes: 'Rod and reel only.' },
    tripletail: { size: '18" TL minimum', bag: '3 per person, 9 per boat', season: 'Open year-round' },
    weakfish: { size: '12" TL minimum', bag: '1 per person', season: 'Open year-round' },
    striper: { size: '26" TL minimum (27" lower Savannah River)', bag: '3 per person (2 in lower Savannah River)', season: 'Closed Jun 16 – Sep 30 (except lower Savannah River)', closed: [[6, 16, 9, 30]] },
    mahi: { size: '20" FL minimum', bag: '10 per person, 54 per boat', season: 'Open year-round' },
  } },
  NC: { agency: 'N.C. Division of Marine Fisheries', url: 'https://deq.nc.gov/about/divisions/marine-fisheries/rules-proclamations-and-size-and-bag-limits/recreational-size-and', note: 'Coastal Recreational Fishing License required. Harvest of red drum, flounder, spotted seatrout, weakfish and striped bass must be reported to DMF.', sp: {
    redfish: { size: '18–27" TL (slot)', bag: '1 per person', season: 'Open year-round', notes: 'No gigging, spearing or gaffing.' },
    trout: { size: '14–20" TL, plus 1 over 26"', bag: '3 per person', season: 'Open (closes through June 30 after a major cold stun)', notes: 'DMF closes speckled trout after significant cold-stun events — check before keeping fish in winter.', verify: true },
    flounder: { size: '15" TL minimum', bag: '1 per person', season: '2026 season was Sep 1–14 only — closed now', closed: [[9, 15, 8, 31]], notes: 'All flounder species. Seasons are set each year by proclamation.' },
    sheepshead: { size: '14" TL minimum', bag: '5 per person', season: 'Open year-round' },
    blackdrum: { size: '14–25" TL (slot)', bag: '10 per person; may include 1 over 25"', season: 'Open year-round' },
    cobia: { size: 'Set by proclamation', bag: 'Set by proclamation', season: 'See the current DMF cobia proclamation', verify: true },
    spanish: { size: '12" FL minimum', bag: '15 per person', season: 'Open year-round' },
    king: { size: '24" FL minimum', bag: '3 per person', season: 'Open year-round' },
    bluefish: { size: 'None', bag: '5 per person (7 on for-hire boats)', season: 'Open year-round' },
    tarpon: { size: '—', bag: 'Unlawful to possess', season: 'Catch and release only' },
    weakfish: { size: '12" TL minimum', bag: '1 per person', season: 'Open year-round' },
    striper: { size: 'Ocean: 28–31" TL slot', bag: 'Ocean: 1 per person', season: 'Albemarle Sound area currently closed; inland and ocean rules differ — check DMF', verify: true },
    mahi: { size: 'None', bag: '10 per person, 54 per trip', season: 'Open year-round' },
    seabass: { size: '13" TL minimum', bag: '7 per person south of Cape Hatteras; 15 north (May 1 – Dec 31)', season: 'Open (north of Hatteras: May 1 – Dec 31)' },
  } },
};
function seClosed(rule, t, sp) {
  if (!rule || !rule.closed) return null;
  if (rule.latMax && sp && sp.lat != null && sp.lat > rule.latMax) return null;
  const d = new Date(t), md = (d.getMonth() + 1) * 100 + d.getDate();
  for (const [sm, sd, em, ed] of rule.closed) {
    const a = sm * 100 + sd, b = em * 100 + ed;
    if (a <= b ? (md >= a && md <= b) : (md >= a || md <= b)) return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][em]} ${ed}`;
  }
  return null;
}
