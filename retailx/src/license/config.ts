// ====== PER-APP LICENSE SETTINGS (written by `npm run license:project`) ======
// PROJECT_CODE: same code as in the License Generator / Hub "Projects" list (must match permissions.json -> project.code).
// PUBLIC_KEY_HEX: the Ed25519 PUBLIC key (64 hex chars) of this project. Never put a private key here.
export const PROJECT_CODE = "retailx-register";
export const PUBLIC_KEY_HEX = "a471667979031ff1de92c8265162754f9c876f5f6c0cb6501785adeeefa67f9c";
// =======================================
// DEVICE_PREFIX: app name at the start of the Device ID ("RetailX-87A9-F285-E2DF"); unique per app so licenses never cross apps (same phone = different ID in DarziHub and RetailX).
export const DEVICE_PREFIX = "RetailX";
// Keep accepting licenses bound to the old app-independent 20-hex ID. Set false once all customers have new licenses.
export const ACCEPT_LEGACY_DEVICE_ID = true;
export const KEY_CONFIGURED = /^[0-9a-fA-F]{64}$/.test(PUBLIC_KEY_HEX);
