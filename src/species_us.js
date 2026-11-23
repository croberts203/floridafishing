// ===== Nationwide additions (website build) =====
// Regions: NE (Maine–NY), MA (NJ–NC), SA (SC–N/C Florida Atlantic), SF (S Florida & Keys), GULF, PS (S California),
// PN (C/N California, Oregon, Washington), AK, HI, GL (Great Lakes), FW (inland fresh water)
const REGION_LABEL = { NE: 'New England & New York', MA: 'Mid-Atlantic', SA: 'South Atlantic', SF: 'South Florida & Keys', GULF: 'Gulf of Mexico', PS: 'Southern California', PN: 'Pacific Northwest & N. California', AK: 'Alaska', HI: 'Hawaii', GL: 'Great Lakes', FW: 'Fresh water' };
function regionOf(lat, lng, water) {
  if (water === 'fresh') return 'FW';
  if (water === 'greatlakes') return 'GL';
  if (lng < -150 && lat < 23) return 'HI';
  if (lat > 51 || lng < -130) return 'AK';
  if (lng < -114) return lat < 34.5 ? 'PS' : 'PN';
  if (lat < 31 && lng < -81.9 && lng > -98) return 'GULF';
  if (lat < 27.5) return 'SF';
  if (lat < 35) return 'SA';
  if (lat < 40.5) return 'MA';
  return 'NE';
}
// Regions for the original (Jacksonville-built) saltwater species
const SALT_REGIONS = { trout: ['SA', 'GULF', 'SF', 'MA'], flounder: ['SA', 'GULF', 'MA'], redfish: ['SA', 'GULF', 'SF', 'MA'], blackdrum: ['SA', 'GULF', 'MA'], sheepshead: ['SA', 'GULF', 'SF', 'MA'], pompano: ['SA', 'GULF', 'SF'], whiting: ['SA', 'GULF', 'MA'], bluefish: ['NE', 'MA', 'SA', 'GULF'], cobia: ['SA', 'GULF', 'MA', 'SF'], tarpon: ['SA', 'GULF', 'SF'], spanish: ['SA', 'GULF', 'MA', 'SF'], jack: ['SA', 'GULF', 'SF'], tripletail: ['SA', 'GULF'], king: ['SA', 'GULF', 'MA', 'SF'], mahi: ['SA', 'GULF', 'SF', 'MA', 'HI'], reef: ['SA', 'GULF', 'SF', 'MA'], catfish: ['SA', 'GULF', 'MA'] };
// Freshwater latitude ranges for the original species
const FW_LAT = { bass: [24, 49], bream: [24, 50], redear: [24, 42], crappie: [24, 49], 'panfish-other': [24, 39], catfish: [24, 49], shad: [24, 49] };
SPECIES.forEach(s => { if (SALT_REGIONS[s.id]) s.regions = SALT_REGIONS[s.id]; if (FW_LAT[s.id]) s.lat = FW_LAT[s.id]; });

