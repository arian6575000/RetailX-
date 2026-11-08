import { AppError } from '../db/repo';

/** Maps a repo AppError to a dictionary key (err_<code>); unknown errors -> err_generic. */
export function errKey(e: unknown): { key: string; detail?: string } {
  if (e instanceof AppError) return { key: `err_${e.code}`, detail: e.detail };
  return { key: 'err_generic' };
}
