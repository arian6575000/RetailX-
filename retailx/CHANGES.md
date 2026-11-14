# RetailX update: licence fix + new UI

## Licence / Device ID (same system as DarziHub)
- `src/license/deviceId.ts`, `licenseCore.ts` (`formatAppDeviceId`), `licenseClient.ts`, `config.ts` (`DEVICE_PREFIX = "RetailX"`, `ACCEPT_LEGACY_DEVICE_ID = true`) now match DarziHub.
- Device ID is now `RetailX-XXXX-XXXX-XXXX`, different from DarziHub on the same phone. Old 20-hex licences keep working while `ACCEPT_LEGACY_DEVICE_ID` is true.
- New licences must be generated in the License Generator for the new `RetailX-...` ID (project `retailx-register`).
- `tests/license.test.ts` covers the new ID format.

## UI
- Violet theme (`lib/theme.ts`), gradient headers, card rows, round + buttons (`ui/kit.tsx`).
- Tabs: Home | History | (+) Sell | Reports | More, custom bar in `ui/TabBar.tsx`.
- New: Home dashboard, product grid (Sell), Cart screen, payment-method Checkout, Settings menu, PIN lock gradient, scanner frame, new icon/splash.
- Customers, Products, Expenses, Staff, Backup moved under `app/(tabs)/` as hidden routes (same URLs).
