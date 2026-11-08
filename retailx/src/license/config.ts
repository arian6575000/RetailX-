// ====== PER-APP LICENSE SETTINGS (written by `npm run license:project`) ======
// PROJECT_CODE: same code as in the License Generator / Hub "Projects" list (must match permissions.json -> project.code).
// PUBLIC_KEY_HEX: the Ed25519 PUBLIC key (64 hex chars) of this project. Never put a private key here.
export const PROJECT_CODE = "retailx-register";
export const PUBLIC_KEY_HEX = "";
// =======================================
export const KEY_CONFIGURED = /^[0-9a-fA-F]{64}$/.test(PUBLIC_KEY_HEX);