const T = (m, fb, hw) => ({ m, fb: fb || 0, hw: hw || 0 });
const fly0 = { r: 0, kit: '—', flies: [], tips: 'Not a practical fly target.' };
const US_SPECIES = [
  // --- Fresh water, nationwide ---
  { id: 'smallmouth', name: 'Smallmouth bass', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [33, 49], temp: [45, 60, 72, 82], tide: null, light: [1, .65, 1, .3], ps: .9, wt: 18, sight: .4,
    where: 'Rocky rivers, clear lakes and the Great Lakes shoreline — rock, current breaks and drop-offs.', bait: ['Tube jig', 'Ned rig', 'Jerkbait', 'Crayfish / minnows', 'Topwater walker'],
    tips: 'Rock and current. Spring pre-spawn and fall feed-up are best; summer fish go deeper or into current.',
    fly: { r: 3, kit: '6–7 wt, floating or sink-tip', flies: ['Clouser minnow', 'Crayfish pattern', 'Popper', 'Woolly bugger'], tips: 'Swing streamers through riffle tails; poppers at dawn on calm water.' } },
  { id: 'walleye', name: 'Walleye', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [35, 49], temp: [40, 55, 70, 80], tide: null, light: [1, .35, 1, .9], ps: .8, wt: 22, sight: .1,
    where: 'Rivers below dams in spring, then rock reefs, weed edges and points; Great Lakes basins in summer.', bait: ['Jig & minnow', 'Crawler harness', 'Crankbait (trolled)', 'Blade bait'],
    tips: 'Low light rules — dawn, dusk, night and cloudy or windy days. A "walleye chop" on the water helps.',
    fly: { r: 1, kit: '7 wt, sinking line', flies: ['Weighted streamer'], tips: 'Possible at night in shallow river runs.' } },
  { id: 'perch', name: 'Yellow perch', grp: 'Panfish', waters: ['fresh', 'greatlakes'], lat: [37, 49], temp: [38, 55, 70, 80], tide: null, light: [.9, .8, .9, .2], ps: .5, wt: 18, sight: .1,
    where: 'Weed edges, soft bottom and humps in lakes; schools in the Great Lakes; through the ice in winter.', bait: ['Minnows', 'Small jigs', 'Wax worms', 'Perch rig'],
    tips: 'Find the school and stay on it. Schools move — keep moving until you hit fish.',
    fly: { r: 2, kit: '4–5 wt', flies: ['Small streamer', 'Nymph'], tips: 'Slow-strip small streamers near the bottom.' } },
  { id: 'pike', name: 'Northern pike', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [39, 49], temp: [35, 50, 68, 78], tide: null, light: [.9, .8, .9, .3], ps: .7, wt: 20, sight: .4,
    where: 'Weedy bays, shallow backwaters (spring), weed edges and points.', bait: ['Spoon', 'Inline spinner', 'Large swimbait', 'Sucker minnow'],
    tips: 'Cool water. Shallow weedy bays right after ice-out; use a wire or heavy fluoro leader.',
    fly: { r: 3, kit: '8–9 wt, floating/intermediate, wire bite tippet', flies: ['Large bunny streamer', 'Deceiver', 'Diver'], tips: 'Big flies, steady strips, figure-eight at the boat.' } },
  { id: 'musky', name: 'Muskellunge', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [37, 49], temp: [40, 55, 75, 82], tide: null, light: [.9, .7, 1, .5], ps: .9, wt: 20, sight: .4,
    where: 'Large lakes and rivers — weed edges, rock bars and current breaks.', bait: ['Bucktail', 'Large glide bait', 'Topwater', 'Sucker rig'],
    tips: 'Fish of 10,000 casts. Moon phases and front changes trigger feeding; always figure-eight at the boat.',
    fly: { r: 2, kit: '10 wt, intermediate, wire bite tippet', flies: ['Large articulated streamer'], tips: 'Long casts, big flies, patient retrieves.' } },
  { id: 'rainbow', name: 'Rainbow trout & steelhead', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [33.5, 49], temp: [38, 50, 64, 72], tide: null, light: [.9, .7, .95, .3], ps: .6, wt: 18, sight: .4,
    where: 'Cold streams, tailwaters below dams, stocked lakes; steelhead in Great Lakes and Pacific tributaries.', bait: ['Spinner', 'PowerBait (stocked fish)', 'Small spoon', 'Drift-fished eggs or worms'],
    tips: 'Cold, oxygenated water. Watch hatch times; tailwater generation schedules change everything.',
    fly: { r: 3, kit: '4–6 wt (8 wt steelhead), floating', flies: ['Pheasant tail', 'Elk hair caddis', 'Parachute Adams', 'Woolly bugger', 'Egg pattern'], tips: 'Match the hatch; dead-drift nymphs under an indicator when nothing is rising.' } },
  { id: 'brown', name: 'Brown trout', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [32, 49], temp: [40, 52, 65, 75], tide: null, light: [1, .5, 1, .6], ps: .6, wt: 18, sight: .4,
    where: 'Cold streams and tailwaters; larger lakes and Great Lakes harbors in fall.', bait: ['Spinner', 'Stickbait', 'Live minnow (where legal)'],
    tips: 'Wary — low light, overcast and stained water are best. Big browns feed at night.',
    fly: { r: 3, kit: '5–6 wt, floating or sink-tip', flies: ['Streamers (sculpin)', 'Hare’s ear', 'Caddis', 'Hopper (summer)'], tips: 'Strip streamers on cloudy days; hoppers along grassy banks in summer.' } },
  { id: 'brook', name: 'Brook trout', grp: 'Freshwater', waters: ['fresh'], lat: [35, 49], temp: [38, 50, 62, 68], tide: null, light: [.9, .7, .9, .2], ps: .5, wt: 15, sight: .3,
    where: 'Small cold headwater streams and ponds in the Appalachians, Northeast and upper Midwest.', bait: ['Small spinner', 'Worm (where legal)'],
    tips: 'Stealth and small water. Many waters are fly or artificial-only — check rules.',
    fly: { r: 3, kit: '2–4 wt, short rod', flies: ['Royal Wulff', 'Small nymphs', 'Ants & beetles'], tips: 'Short, accurate casts; attractor dries work well.' } },
  { id: 'laketrout', name: 'Lake trout', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [41, 49], temp: [36, 45, 55, 62], tide: null, light: [.9, .8, .9, .3], ps: .4, wt: 22, sight: 0,
    where: 'Deep, cold lakes and the Great Lakes; shallow in spring and fall, deep in summer.', bait: ['Spoons trolled deep', 'Tube jig', 'Vertical jig'],
    tips: 'Follow the cold water — near the surface after ice-out, deep near the thermocline in summer.', fly: fly0 },
  { id: 'salmongl', name: 'Chinook & coho salmon (Great Lakes)', grp: 'Freshwater', waters: ['greatlakes'], lat: [41, 49], temp: [42, 50, 58, 66], tide: null, light: [1, .5, .9, .3], ps: .5, wt: 20, sight: .1,
    seasons: { GL: [1, 1, 2, 4, 6, 7, 8, 9, 10, 7, 3, 1] },
    where: 'Open lake trolling in summer; harbors, piers and river mouths in late summer and fall runs.', bait: ['Flasher & fly', 'Spoons (trolled)', 'Skein (river)'],
    tips: 'Find the temperature break. Fall runs bring fish to piers and rivers.',
    fly: { r: 2, kit: '8–9 wt, sink-tip', flies: ['Egg-sucking leech', 'Intruder'], tips: 'Swing flies in tributaries during the fall run.' } },
  { id: 'striperfw', name: 'Striped & hybrid bass (lakes)', grp: 'Freshwater', waters: ['fresh'], lat: [28, 41], temp: [50, 60, 75, 85], tide: null, light: [1, .5, 1, .6], ps: .6, wt: 20, sight: .3,
    where: 'Large reservoirs and big rivers, chasing shad schools; tailraces below dams.', bait: ['Live shad / herring', 'Bucktail', 'Swimbait', 'Topwater at dawn'],
    tips: 'Follow the bait and the birds. Generation flow below dams can turn them on.',
    fly: { r: 2, kit: '8–9 wt, intermediate', flies: ['Clouser', 'Shad pattern'], tips: 'Cast into surface blitzes.' } },
  { id: 'whitebass', name: 'White bass', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [28, 46], temp: [50, 58, 75, 84], tide: null, light: [1, .7, 1, .4], ps: .5, wt: 20, sight: .3,
    where: 'Spring spawning runs up rivers and creeks; schools in open reservoirs in summer.', bait: ['Small jig', 'Inline spinner', 'Slab spoon'],
    tips: 'The spring run is the easiest fishing — find the first hard bottom or riffle upstream.',
    fly: { r: 2, kit: '5–6 wt', flies: ['Small Clouser', 'Woolly bugger'], tips: 'Strip small baitfish patterns through current seams.' } },
  { id: 'carp', name: 'Common carp', grp: 'Freshwater', waters: ['fresh', 'greatlakes'], lat: [24, 49], temp: [50, 65, 80, 88], tide: null, light: [.8, .9, .8, .4], ps: .3, wt: 18, sight: .7,
    where: 'Shallow flats, backwaters and river edges; everywhere in the US.', bait: ['Sweet corn', 'Dough baits / boilies', 'Hair rig'],
    tips: 'Look for mudding or tailing fish on sunny flats. Quiet approach.',
    fly: { r: 3, kit: '6–7 wt, floating', flies: ['Hybrid carp fly', 'Crayfish', 'San Juan worm'], tips: 'Sight-cast to feeding fish — lead them a foot and let it sink.' } },

  // --- Northeast & Mid-Atlantic salt ---
  { id: 'striper', name: 'Striped bass', grp: 'Inshore', waters: ['inshore', 'surf', 'nearshore'], regions: ['NE', 'MA', 'PN'], temp: [45, 55, 68, 78], tide: T(.8, 0, 0), light: [1, .45, 1, .85], ps: .7, wt: 20, sight: .3,
    seasons: { NE: [0, 0, 1, 4, 8, 9, 7, 6, 8, 10, 8, 3], MA: [3, 3, 5, 8, 8, 6, 4, 4, 6, 8, 9, 7], PN: [3, 3, 5, 6, 7, 7, 7, 6, 6, 6, 5, 4] },
    where: 'Rips, jetties, beaches, estuaries and rocky shorelines — wherever moving water pushes bait.', bait: ['Bucktail jig', 'Live eels', 'SP minnow / swimmer', 'Clams & bunker chunks', 'Topwater pencil'],
    tips: 'Moving tide over structure, low light and night. Follow the bait (bunker, sand eels, herring).',
    fly: { r: 3, kit: '8–10 wt, intermediate or sinking', flies: ['Clouser', 'Deceiver', 'Sand eel', 'Bunker fly'], tips: 'Swing flies through rips on the moving tide; night fishing with dark flies.' } },
  { id: 'fluke', name: 'Summer flounder (fluke)', grp: 'Inshore', waters: ['inshore', 'surf', 'nearshore'], regions: ['NE', 'MA'], temp: [55, 62, 75, 82], tide: T(.7, 0, 0), light: [.8, .85, .8, .3], ps: .5, wt: 18, sight: .2,
    seasons: { NE: [0, 0, 0, 1, 6, 9, 9, 9, 7, 3, 0, 0], MA: [0, 0, 1, 4, 8, 9, 9, 9, 8, 4, 1, 0] },
    where: 'Inlets, channel edges, sandy bottom near structure; bays in early summer, ocean reefs later.', bait: ['Bucktail + Gulp', 'Squid & minnow strip', 'Drift rig'],
    tips: 'Drift with moving water; bounce the bottom. Bigger fish move offshore to reefs later in summer.',
    fly: { r: 2, kit: '7–8 wt, sinking line', flies: ['Weighted Clouser'], tips: 'Get it on the bottom and hop it.' } },
  { id: 'seabass', name: 'Black sea bass', grp: 'Nearshore', waters: ['nearshore', 'inshore'], regions: ['NE', 'MA', 'SA'], temp: [50, 58, 72, 80], tide: T(.4), light: [.85, .85, .85, .2], ps: .4, wt: 18, sight: 0,
    where: 'Rocks, wrecks and reefs; jetties and rock piles inshore in summer.', bait: ['Squid strips', 'Clam', 'Diamond jig', 'Hi-lo rig'],
    tips: 'Structure fish — anchor or drift tight to rocks and wrecks.', fly: fly0 },
  { id: 'tautog', name: 'Tautog (blackfish)', grp: 'Inshore', waters: ['inshore', 'nearshore'], regions: ['NE', 'MA'], temp: [45, 52, 65, 75], tide: T(.35), light: [.8, .9, .8, .1], ps: .4, wt: 18, sight: 0,
    seasons: { NE: [0, 0, 0, 6, 8, 5, 3, 3, 5, 9, 10, 4], MA: [4, 3, 4, 8, 8, 4, 3, 3, 5, 9, 10, 8] },
    where: 'Rock piles, jetties, bridge pilings and wrecks.', bait: ['Green crab', 'Asian crab', 'Tog jig'],
    tips: 'Slack-ish current makes it easier to hold bottom in the rocks; set the hook on the second tap.', fly: fly0 },
  { id: 'albie', name: 'False albacore & bonito', grp: 'Nearshore', waters: ['nearshore', 'surf'], regions: ['NE', 'MA', 'SA'], temp: [62, 66, 76, 82], tide: T(.6), light: [1, .9, .8, .1], ps: .3, wt: 16, sight: .8,
    seasons: { NE: [0, 0, 0, 0, 0, 0, 1, 4, 9, 10, 5, 0], MA: [0, 0, 0, 0, 1, 1, 1, 3, 7, 10, 9, 2], SA: [3, 3, 3, 3, 3, 2, 2, 2, 4, 6, 8, 6] },
    where: 'Fast-moving schools blitzing bait near inlets, points and beaches in fall.', bait: ['Epoxy jig', 'Small metal', 'Deadly Dick-style lure'],
    tips: 'Run-and-gun to blitzes. Small, fast lures matched to tiny bait.',
    fly: { r: 3, kit: '9–10 wt, intermediate', flies: ['Albie clouser', 'Surf candy', 'Bay anchovy'], tips: 'Get in front of the school; very fast strips.' } },
  { id: 'weakfish', name: 'Weakfish (gray trout)', grp: 'Inshore', waters: ['inshore', 'surf'], regions: ['MA', 'NE'], temp: [55, 62, 75, 82], tide: T(.7), light: [1, .5, 1, .8], ps: .5, wt: 18, sight: .2,
    where: 'Bays, inlets and channel edges, especially at night around lights.', bait: ['Soft-plastic shad', 'Bucktail', 'Squid strip'],
    tips: 'Dusk and night on moving tide.', fly: { r: 2, kit: '7–8 wt, intermediate', flies: ['Clouser', 'Shrimp fly'], tips: 'Fish lit docks at night.' } },
  { id: 'scup', name: 'Scup (porgy)', grp: 'Inshore', waters: ['inshore', 'nearshore'], regions: ['NE', 'MA'], temp: [55, 60, 72, 80], tide: T(.4), light: [.8, .9, .8, .1], ps: .3, wt: 18, sight: 0,
    seasons: { NE: [0, 0, 0, 0, 7, 9, 9, 9, 8, 5, 0, 0], MA: [0, 0, 0, 2, 7, 9, 9, 9, 8, 6, 2, 0] },
    where: 'Hard bottom, rocks and piers in summer.', bait: ['Squid', 'Clam', 'Small hooks'], tips: 'Great family fishing from piers.', fly: fly0 },

  // --- South Florida, Keys & Gulf ---
  { id: 'snook', name: 'Snook', grp: 'Inshore', waters: ['inshore', 'surf'], regions: ['SF', 'GULF'], latMax: 29.5, temp: [62, 72, 86, 92], tide: T(.85, -.1, 0), light: [1, .5, 1, .85], ps: .6, wt: 15, sight: .6,
    seasons: { SF: [4, 4, 6, 8, 9, 9, 8, 8, 8, 9, 7, 5], GULF: [3, 3, 5, 8, 9, 9, 8, 8, 8, 9, 6, 4] },
    where: 'Mangrove shorelines, docks with lights, passes, inlets and beach troughs.', bait: ['Live pilchards / shrimp', 'Swimbait', 'Jerkbait', 'Topwater at dawn'],
    tips: 'Moving tide around structure; night around dock lights. Cold-sensitive — protect them in cold snaps.',
    fly: { r: 3, kit: '8–9 wt, floating/intermediate, 30–40 lb bite', flies: ['Glass minnow', 'Snook toad', 'Deceiver', 'Gurgler'], tips: 'Swing flies through dock-light shadow lines on the outgoing tide.' } },
  { id: 'bonefish', name: 'Bonefish', grp: 'Inshore', waters: ['inshore'], regions: ['SF', 'HI'], temp: [70, 74, 86, 92], tide: T(.6, .3, 0), light: [.6, 1, .6, 0], ps: .4, wt: 15, sight: 1,
    seasons: { SF: [5, 6, 8, 9, 9, 8, 7, 7, 8, 9, 8, 6], HI: [7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 7, 7] },
    where: 'Shallow sand and grass flats on a rising tide (Keys, Biscayne Bay; Hawaii flats).', bait: ['Live shrimp', 'Bonefish jig'],
    tips: 'Sun high, moderate wind and a rising tide for tailing fish. Stealth is everything.',
    fly: { r: 3, kit: '7–8 wt, floating, 10–12 lb tippet', flies: ['Gotcha', 'Crazy Charlie', 'Bonefish bitter', 'Small crab'], tips: 'Lead the fish, let it settle, short strips when it turns.' } },
  { id: 'permit', name: 'Permit', grp: 'Inshore', waters: ['inshore', 'nearshore'], regions: ['SF'], temp: [70, 75, 86, 92], tide: T(.6, .2, 0), light: [.6, 1, .6, .1], ps: .4, wt: 15, sight: 1,
    where: 'Keys flats, channel edges and nearshore wrecks.', bait: ['Live crab', 'Bucktail jig'],
    tips: 'Wrecks in spring are the most consistent; flats fish need sun and patience.',
    fly: { r: 3, kit: '9–10 wt, floating', flies: ['Merkin', 'Raghead crab', 'EP crab'], tips: 'Crab flies dropped in front, then let it sink and stop.' } },
  { id: 'mangrove', name: 'Mangrove (gray) snapper', grp: 'Inshore', waters: ['inshore', 'nearshore'], regions: ['SF', 'GULF', 'SA'], temp: [65, 72, 86, 92], tide: T(.6), light: [.9, .7, 1, .8], ps: .4, wt: 18, sight: .2,
    where: 'Docks, bridges, mangroves, reefs and wrecks.', bait: ['Live shrimp', 'Pilchards', 'Cut bait on light fluoro'],
    tips: 'Leader-shy — go light. Night bites around bridges in summer.',
    fly: { r: 2, kit: '7–8 wt, intermediate', flies: ['Small baitfish', 'Shrimp'], tips: 'Chum lightly and drift the fly back.' } },

  // --- Pacific coast ---
  { id: 'calico', name: 'Calico & sand bass', grp: 'Nearshore', waters: ['nearshore', 'inshore'], regions: ['PS'], temp: [58, 64, 72, 78], tide: T(.5), light: [1, .7, .9, .3], ps: .4, wt: 18, sight: .3,
    seasons: { PS: [2, 2, 3, 5, 8, 9, 10, 10, 8, 6, 3, 2] },
    where: 'Kelp beds, rocky reefs and breakwaters.', bait: ['Swimbait', 'Live anchovy / sardine', 'Surface iron'],
    tips: 'Warm water and bait in the kelp. Summer spawn aggregations for sand bass.',
    fly: { r: 2, kit: '8 wt, sinking', flies: ['Anchovy fly', 'Clouser'], tips: 'Count it down along the kelp edge.' } },
  { id: 'yellowtail', name: 'Yellowtail', grp: 'Offshore', waters: ['nearshore', 'offshore'], regions: ['PS'], temp: [60, 64, 72, 78], tide: T(.4), light: [1, .8, .8, .1], ps: .3, wt: 18, sight: .3,
    seasons: { PS: [2, 2, 4, 6, 8, 9, 9, 9, 8, 6, 3, 2] },
    where: 'Islands, kelp paddies, offshore banks.', bait: ['Live sardine / mackerel', 'Yo-yo iron', 'Surface iron'], tips: 'Find paddies and bait.', fly: fly0 },
  { id: 'calhalibut', name: 'California halibut', grp: 'Inshore', waters: ['inshore', 'surf', 'nearshore'], regions: ['PS', 'PN'], temp: [56, 60, 70, 76], tide: T(.6), light: [.9, .8, .8, .2], ps: .4, wt: 18, sight: .2,
    where: 'Sandy bays, harbors and the surf line.', bait: ['Live anchovy / sardine', 'Swimbait on the bottom'], tips: 'Moving water over sand near structure.',
    fly: { r: 2, kit: '8 wt, sinking', flies: ['Clouser', 'Sand dab pattern'], tips: 'Slow strips along the bottom.' } },
  { id: 'surfperch', name: 'Surfperch', grp: 'Surf', waters: ['surf'], regions: ['PS', 'PN'], temp: [50, 55, 65, 72], tide: T(.6, .4, 0), light: [.9, .85, .85, .2], ps: .3, wt: 20, sight: .1,
    seasons: { PS: [8, 8, 9, 8, 6, 5, 5, 5, 5, 6, 7, 8], PN: [6, 6, 7, 8, 8, 7, 6, 6, 6, 6, 6, 6] },
    where: 'Sandy beaches — troughs and rip edges.', bait: ['Sand crabs', 'Gulp sandworm', 'Grub on a Carolina rig'], tips: 'Incoming tide into the troughs.',
    fly: { r: 2, kit: '7 wt, sinking, stripping basket', flies: ['Clouser', 'Sand crab fly'], tips: 'Strip short and slow in the trough.' } },
  { id: 'rockfish', name: 'Rockfish', grp: 'Nearshore', waters: ['nearshore', 'inshore'], regions: ['PS', 'PN', 'AK'], temp: [44, 48, 60, 68], tide: T(.4), light: [.9, .9, .9, .2], ps: .3, wt: 18, sight: 0,
    where: 'Rocky reefs, jetties and kelp.', bait: ['Shrimp fly rig', 'Swimbait', 'Squid strip'], tips: 'Depth limits and closed areas are common — check rules.', fly: { r: 2, kit: '7–8 wt, sinking', flies: ['Clouser'], tips: 'Kelp-edge fishing works.' } },
  { id: 'lingcod', name: 'Lingcod', grp: 'Nearshore', waters: ['nearshore'], regions: ['PS', 'PN', 'AK'], temp: [44, 48, 58, 65], tide: T(.4), light: [.9, .9, .9, .2], ps: .3, wt: 18, sight: 0,
    where: 'Rocky reefs and pinnacles.', bait: ['Large swimbait', 'Leadhead with grub', 'Live rockfish (where legal)'], tips: 'Seasons vary by state.', fly: fly0 },
  { id: 'salmonpac', name: 'Pacific salmon (king, coho)', grp: 'Nearshore', waters: ['nearshore', 'inshore', 'fresh'], regions: ['PN', 'AK'], temp: [44, 48, 56, 62], tide: T(.6, .2, 0), light: [1, .5, .9, .2], ps: .5, wt: 18, sight: .1,
    seasons: { PN: [2, 3, 3, 4, 5, 7, 8, 9, 9, 6, 3, 2], AK: [0, 0, 0, 1, 5, 9, 10, 9, 6, 2, 0, 0] },
    where: 'Ocean and bays in summer, then river mouths and rivers on the runs.', bait: ['Herring (trolled)', 'Flasher & hoochie', 'Spinner (river)'], tips: 'Seasons are set by fishery and change yearly.',
    fly: { r: 2, kit: '8–9 wt, sink-tip', flies: ['Clouser', 'Intruder'], tips: 'Swing flies for coho in rivers.' } },
  { id: 'pachalibut', name: 'Pacific halibut', grp: 'Offshore', waters: ['nearshore', 'offshore'], regions: ['AK', 'PN'], temp: [38, 42, 52, 58], tide: T(.5, 0, 0), light: [.9, .9, .9, .5], ps: .3, wt: 18, sight: 0,
    seasons: { AK: [0, 0, 1, 3, 7, 9, 9, 8, 5, 1, 0, 0], PN: [0, 0, 0, 0, 7, 8, 7, 5, 3, 0, 0, 0] },
    where: 'Sandy and gravel bottom near drop-offs.', bait: ['Herring or octopus on a circle hook', 'Large jig'], tips: 'Fish slack tides — big tides make holding bottom hard.', fly: fly0 },

  // --- Hawaii ---
  { id: 'ulua', name: 'Ulua & trevally', grp: 'Nearshore', waters: ['surf', 'nearshore', 'inshore'], regions: ['HI'], temp: [72, 76, 82, 86], tide: T(.6), light: [1, .7, 1, .8], ps: .3, wt: 20, sight: .4,
    where: 'Shoreline ledges, reefs and harbors.', bait: ['Eel / octopus (slide-bait)', 'Popper', 'Live bait'], tips: 'Night slide-baiting for the big ones.',
    fly: { r: 2, kit: '9–10 wt', flies: ['Baitfish', 'Popper'], tips: 'Small papio on the flats with baitfish flies.' } },
];
SPECIES.push(...US_SPECIES);

