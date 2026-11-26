// Builds tackle/index.html from tackle/src/ (run: node tackle/build.js). Species come from the
// Fish Bite Forecast sources (src/species.js + src/species_us.js) so both apps always agree.
// Usage: node tackle/build.js [outDir]   (outDir defaults to tackle/)
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname, root = path.join(here, '..'), out = process.argv[2] || here;
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/species.js'), 'utf8') + '\n;this.S=SPECIES;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/species_us.js'), 'utf8'), ctx);
const species = ctx.S.map(s => ({ id: s.id, n: s.name, g: s.grp || '', w: s.waters || [], r: s.regions || null, b: s.bait || [], f: (s.fly && s.fly.flies) || [] }));
const src = f => fs.readFileSync(path.join(here, 'src', f), 'utf8');
const html = src('app.html').split('/*SCANNER*/').join(src('scanner.js')).split('/*SPECIES*/').join(JSON.stringify(species))
  .split('/*FLYSLUG*/').join(src('flyslugs.json').trim()).split('/*BRANDS*/').join(src('brands.js'));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('tackle/index.html', html.length, 'bytes,', species.length, 'species');
