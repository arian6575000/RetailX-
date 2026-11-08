// Turn this template into a new app:
//   node tools/new-app.mjs --name "RetailX" --slug retailx --package com.retailx.app --code retailx-register [--no-urdu] [--color "#0A6CFF"]
// Rewrites: src/lib/brand.ts, app.json, package.json, src/license/{permissions.json,config.ts}, src/lib/theme.ts (primary color), and
// (with --no-urdu) fonts.ts + the Urdu font dependency. Run it ONCE on a fresh copy, then `npm install && npm run license:project`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const has = (k) => args.includes('--' + k);
const name = get('name'), slug = get('slug'), pkg = get('package'), code = get('code') || slug;
const fail = (m) => { console.error('new-app: ' + m); process.exit(1); };
if (!name || !slug || !pkg) fail('required: --name "My App" --slug myapp --package com.company.myapp [--code project-code] [--no-urdu] [--color "#3E6BFF"]');
if (!/^[a-z][a-z0-9]*$/.test(slug)) fail('--slug must be lowercase letters/digits only (it prefixes SecureStore keys)');
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg)) fail('--package must look like com.company.app (lowercase)');
if (!/^[a-z0-9][a-z0-9-]*$/.test(code)) fail('--code must be lowercase letters, digits and dashes');

const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(root, f), s);
const sub = (f, re, to) => { const s = rd(f); if (!re.test(s)) fail(`pattern not found in ${f}: ${re}`); wr(f, s.replace(re, to)); };
const q = JSON.stringify;

sub('src/lib/brand.ts', /name: '[^']*',/, `name: ${q(name).replace(/^"|"$/g, "'")},`);
sub('src/lib/brand.ts', /slug: '[^']*',/, `slug: '${slug}',`);
sub('src/lib/brand.ts', /dbName: '[^']*',/, `dbName: '${slug}.db',`);
if (has('no-urdu')) sub('src/lib/brand.ts', /languages: \[[^\]]*\] as readonly \('en' \| 'ur'\)\[\],[^\n]*/, "languages: ['en'] as readonly ('en' | 'ur')[], // add 'ur' for Urdu (needs the Nastaliq font: see git history of fonts.ts)");

const app = JSON.parse(rd('app.json'));
app.expo.name = name; app.expo.slug = slug; app.expo.scheme = slug;
app.expo.ios.bundleIdentifier = pkg; app.expo.android.package = pkg;
if (get('color')) { app.expo.android.adaptiveIcon.backgroundColor = get('color'); }
wr('app.json', JSON.stringify(app, null, 2) + '\n');

const pj = JSON.parse(rd('package.json')); pj.name = slug;
if (has('no-urdu')) delete pj.dependencies['@expo-google-fonts/noto-nastaliq-urdu'];
wr('package.json', JSON.stringify(pj, null, 2) + '\n');
if (has('no-urdu')) wr('src/lib/fonts.ts', "// No custom fonts in this app.\nexport function useAppFonts(): [boolean, Error | null] { return [true, null]; }\n");

const perm = JSON.parse(rd('src/license/permissions.json'));
perm.project.name = name; perm.project.code = code;
wr('src/license/permissions.json', JSON.stringify(perm, null, 2) + '\n');
sub('src/license/config.ts', /export const PROJECT_CODE = "[^"]*";/, `export const PROJECT_CODE = ${q(code)};`);
if (get('color')) sub('src/lib/theme.ts', /primary: '#[0-9a-fA-F]{6}',/, `primary: '${get('color')}',`);

console.log(`\nNew app set up: ${name}  (slug ${slug}, package ${pkg}, license project code ${code})\nNext:\n  1. npm install --legacy-peer-deps\n  2. replace assets/*.png with your icons (or run node scripts/make-icons.mjs for placeholders)\n  3. edit src/license/permissions.json, then npm run license:project  (creates keys + Hub JSON, writes the public key)\n  4. npm test && npx tsc --noEmit\n`);