// Season factor by region; Jacksonville-built species reuse their curve in the South Atlantic and Gulf.
function seasonFactor(sp, region, month) {
  if (sp.seasons && sp.seasons[region]) return sp.seasons[region][month] / 10;
  if (sp.season && (region === 'SA' || region === 'GULF' || region === 'SF')) return Math.max(.3, sp.season[month] / 10);
  return 0.85; // let water temperature decide
}
function speciesFits(sp, spot) {
  if (!sp.waters.includes(spot.water)) return false;
  const lat = spot.lat, lng = spot.lng;
  if (spot.water === 'fresh' || spot.water === 'greatlakes') {
    if (spot.water === 'greatlakes' && !['smallmouth', 'walleye', 'perch', 'pike', 'musky', 'rainbow', 'brown', 'laketrout', 'salmongl', 'whitebass', 'carp'].includes(sp.id)) return false;
    if (sp.lat && lat != null && (lat < sp.lat[0] || lat > sp.lat[1])) return false;
    if (sp.id === 'shad' && lng != null && lng > -117 && lng < -84) return false; // coastal rivers only
    if (sp.regions && !sp.regions.includes(regionOf(lat, lng, 'inshore'))) return false; // e.g. Pacific salmon rivers
    return true;
  }
  const reg = regionOf(lat, lng, spot.water);
  if (sp.regions && !sp.regions.includes(reg)) return false;
  if (sp.latMax && lat > sp.latMax) return false;
  if (sp.id === 'striper' && reg === 'PN' && lat > 44) return false; // West Coast stripers: SF Bay to Oregon
  if (!sp.regions) return false;
  return true;
}

