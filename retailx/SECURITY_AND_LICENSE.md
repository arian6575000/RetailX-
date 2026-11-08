# Security & license notes (template)

## License (offline, Ed25519)
- `src/license/config.ts` holds `PROJECT_CODE` + `PUBLIC_KEY_HEX`. Until a valid 64-hex public key is present the app shows "build is missing its license key" (fail-closed).
- `npm run license:project` generates the keypair (`.license/<code>.keys.json`, git-ignored — back it up!), writes the Hub registration JSON, and fills `config.ts`.
- Device ID = hash(Android ID + model) → `XXXX-XXXX-XXXX-XXXX-XXXX`. Licenses are device-bound; a factory reset needs a new license.
- Clock-rollback guard (`<slug>` SecureStore `mpos_lastseen`), 3-day expiry warning, re-check on foreground.
- Hub-format keys (`MPOS-LIC-`, `RETAILX-LIC-`, `DPOS-LIC-`) are accepted; the signature, not the prefix, is trusted. A license with a different `project_code` is rejected.
- Offline licensing cannot be revoked remotely and cannot stop a determined person who patches the APK.

## App security
- PIN: salted + stretched hash in the Android Keystore; lockout (5 wrong → 30 s, doubling, max 1 h) survives app restarts. A 4-digit PIN is a small key space, so the lockout is the real protection.
- Screenshots / screen recording blocked (FLAG_SECURE), recent-apps preview blank.
- `allowBackup=false`; unused permissions blocked.
- Backups can be password-protected (XSalsa20-Poly1305). Restore validates the file (app marker, table allow-list, column allow-list) and is atomic.
- SecureStore keys are prefixed with the app slug, so several apps never collide.
