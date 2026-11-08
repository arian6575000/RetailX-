// PIN lock. Hash + lockout state live in the Android Keystore (expo-secure-store).
// - salted, stretched hash (the 4-digit keyspace is tiny, so the real protection is the persisted lockout below)
// - lockout survives app restarts / force-close
// - optional biometric unlock
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuth from 'expo-local-authentication';
import { APP } from './brand';
import { newSalt, same, stretch } from './pinHash';

const P = APP.slug;
const KEY = `${P}_pin_hash`, SALT = `${P}_pin_salt`, VER = `${P}_pin_v`, FAILS = `${P}_pin_fails`, BIO = `${P}_bio`;
const O = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const get = (k: string) => SecureStore.getItemAsync(k, O);
const set = (k: string, v: string) => SecureStore.setItemAsync(k, v, O);
const del = (k: string) => SecureStore.deleteItemAsync(k, O);
const legacyHash = (pin: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
export async function hasPin(): Promise<boolean> {
  try { return !!(await get(KEY)); } catch { return false; }
}
export async function setPin(pin: string) {
  const salt = newSalt();
  await set(SALT, salt); await set(KEY, stretch(pin, salt)); await set(VER, '2');
  await resetFails();
}
export async function removePin() {
  for (const k of [KEY, SALT, VER, FAILS, BIO]) { try { await del(k); } catch { /* ignore */ } }
}

// ---- lockout ----
type Fails = { count: number; until: number };
async function loadFails(): Promise<Fails> {
  try { const s = await get(FAILS); if (s) { const f = JSON.parse(s); return { count: +f.count || 0, until: +f.until || 0 }; } } catch { /* ignore */ }
  return { count: 0, until: 0 };
}
const resetFails = () => set(FAILS, JSON.stringify({ count: 0, until: 0 }));
const waitFor = (count: number) => (count < 5 ? 0 : Math.min(3600, 30 * 2 ** (count - 5))); // seconds
export async function lockState(): Promise<{ count: number; waitSec: number }> {
  const f = await loadFails();
  return { count: f.count, waitSec: Math.max(0, Math.ceil((f.until - Date.now()) / 1000)) };
}

export type PinResult = { ok: boolean; waitSec: number; count: number };
export async function checkPin(pin: string): Promise<PinResult> {
  const f = await loadFails();
  if (f.until > Date.now()) return { ok: false, waitSec: Math.ceil((f.until - Date.now()) / 1000), count: f.count };
  const [salt, h, ver] = await Promise.all([get(SALT), get(KEY), get(VER)]);
  let ok = false;
  if (h) {
    if (ver === '2') ok = same(stretch(pin, salt || ''), h);
    else if (same(await legacyHash(pin, salt || ''), h)) { ok = true; await setPin(pin); } // upgrade old hash silently
  }
  if (ok) { await resetFails(); return { ok: true, waitSec: 0, count: 0 }; }
  const count = f.count + 1, w = waitFor(count);
  await set(FAILS, JSON.stringify({ count, until: w ? Date.now() + w * 1000 : 0 }));
  return { ok: false, waitSec: w, count };
}
export async function verifyPin(pin: string): Promise<boolean> { return (await checkPin(pin)).ok; }

// ---- biometric ----
export async function biometricAvailable(): Promise<boolean> {
  try { return (await LocalAuth.hasHardwareAsync()) && (await LocalAuth.isEnrolledAsync()); } catch { return false; }
}
export async function biometricEnabled(): Promise<boolean> {
  try { return (await get(BIO)) === '1' && (await hasPin()); } catch { return false; }
}
export const setBiometric = (on: boolean) => set(BIO, on ? '1' : '0');
export async function biometricUnlock(prompt: string): Promise<boolean> {
  try {
    const r = await LocalAuth.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: true, cancelLabel: 'PIN' });
    if (r.success) await resetFails();
    return r.success;
  } catch { return false; }
}

// ---- helpers for apps with several PINs (staff accounts): the app stores {salt, hash} per user and shares ONE lockout counter ----
export const hashPinWithSalt = (pin: string, salt: string) => stretch(pin, salt);
/** Call before checking a staff PIN: returns a ready PinResult when still locked out, else null. */
export async function lockoutGate(): Promise<PinResult | null> {
  const f = await loadFails();
  return f.until > Date.now() ? { ok: false, waitSec: Math.ceil((f.until - Date.now()) / 1000), count: f.count } : null;
}
/** Record the outcome of a staff PIN attempt and return the PinResult to show. */
export async function lockoutRecord(ok: boolean): Promise<PinResult> {
  if (ok) { await resetFails(); return { ok: true, waitSec: 0, count: 0 }; }
  const f = await loadFails(); const count = f.count + 1, w = waitFor(count);
  await set(FAILS, JSON.stringify({ count, until: w ? Date.now() + w * 1000 : 0 }));
  return { ok: false, waitSec: w, count };
}