// State fishing regulation sites (official agencies). Saltwater links from NOAA Fisheries' state list where available.
const STATE_REGS = {
  AL: ['Alabama', 'https://www.outdooralabama.com/fishing'], AK: ['Alaska', 'http://www.adfg.alaska.gov/index.cfm?adfg=fishingSport.main'], AZ: ['Arizona', 'https://www.azgfd.com/'], AR: ['Arkansas', 'https://www.agfc.com/en/'],
  CA: ['California', 'https://www.wildlife.ca.gov/Fishing'], CO: ['Colorado', 'https://cpw.state.co.us/'], CT: ['Connecticut', 'https://portal.ct.gov/deep/fishing'], DE: ['Delaware', 'https://dnrec.alpha.delaware.gov/fish-wildlife/'],
  FL: ['Florida', 'https://myfwc.com/fishing/'], GA: ['Georgia', 'https://georgiawildlife.com/', 'http://coastalgadnr.org/RecreationalFishing'], HI: ['Hawaii', 'http://dlnr.hawaii.gov/dar/fishing/'], ID: ['Idaho', 'https://idfg.idaho.gov/fish'],
  IL: ['Illinois', 'https://dnr.illinois.gov/'], IN: ['Indiana', 'https://www.in.gov/dnr/fish-and-wildlife/'], IA: ['Iowa', 'https://www.iowadnr.gov/'], KS: ['Kansas', 'https://ksoutdoors.com/'],
  KY: ['Kentucky', 'https://fw.ky.gov/Pages/default.aspx'], LA: ['Louisiana', 'https://www.wlf.louisiana.gov/'], ME: ['Maine', 'https://www.maine.gov/IFW/', 'http://www.maine.gov/dmr/recreational-fishing/index.html'], MD: ['Maryland', 'http://dnr.maryland.gov/Fisheries/Pages/default.aspx'],
  MA: ['Massachusetts', 'https://www.mass.gov/orgs/division-of-fisheries-and-wildlife', 'http://www.mass.gov/eea/agencies/dfg/dmf/recreational-fishing/'], MI: ['Michigan', 'https://www.michigan.gov/dnr/'], MN: ['Minnesota', 'https://www.dnr.state.mn.us/fishwildlife/index.html'], MS: ['Mississippi', 'https://www.mdwfp.com/', 'http://www.dmr.ms.gov/recreational-fishing'],
  MO: ['Missouri', 'https://mdc.mo.gov/'], MT: ['Montana', 'https://fwp.mt.gov/'], NE: ['Nebraska', 'https://outdoornebraska.gov/'], NV: ['Nevada', 'https://www.ndow.org/'],
  NH: ['New Hampshire', 'https://www.wildlife.nh.gov/', 'https://www.wildlife.nh.gov/saltwater-fisheries-new-hampshire/recreational-saltwater-fishing'], NJ: ['New Jersey', 'https://dep.nj.gov/njfw/', 'http://www.nj.gov/dep/fgw/marfhome.htm'], NM: ['New Mexico', 'https://wildlife.dgf.nm.gov/'], NY: ['New York', 'http://www.dec.ny.gov/outdoor/fishing.html'],
  NC: ['North Carolina', 'https://www.ncwildlife.org/', 'https://deq.nc.gov/about/divisions/marine-fisheries'], ND: ['North Dakota', 'https://gf.nd.gov/'], OH: ['Ohio', 'https://wildlife.ohiodnr.gov/'], OK: ['Oklahoma', 'https://www.wildlifedepartment.com/'],
  OR: ['Oregon', 'https://myodfw.com/fishing'], PA: ['Pennsylvania', 'https://www.fishandboat.com/Pages/default.aspx'], RI: ['Rhode Island', 'https://www.dem.ri.gov/'], SC: ['South Carolina', 'http://www.dnr.sc.gov/fishing.html'],
  SD: ['South Dakota', 'https://gfp.sd.gov/'], TN: ['Tennessee', 'https://www.tn.gov/twra/'], TX: ['Texas', 'https://tpwd.texas.gov/fishboat/fish/'], UT: ['Utah', 'https://wildlife.utah.gov/'],
  VT: ['Vermont', 'https://www.vtfishandwildlife.com/'], VA: ['Virginia', 'https://dwr.virginia.gov/', 'http://www.mrc.virginia.gov/recreational.shtm'], WA: ['Washington', 'http://wdfw.wa.gov/fishing/'], WV: ['West Virginia', 'https://www.wvdnr.gov/'],
  WI: ['Wisconsin', 'https://dnr.wi.gov/'], WY: ['Wyoming', 'https://wgfd.wyo.gov/'], DC: ['Washington, DC', 'https://doee.dc.gov/'],
};

