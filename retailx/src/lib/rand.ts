// Secure random bytes. expo-crypto is required lazily so pure logic (and Node tests) can import this file;
// tests call __setRandom(nacl.randomBytes).
let source: (n: number) => Uint8Array = (n) => require('expo-crypto').getRandomBytes(n);
export const randomBytes = (n: number) => source(n);
export const __setRandom = (f: (n: number) => Uint8Array) => { source = f; };
