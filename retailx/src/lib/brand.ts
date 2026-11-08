// Per-app identity. `npm run new-app` rewrites this file (and app.json / permissions.json) for a new project.
// Everything that must be unique per app (database file, SecureStore keys, backup marker) is derived from here.
export const APP = {
  name: 'RetailX',
  slug: 'retailx',                 // lowercase, a-z0-9 only: used for SecureStore keys, backup file names, db marker
  dbName: 'retailx.db',
  languages: ['en'] as readonly ('en' | 'ur')[], // add 'ur' for Urdu (needs the Nastaliq font: see git history of fonts.ts)
};

// Company credit: shown in the app and at the bottom of every print / PDF / export (standing rule for all apps).
export const COMPANY = 'RetailX Solution';
export const COMPANY_PHONE = '03286575000';
export const CREDIT = `${COMPANY} · ${COMPANY_PHONE}`;