// Habitat notes that read right outside Jacksonville
const GENERIC_WHERE = {
  trout: 'Grass flats, creek mouths, channel edges and deeper holes in winter.', flounder: 'Inlets, jetties, docks and creek mouths over sand or mud; fall runs toward the inlets.',
  redfish: 'Oyster bars, marsh edges and flats; big fish at inlets, jetties and the surf in fall.', blackdrum: 'Bridges, jetties, docks and channel edges.',
  sheepshead: 'Pilings, jetties, docks and reefs — structure with barnacles.', pompano: 'Beach troughs and sandbar edges; Gulf passes.', whiting: 'Beach troughs close to shore.',
  bluefish: 'Beaches, inlets and bays where bait is pushed.', cobia: 'Beaches during spring migration, buoys, wrecks and around rays.', tarpon: 'Passes, beaches with bait pods, river mouths and bridges.',
  spanish: 'Beaches, piers and inlets near bait schools.', jack: 'Rivers, inlets and bays busting bait.', tripletail: 'Crab-trap buoys, markers and floating debris.',
  king: 'Nearshore reefs, piers and bait schools.', mahi: 'Weed lines and floating debris offshore.', reef: 'Nearshore and offshore reefs and wrecks.', catfish: 'River channels, bridges and holes.',
};
