// PBKDF2-SHA256 hash of the admin password: pbkdf2$<iterations>$<saltHex>$<hashHex>.
// Generate a new one with `node scripts/hash-password.mjs`. The code is public on GitHub Pages,
// so a slow salted hash is used to make guessing the password from it impractical.
export const ADMIN_PASSWORD_HASH =
  'pbkdf2$600000$827db6a0f6952343dd6ca9ed8b82ac43$055d83b5c226b4ba7f23c1a86a6de1a1393ae3e246157cdcfadb4cf25794dcc4';

export const ADMIN_AUTO_LOCK_MS = 15 * 60 * 1000;

export function getEffectivePasswordHash(): string {
  const envHash = (import.meta.env.VITE_ADMIN_PASSWORD_HASH || '').trim();
  return envHash || ADMIN_PASSWORD_HASH;
}

export function getConfiguredAdminEmail(): string {
  return (import.meta.env.VITE_ADMIN_EMAIL || '').trim();
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string) =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

export async function pbkdf2Hex(password: string, saltHex: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key,
    256
  );
  return toHex(new Uint8Array(bits));
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltHex, hashHex] = stored.trim().split('$');
  if (scheme !== 'pbkdf2' || !iterations || !saltHex || !hashHex) return false;
  const entered = await pbkdf2Hex(password, saltHex, Number(iterations));
  return entered === hashHex.toLowerCase();
}

export async function verifyLocalAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  return verifyPasswordHash(password, getEffectivePasswordHash());
}

export interface InactivityLockTimer {
  recordActivity: () => void;
  dispose: () => void;
  getRemainingMs: (now?: number) => number;
}

export function createInactivityLockTimer(
  onLock: () => void,
  timeoutMs: number = ADMIN_AUTO_LOCK_MS
): InactivityLockTimer {
  let lastActivity = Date.now();
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const schedule = () => {
    if (disposed) return;
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      if (!disposed) {
        onLock();
      }
    }, timeoutMs);
  };

  const recordActivity = () => {
    if (disposed) return;
    lastActivity = Date.now();
    schedule();
  };

  const dispose = () => {
    disposed = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const getRemainingMs = (now: number = Date.now()): number => {
    return Math.max(0, lastActivity + timeoutMs - now);
  };

  schedule();

  return {
    recordActivity,
    dispose,
    getRemainingMs,
  };
}
