import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Lang,
  PrintLang,
  TranslationLang,
  Menu,
  MenuCategory,
  MenuCategoryI18n,
  MenuItem,
  MenuItemI18n,
  MenuNote,
  MenuNoteI18n,
  MenuRestaurantI18n,
} from '../types/menu';

export type {
  Lang,
  PrintLang,
  TranslationLang,
  Menu,
  MenuCategory,
  MenuCategoryI18n,
  MenuCategoryTranslation,
  MenuItem,
  MenuItemI18n,
  MenuItemTranslation,
  MenuRestaurant,
  MenuRestaurantI18n,
  MenuRestaurantTranslation,
  MenuSettings,
  MenuFooter,
  MenuFooterTranslation,
  MenuNote,
  MenuNoteI18n,
  MenuNoteTranslation,
} from '../types/menu';

export const LOCAL_STORAGE_KEY = 'halal_palau_menu_v1';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabaseClient: SupabaseClient | null = null;
let lastKnownUpdatedAt: string | null = null;

export const REMOTE_CONFLICT_MESSAGE =
  'Меню изменили на другом устройстве — загрузить свежую версию или перезаписать?';

export class MenuConflictError extends Error {
  readonly remoteUpdatedAt: string;
  readonly remoteMenu?: Menu;

  constructor(remoteUpdatedAt: string, remoteMenu?: Menu) {
    super(REMOTE_CONFLICT_MESSAGE);
    this.name = 'MenuConflictError';
    this.remoteUpdatedAt = remoteUpdatedAt;
    this.remoteMenu = remoteMenu;
  }
}

export interface MenuHistoryEntry {
  id: number;
  menu_id: string;
  data: Menu;
  saved_at: string;
  saved_by?: string | null;
}

export function isSupabaseMode(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

export function getLastKnownUpdatedAt(): string | null {
  return lastKnownUpdatedAt;
}

export function setLastKnownUpdatedAt(ts: string | null): void {
  lastKnownUpdatedAt = ts;
}

export function hasRemoteConflict(
  loadedUpdatedAt: string | null | undefined,
  remoteUpdatedAt: string | null | undefined
): boolean {
  if (!loadedUpdatedAt || !remoteUpdatedAt) {
    return false;
  }
  const loadedTime = Date.parse(loadedUpdatedAt);
  const remoteTime = Date.parse(remoteUpdatedAt);
  if (!Number.isNaN(loadedTime) && !Number.isNaN(remoteTime)) {
    return remoteTime > loadedTime;
  }
  return remoteUpdatedAt !== loadedUpdatedAt;
}

const TRANSLATION_LANGS: TranslationLang[] = ['kk', 'tr', 'en'];

function normalizeRestaurantI18n(raw?: MenuRestaurantI18n): MenuRestaurantI18n | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const result: MenuRestaurantI18n = {};
  let hasAny = false;
  for (const lang of TRANSLATION_LANGS) {
    const entry = raw[lang];
    if (entry && typeof entry === 'object') {
      const cleaned: NonNullable<MenuRestaurantI18n[TranslationLang]> = {};
      if (typeof entry.name === 'string' && entry.name.trim()) {
        cleaned.name = entry.name;
      }
      if (typeof entry.subtitle === 'string' && entry.subtitle.trim()) {
        cleaned.subtitle = entry.subtitle;
      }
      if (typeof entry.tagline === 'string' && entry.tagline.trim()) {
        cleaned.tagline = entry.tagline;
      }
      if (entry.footer && typeof entry.footer === 'object') {
        const footer: NonNullable<typeof cleaned.footer> = {};
        if (typeof entry.footer.warning === 'string' && entry.footer.warning.trim()) {
          footer.warning = entry.footer.warning;
        }
        if (typeof entry.footer.service === 'string' && entry.footer.service.trim()) {
          footer.service = entry.footer.service;
        }
        if (typeof entry.footer.cooking === 'string' && entry.footer.cooking.trim()) {
          footer.cooking = entry.footer.cooking;
        }
        if (Object.keys(footer).length > 0) {
          cleaned.footer = footer;
        }
      }
      if (Object.keys(cleaned).length > 0) {
        result[lang] = cleaned;
        hasAny = true;
      }
    }
  }
  return hasAny ? result : undefined;
}

function normalizeCategoryI18n(
  rawI18n?: MenuCategoryI18n,
  titleKz?: string
): MenuCategoryI18n | undefined {
  const result: MenuCategoryI18n = {};
  let hasAny = false;
  for (const lang of TRANSLATION_LANGS) {
    const rawTitle = rawI18n?.[lang]?.title;
    if (typeof rawTitle === 'string' && rawTitle.trim()) {
      result[lang] = { title: rawTitle };
      hasAny = true;
    }
  }
  if (!result.kk?.title && typeof titleKz === 'string' && titleKz.trim()) {
    result.kk = { title: titleKz };
    hasAny = true;
  }
  return hasAny ? result : undefined;
}

