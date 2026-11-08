# RetailX (Android POS)

Offline point-of-sale: register with barcode scan, products & stock, customers, sales history & refunds, reports, expenses, staff PIN login (admin / cashier), encrypted backup. Built on the RetailX app template (Expo SDK 58, SQLite, offline Ed25519 license).

## First run
Setup screen creates the store + owner (admin) PIN. Staff sign in with their own 4-digit PIN. Admin can add cashiers (Staff); cashiers can only sell and manage customers and see their own sales.

## License
Project code: `retailx-register`. One-time registration:
```bash
npm install --legacy-peer-deps
npm run license:project   # creates .license/ (KEEP PRIVATE KEY SAFE), writes the public key into src/license/config.ts
```
Paste the generated Hub JSON into the License Hub (Projects > Add). Features: pos.billing, pos.discount, pos.scan, inventory.manage, customers.manage, history.returns, reports.view, expenses.manage, staff.manage, print.receipts, backup.export. `max_users` in a license limits active staff accounts.

## Develop
`npx tsc --noEmit` · `npm test` · CI builds the APK (`.github/workflows/android-apk.yml`, release tag `apk-N`).
Optional release signing: set secrets ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD (see workflow). Never lose the keystore: updates and Google Sign-In depend on it.

Developed by RetailX Solution · 03286575000
