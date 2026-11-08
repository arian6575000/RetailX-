// Pure PIN hashing (no native modules): salted + stretched. Used by the device PIN (lock.ts) and by apps with staff PINs.
import nacl from 'tweetnacl';
import { APP } from './brand';
import { randomBytes } from './rand';

export const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export const newSalt = () => hex(randomBytes(16));

export function stretch(pin: string, salt: string): string {
  let h = nacl.hash(new TextEncoder().encode(`${APP.slug}-pin-v2:${salt}:${pin}`));
  for (let i = 0; i < 3000; i++) h = nacl.hash(h);
  return hex(h);
}
/** Constant-time string compare. */
export const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