function normalizeItemI18n(raw?: MenuItemI18n): MenuItemI18n | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const result: MenuItemI18n = {};
  let hasAny = false;
  for (const lang of TRANSLATION_LANGS) {
    const entry = raw[lang];
    if (entry && typeof entry === 'object') {
      const cleaned: NonNullable<MenuItemI18n[TranslationLang]> = {};
      if (typeof entry.name === 'string' && entry.name.trim()) {
        cleaned.name = entry.name;
      }
      if (typeof entry.portion === 'string' && entry.portion.trim()) {
        cleaned.portion = entry.portion;
      }
      if (typeof entry.description === 'string' && entry.description.trim()) {
        cleaned.description = entry.description;
      }
      if (Object.keys(cleaned).length > 0) {
        result[lang] = cleaned;
        hasAny = true;
      }
    }
  }
  return hasAny ? result : undefined;
}

function normalizeNoteI18n(raw?: MenuNoteI18n): MenuNoteI18n | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const result: MenuNoteI18n = {};
  let hasAny = false;
  for (const lang of TRANSLATION_LANGS) {
    const entry = raw[lang];
    if (entry && typeof entry === 'object') {
      const cleaned: NonNullable<MenuNoteI18n[TranslationLang]> = {};
      if (typeof entry.kicker === 'string' && entry.kicker.trim()) {
        cleaned.kicker = entry.kicker;
      }
      if (typeof entry.title === 'string' && entry.title.trim()) {
        cleaned.title = entry.title;
      }
      if (typeof entry.text === 'string' && entry.text.trim()) {
        cleaned.text = entry.text;
      }
      if (Object.keys(cleaned).length > 0) {
        result[lang] = cleaned;
        hasAny = true;
      }
    }
  }
  return hasAny ? result : undefined;
}

export function normalizeMenu(raw: Partial<Menu>): Menu {
  const restI18n = normalizeRestaurantI18n(raw.restaurant?.i18n);
  return {
    restaurant: {
      name: raw.restaurant?.name ?? 'Халал Палау',
      subtitle: raw.restaurant?.subtitle ?? 'Мәзір · Меню',
      ...(typeof raw.restaurant?.tagline === 'string'
        ? { tagline: raw.restaurant.tagline }
        : {}),
      ...(Array.isArray(raw.restaurant?.notes)
        ? {
            notes: raw.restaurant.notes.slice(0, 3).map((n): MenuNote => {
              const noteI18n = normalizeNoteI18n(n?.i18n);
              return {
                kicker: String(n?.kicker ?? ''),
                title: String(n?.title ?? ''),
                text: String(n?.text ?? ''),
                ...(noteI18n ? { i18n: noteI18n } : {}),
              };
            }),
          }
        : {}),
      footer: {
        warning:
          raw.restaurant?.footer?.warning ??
          'Приносить и распивать напитки строго запрещается',
        service:
          raw.restaurant?.footer?.service ?? 'Қызмет көрсету / Обслуживание — 10%',
        cooking:
          raw.restaurant?.footer?.cooking ??
          'Дайындау уақыты / Время приготовления — 15–20 минут',
      },
      ...(restI18n ? { i18n: restI18n } : {}),
    },
    settings: {
      siteUrl: raw.settings?.siteUrl ?? '',
      currency: raw.settings?.currency ?? '₸',
      showQr: raw.settings?.showQr ?? true,
    },
    categories: Array.isArray(raw.categories)
      ? raw.categories.map((cat) => {
          const kkTitle =
            (typeof cat.i18n?.kk?.title === 'string' && cat.i18n.kk.title.trim()) ||
            (typeof cat.titleKz === 'string' ? cat.titleKz : '');
          const catI18n = normalizeCategoryI18n(cat.i18n, kkTitle);
          return {
            id: cat.id,
            title: cat.title,
            titleKz: kkTitle,
            ...(catI18n ? { i18n: catI18n } : {}),
            items: Array.isArray(cat.items)
              ? cat.items.map((item) => {
                  const itemI18n = normalizeItemI18n(item.i18n);
                  return {
                    name: item.name,
                    price: String(item.price ?? ''),
                    ...(item.portion ? { portion: item.portion } : {}),
                    ...(item.description ? { description: item.description } : {}),
                    ...(item.hidden ? { hidden: true } : {}),
                    ...(itemI18n ? { i18n: itemI18n } : {}),
                  };
                })
              : [],
          };
        })
      : [],
  };
}

