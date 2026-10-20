import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasRemoteConflict,
  loadMenuWithFallback,
  MenuConflictError,
  REMOTE_CONFLICT_MESSAGE,
  type Menu,
} from '../data/store';
import {
  ADMIN_AUTO_LOCK_MS,
  createInactivityLockTimer,
  sha256Hex,
  verifyPasswordHash,
} from '../admin/auth';

const sampleFallbackMenu: Menu = {
  restaurant: {
    name: 'Халал Палау',
    subtitle: 'Мәзір · Меню',
    footer: {
      warning: 'Приносить и распивать напитки строго запрещается',
      service: 'Қызмет көрсету / Обслуживание — 10%',
      cooking: 'Дайындау уақыты / Время приготовления — 15–20 минут',
    },
  },
  settings: {
    siteUrl: '',
    currency: '₸',
    showQr: true,
  },
  categories: [
    {
      id: 'plov',
      title: 'Плов',
      titleKz: 'Палау',
      items: [{ name: 'Плов Ташкентский', price: '2200' }],
    },
  ],
};

describe('Guest menu fallback (loadMenuWithFallback)', () => {
  it('returns normalized remote menu and captures updated_at when Supabase succeeds', async () => {
    let capturedUpdatedAt: string | null = null;
    const remotePayload = {
      ...sampleFallbackMenu,
      categories: [
        {
          id: 'plov',
          title: 'Плов',
          titleKz: 'Палау',
          items: [{ name: 'Плов Праздничный', price: '2500' }],
        },
      ],
    };

    const result = await loadMenuWithFallback(
      async () => ({
        data: remotePayload,
        updated_at: '2026-10-20T12:00:00.000Z',
      }),
      async () => sampleFallbackMenu,
      (ts) => {
        capturedUpdatedAt = ts;
      }
    );

    expect(result.categories[0].items[0].name).toBe('Плов Праздничный');
    expect(capturedUpdatedAt).toBe('2026-10-20T12:00:00.000Z');
  });

  it('falls back silently to bundled menu.json when Supabase throws (unreachable/paused)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fallbackFn = vi.fn(async () => sampleFallbackMenu);

    const result = await loadMenuWithFallback(
      async () => {
        throw new TypeError('Failed to fetch');
      },
      fallbackFn
    );

    expect(fallbackFn).toHaveBeenCalledTimes(1);
    expect(result.categories[0].items[0].name).toBe('Плов Ташкентский');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('falls back silently to bundled menu.json when Supabase returns an error or empty row', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fallbackFn = vi.fn(async () => sampleFallbackMenu);

    const onErrorResult = await loadMenuWithFallback(
      async () => ({ error: { message: 'Project is paused' } }),
      fallbackFn
    );
    expect(onErrorResult.categories[0].items[0].name).toBe('Плов Ташкентский');

    const onEmptyResult = await loadMenuWithFallback(
      async () => null,
      fallbackFn
    );
    expect(onEmptyResult.categories[0].items[0].name).toBe('Плов Ташкентский');
    expect(fallbackFn).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});

describe('Optimistic conflict detection (hasRemoteConflict & MenuConflictError)', () => {
  it('detects conflict when remote updated_at is newer than loaded updated_at', () => {
    const loaded = '2026-10-20T10:00:00.000Z';
    const newerRemote = '2026-10-20T10:05:00.000Z';
    expect(hasRemoteConflict(loaded, newerRemote)).toBe(true);
  });

  it('returns false when remote updated_at is equal or older than loaded updated_at', () => {
    const loaded = '2026-10-20T10:00:00.000Z';
    const sameRemote = '2026-10-20T10:00:00.000Z';
    const olderRemote = '2026-10-20T09:55:00.000Z';

    expect(hasRemoteConflict(loaded, sameRemote)).toBe(false);
    expect(hasRemoteConflict(loaded, olderRemote)).toBe(false);
  });

  it('returns false when loaded or remote timestamp is null/undefined', () => {
    expect(hasRemoteConflict(null, '2026-10-20T10:05:00.000Z')).toBe(false);
    expect(hasRemoteConflict('2026-10-20T10:00:00.000Z', null)).toBe(false);
    expect(hasRemoteConflict(undefined, undefined)).toBe(false);
  });

  it('formats MenuConflictError with the exact Russian prompt message', () => {
    const err = new MenuConflictError('2026-10-20T11:00:00.000Z', sampleFallbackMenu);
    expect(err.message).toBe(
      'Меню изменили на другом устройстве — загрузить свежую версию или перезаписать?'
    );
    expect(err.message).toBe(REMOTE_CONFLICT_MESSAGE);
    expect(err.remoteUpdatedAt).toBe('2026-10-20T11:00:00.000Z');
    expect(err.remoteMenu?.restaurant.name).toBe('Халал Палау');
  });
});

describe('15-minute admin inactivity auto-lock timer (createInactivityLockTimer)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses 15 minutes (900,000 ms) as default timeout and triggers lock after 15 minutes', () => {
    expect(ADMIN_AUTO_LOCK_MS).toBe(15 * 60 * 1000);

    const onLock = vi.fn();
    const timer = createInactivityLockTimer(onLock);

    vi.advanceTimersByTime(14 * 60 * 1000 + 59 * 1000);
    expect(onLock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onLock).toHaveBeenCalledTimes(1);

    timer.dispose();
  });

  it('postpones lock when user activity is recorded before 15 minutes elapse', () => {
    const onLock = vi.fn();
    const timer = createInactivityLockTimer(onLock, ADMIN_AUTO_LOCK_MS);

    // Advance 10 minutes, then record activity
    vi.advanceTimersByTime(10 * 60 * 1000);
    timer.recordActivity();

    // Advance another 10 minutes (20m total, but only 10m since last activity)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(onLock).not.toHaveBeenCalled();

    // Advance remaining 5 minutes -> reaches 15m since last activity
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(onLock).toHaveBeenCalledTimes(1);

    timer.dispose();
  });

  it('does not trigger lock after dispose() is called', () => {
    const onLock = vi.fn();
    const timer = createInactivityLockTimer(onLock, ADMIN_AUTO_LOCK_MS);

    vi.advanceTimersByTime(5 * 60 * 1000);
    timer.dispose();

    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(onLock).not.toHaveBeenCalled();
  });
});

describe('Admin password hashing (sha256Hex)', () => {
  it('computes SHA-256 hex digest for test123 without touching storage', async () => {
    const digest = await sha256Hex('test123');
    expect(digest).toBe(
      'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae'
    );
  });
});

describe('Admin password verification (PBKDF2)', () => {
  // pbkdf2-sha256("test123", salt 00112233445566778899aabbccddeeff, 1000 iterations)
  const stored =
    'pbkdf2$1000$00112233445566778899aabbccddeeff$af73db0a6b5199150a92469d4148d5f627911b88129e0d3ca4870f47e5410a3e';

  it('accepts the right password and rejects a wrong one', async () => {
    expect(await verifyPasswordHash('test123', stored)).toBe(true);
    expect(await verifyPasswordHash('test124', stored)).toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPasswordHash('test123', 'ecd71870d1963316')).toBe(false);
  });
});

describe('Admin login to email mapping', () => {
  it('maps a plain login to the internal domain and keeps real emails', async () => {
    const { loginToEmail } = await import('../data/store');
    expect(loginToEmail(' Admin ')).toBe('admin@halalpalau.local');
    expect(loginToEmail('Umarov@Example.com')).toBe('umarov@example.com');
  });
});
