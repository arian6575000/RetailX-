// Placeholder icons (gradient + ring) so a fresh project builds. Replace assets/*.png with your artwork any time;
// this script only creates files that are missing (CI runs it before the build).
import fs from 'node:fs';
import sharp from 'sharp';

fs.mkdirSync('assets', { recursive: true });
const S = 1024;
const defs = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3E6BFF"/><stop offset="1" stop-color="#7A5CFA"/></linearGradient></defs>';
const mark = (fill, r = 240) => `<circle cx="512" cy="512" r="${r}" fill="none" stroke="${fill}" stroke-width="64"/><circle cx="512" cy="512" r="${r * 0.42}" fill="${fill}"/>`;
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${defs}${body}</svg>`);
const out = (name, body, size = S) => sharp(svg(body)).resize(size, size).png().toFile(`assets/${name}`);
const jobs = {
  'icon.png': `<rect width="${S}" height="${S}" fill="url(#g)"/>${mark('#fff')}`,
  'splash-icon.png': mark('#3E6BFF', 280),
  'android-icon-foreground.png': mark('#fff', 200),
  'android-icon-background.png': `<rect width="${S}" height="${S}" fill="url(#g)"/>`,
  'android-icon-monochrome.png': mark('#000', 200),
};
for (const [n, b] of Object.entries(jobs)) if (!fs.existsSync(`assets/${n}`)) await out(n, b);
if (!fs.existsSync('assets/favicon.png')) await out('favicon.png', jobs['icon.png'], 48);
console.log('icons ready');