export function getPublicMenuUrl(menu: Menu): string | null {
  const customUrl = (menu.settings?.siteUrl || '').trim();
  if (customUrl) {
    return customUrl;
  }
  if (typeof window === 'undefined' || !window.location) {
    return null;
  }
  const { hostname, href, search } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (isLocal) {
    const params = new URLSearchParams(search);
    if (params.get('allowLocalQr') !== '1') {
      return null;
    }
  }
  const indexUrl = new URL('./index.html', href);
  return indexUrl.href.replace(/index\.html$/, '');
}

export async function loadStaticMenu(): Promise<Menu> {
  const res = await fetch('./menu.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Не удалось загрузить ./menu.json (${res.status})`);
  }
  const data = await res.json();
  return normalizeMenu(data);
}

type Dict = Record<string, unknown>;

function isDict(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Fills only missing translation fields from source; never overwrites existing values.
function mergeMissing(target: unknown, source: unknown): unknown {
  if (!isDict(source)) return target ?? source;
  const out: Dict = isDict(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(source)) {
    const current = out[key];
    if (isDict(value)) {
      out[key] = mergeMissing(current, value);
    } else if (current === undefined || current === null || current === '') {
      out[key] = value;
    }
  }
  return out;
}

/**
 * A menu saved earlier (localStorage or Supabase) may predate translations.
 * Missing i18n fields are taken from the bundled menu.json, matched by category id
 * and the Russian item name (+ portion); user edits are kept as they are.
 */
export function fillMissingTranslations(menu: Menu, reference: Menu): Menu {
  const refCats = new Map(reference.categories.map((c) => [c.id, c]));
  const itemKey = (name: string, portion?: string) => `${name}\u0000${portion ?? ''}`;
  return {
    ...menu,
    restaurant: {
      ...menu.restaurant,
      i18n: mergeMissing(menu.restaurant.i18n, reference.restaurant.i18n) as Menu['restaurant']['i18n'],
    },
    categories: menu.categories.map((cat) => {
      const ref = refCats.get(cat.id);
      if (!ref) return cat;
      const refItems = new Map(ref.items.map((i) => [itemKey(i.name, i.portion), i]));
      const refByName = new Map(ref.items.map((i) => [i.name, i]));
      return {
        ...cat,
        titleKz: cat.titleKz || ref.titleKz,
        i18n: mergeMissing(cat.i18n, ref.i18n) as typeof cat.i18n,
        items: cat.items.map((item) => {
          const refItem = refItems.get(itemKey(item.name, item.portion)) ?? refByName.get(item.name);
          if (!refItem?.i18n) return item;
          return { ...item, i18n: mergeMissing(item.i18n, refItem.i18n) as typeof item.i18n };
        }),
      };
    }),
  };
}

async function withTranslations(menu: Menu): Promise<Menu> {
  try {
    return fillMissingTranslations(menu, await loadStaticMenu());
  } catch {
    return menu;
  }
}

export async function loadMenuWithFallback(
  fetchRemote: () => Promise<{
    data?: unknown;
    updated_at?: string | null;
    error?: unknown;
  } | null>,
  fetchFallback: () => Promise<Menu>,
  onRemoteLoaded?: (updatedAt: string | null) => void
): Promise<Menu> {
  try {
    const result = await fetchRemote();
    if (!result || result.error || !result.data || typeof result.data !== 'object') {
      if (result?.error) {
        console.warn('Ошибка чтения меню из Supabase, используется встроенный menu.json:', result.error);
      }
      return await fetchFallback();
    }
    const rawData = result.data as Partial<Menu>;
    if (!Array.isArray(rawData.categories)) {
      console.warn('Некорректный формат данных в Supabase, используется встроенный menu.json');
      return await fetchFallback();
    }
    if (onRemoteLoaded) {
      onRemoteLoaded(typeof result.updated_at === 'string' ? result.updated_at : null);
    }
    return normalizeMenu(rawData);
  } catch (err) {
    console.warn('Supabase недоступен или на паузе, используется встроенный menu.json:', err);
    return await fetchFallback();
  }
}

export async function loadMenu(): Promise<Menu> {
  return withTranslations(await loadMenuRaw());
}

async function loadMenuRaw(): Promise<Menu> {
  if (isSupabaseMode()) {
    const supabase = getSupabase();
    return loadMenuWithFallback(
      async () => {
        const { data, error } = await supabase
          .from('menu_documents')
          .select('data, updated_at')
          .eq('id', 'main')
          .maybeSingle();
        if (error) {
          return { error };
        }
        return data
          ? { data: data.data, updated_at: data.updated_at }
          : null;
      },
      loadStaticMenu,
      (updatedAt) => {
        lastKnownUpdatedAt = updatedAt;
      }
    );
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.categories)) {
        return normalizeMenu(parsed);
      }
    }
  } catch (err) {
    console.warn('Не удалось прочитать меню из localStorage:', err);
  }

  return loadStaticMenu();
}

export interface SaveMenuOptions {
  force?: boolean;
  expectedUpdatedAt?: string | null;
}

export async function saveMenu(menu: Menu, options?: SaveMenuOptions): Promise<void> {
  const normalized = normalizeMenu(menu);

  if (isSupabaseMode()) {
    const supabase = getSupabase();
    const baselineUpdatedAt =
      options?.expectedUpdatedAt !== undefined
        ? options.expectedUpdatedAt
        : lastKnownUpdatedAt;

    if (!options?.force && baselineUpdatedAt) {
      const { data: currentRow, error: checkError } = await supabase
        .from('menu_documents')
        .select('data, updated_at')
        .eq('id', 'main')
        .maybeSingle();

      if (!checkError && currentRow?.updated_at) {
        if (hasRemoteConflict(baselineUpdatedAt, currentRow.updated_at)) {
          const remoteMenu =
            currentRow.data && typeof currentRow.data === 'object'
              ? normalizeMenu(currentRow.data as Partial<Menu>)
              : undefined;
          throw new MenuConflictError(currentRow.updated_at, remoteMenu);
        }
      }
    }

    const nowIso = new Date().toISOString();
    const { data: savedRow, error } = await supabase
      .from('menu_documents')
      .upsert(
        {
          id: 'main',
          data: normalized,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      )
      .select('updated_at')
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Не удалось сохранить меню в Supabase');
    }

    lastKnownUpdatedAt = savedRow?.updated_at ?? nowIso;
    return;
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized, null, 2));
}

export function saveMenuLocalSync(menu: Menu): void {
  if (isSupabaseMode()) return;
  try {
    const normalized = normalizeMenu(menu);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized, null, 2));
  } catch (err) {
    console.warn('Не удалось синхронно сохранить меню в localStorage:', err);
  }
}

export async function loadMenuHistory(limit: number = 20): Promise<MenuHistoryEntry[]> {
  if (!isSupabaseMode()) {
    return [];
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('menu_history')
      .select('id, menu_id, data, saved_at, saved_by')
      .eq('menu_id', 'main')
      .order('saved_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) {
      if (error) {
        console.warn('Не удалось загрузить историю версий из Supabase:', error);
      }
      return [];
    }

    return data
      .filter((row) => row && row.data && typeof row.data === 'object')
      .map((row) => ({
        id: Number(row.id),
        menu_id: String(row.menu_id ?? 'main'),
        data: normalizeMenu(row.data as Partial<Menu>),
        saved_at: String(row.saved_at ?? ''),
        saved_by: row.saved_by ? String(row.saved_by) : null,
      }));
  } catch (err) {
    console.warn('Ошибка при загрузке истории версий:', err);
    return [];
  }
}

export async function resetLocalMenu(): Promise<Menu> {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  return loadStaticMenu();
}

export function hasLocalChanges(): boolean {
  if (isSupabaseMode()) return false;
  try {
    return Boolean(localStorage.getItem(LOCAL_STORAGE_KEY));
  } catch {
    return false;
  }
}

/** true/false when the database answered; null when it could not be reached. */
export async function remoteMenuExists(): Promise<boolean | null> {
  if (!isSupabaseMode()) return null;
  const { data, error } = await getSupabase()
    .from('menu_documents')
    .select('id')
    .eq('id', 'main')
    .maybeSingle();
  if (error) return null;
  return Boolean(data);
}

export async function seedInitialSupabaseMenu(): Promise<Menu> {
  const staticMenu = await loadStaticMenu();
  await saveMenu(staticMenu, { force: true });
  return staticMenu;
}

// Supabase signs in by email only; a plain login like "admin" maps to an internal address.
export const ADMIN_LOGIN_DOMAIN = 'halalpalau.local';

export function loginToEmail(login: string): string {
  const value = login.trim().toLowerCase();
  return value.includes('@') ? value : `${value}@${ADMIN_LOGIN_DOMAIN}`;
}

export async function signInAdmin(
  login: string,
  password: string
): Promise<{ email?: string; error?: string }> {
  if (!isSupabaseMode()) {
    return { email: 'local@admin' };
  }
  const supabase = getSupabase();
  const email = loginToEmail(login);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  return { email: data.user?.email ?? email };
}

export async function signOutAdmin(): Promise<void> {
  if (!isSupabaseMode()) return;
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  } catch {
    // best-effort signOut
  }
}

export async function getAdminUser(): Promise<{ email: string } | null> {
  if (!isSupabaseMode()) {
    return null;
  }
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return { email: user.email ?? 'admin' };
  } catch {
    return null;
  }
}
