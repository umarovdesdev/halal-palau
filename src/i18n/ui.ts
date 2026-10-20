import type {
  Lang,
  MenuCategory,
  MenuFooter,
  MenuItem,
  MenuNote,
  MenuRestaurant,
  PrintLang,
} from '../types/menu';

export const LANG_STORAGE_KEY = 'hp_lang';
export const THEME_STORAGE_KEY = 'hp_theme';
export const PRINT_PREFS_STORAGE_KEY = 'hp_print_prefs';

export interface LanguageMeta {
  code: Lang;
  shortLabel: string;
  fullName: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'kk', shortLabel: 'ҚАЗ', fullName: 'Қазақша' },
  { code: 'ru', shortLabel: 'РУС', fullName: 'Русский' },
  { code: 'tr', shortLabel: 'TÜR', fullName: 'Türkçe' },
  { code: 'en', shortLabel: 'ENG', fullName: 'English' },
];

export interface UiStrings {
  langName: string;
  restaurantNameDefault: string;
  menuSubtitleDefault: string;
  restaurantTaglineDefault: string;
  footerWarningDefault: string;
  footerServiceDefault: string;
  footerCookingDefault: string;
  skipToMenu: string;
  sectionFallback: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchClearAria: string;
  searchToggleAria: string;
  searchCloseAria: string;
  categoriesNavAria: string;
  langSwitcherAria: string;
  langButtonLabels: Record<Lang, string>;
  nothingFoundTitle: string;
  nothingFoundText: (query: string) => string;
  resetSearchBtn: string;
  formatItemsCount: (count: number) => string;
  themeColorName: string;
  themeDarkName: string;
  themeToggleAria: (currentTheme: 'color' | 'dark') => string;
  footerWarningHeading: string;
  footerServiceHeading: string;
  footerCookingHeading: string;
  adminLink: string;
  backToTopAria: string;
  documentTitle: (restaurantName: string, subtitle: string) => string;
  metaDescription: string;
}

export function pluralizeRuItems(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'позиция';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'позиции';
  return 'позиций';
}

export const UI_STRINGS: Record<Lang, UiStrings> = {
  kk: {
    langName: 'Қазақша',
    restaurantNameDefault: 'Халал Палау',
    menuSubtitleDefault: 'Мәзір',
    restaurantTaglineDefault: 'Дәстүрлі шығыс асханасы',
    footerWarningDefault: 'Сусын әкелуге және ішуге қатаң тыйым салынады',
    footerServiceDefault: 'Қызмет көрсету — 10%',
    footerCookingDefault: 'Дайындау уақыты — 15–20 минут',
    skipToMenu: 'Мәзірге өту',
    sectionFallback: 'БӨЛІМ',
    searchPlaceholder: 'Тағамдар мен құрамы бойынша іздеу…',
    searchAriaLabel: 'Мәзірден іздеу',
    searchClearAria: 'Іздеуді тазалау',
    searchToggleAria: 'Іздеуді ашу',
    searchCloseAria: 'Іздеуді жабу',
    categoriesNavAria: 'Мәзір санаттары',
    langSwitcherAria: 'Тілді таңдау',
    langButtonLabels: {
      kk: 'Қазақша',
      ru: 'Орысша',
      tr: 'Түрікше',
      en: 'Ағылшынша',
    },
    nothingFoundTitle: 'Ештеңе табылмады',
    nothingFoundText: (q) => `«${q}» сұранысы бойынша тағамдар табылмады.`,
    resetSearchBtn: 'Барлық тағамдарды көрсету',
    formatItemsCount: (count) => `${count} тағам`,
    themeColorName: 'Түрлі-түсті',
    themeDarkName: 'Қараңғы',
    themeToggleAria: (current) =>
      current === 'color'
        ? 'Қараңғы тақырыпқа ауысу'
        : 'Түрлі-түсті тақырыпқа ауысу',
    footerWarningHeading: 'Мекеме ережесі',
    footerServiceHeading: 'Қызмет көрсету',
    footerCookingHeading: 'Дайындау уақыты',
    adminLink: 'Мәзірді басқару',
    backToTopAria: 'Жоғарыға оралу',
    documentTitle: (restaurantName, subtitle) => `${restaurantName} — ${subtitle}`,
    metaDescription:
      'Халал Палау — Мәзір. Дәстүрлі шығыс асханасы, палау, лағман, сорпа, пісірме және сусындар.',
  },
  ru: {
    langName: 'Русский',
    restaurantNameDefault: 'Халал Палау',
    menuSubtitleDefault: 'Меню',
    restaurantTaglineDefault: 'Традиционная восточная кухня',
    footerWarningDefault: 'Приносить и распивать напитки строго запрещается',
    footerServiceDefault: 'Обслуживание — 10%',
    footerCookingDefault: 'Время приготовления — 15–20 минут',
    skipToMenu: 'К меню',
    sectionFallback: 'РАЗДЕЛ',
    searchPlaceholder: 'Поиск по блюдам и составу…',
    searchAriaLabel: 'Поиск по меню',
    searchClearAria: 'Очистить поиск',
    searchToggleAria: 'Открыть поиск',
    searchCloseAria: 'Закрыть поиск',
    categoriesNavAria: 'Категории меню',
    langSwitcherAria: 'Выбор языка',
    langButtonLabels: {
      kk: 'Казахский',
      ru: 'Русский',
      tr: 'Турецкий',
      en: 'Английский',
    },
    nothingFoundTitle: 'Ничего не найдено',
    nothingFoundText: (q) => `По запросу «${q}» блюд не найдено.`,
    resetSearchBtn: 'Показать все блюда',
    formatItemsCount: (count) => `${count} ${pluralizeRuItems(count)}`,
    themeColorName: 'Цветная',
    themeDarkName: 'Тёмная',
    themeToggleAria: (current) =>
      current === 'color'
        ? 'Переключить на тёмную тему («Тёмная»)'
        : 'Переключить на светлую тему («Цветная»)',
    footerWarningHeading: 'Правило заведения',
    footerServiceHeading: 'Обслуживание',
    footerCookingHeading: 'Время приготовления',
    adminLink: 'Управление меню',
    backToTopAria: 'Наверх',
    documentTitle: (restaurantName, subtitle) => `${restaurantName} — ${subtitle}`,
    metaDescription:
      'Халал Палау — Меню. Традиционная восточная кухня, плов, лагман, шорва, выпечка и напитки.',
  },
  tr: {
    langName: 'Türkçe',
    restaurantNameDefault: 'Helal Palau',
    menuSubtitleDefault: 'Menü',
    restaurantTaglineDefault: 'Geleneksel Doğu Mutfağı',
    footerWarningDefault: 'Dışarıdan içecek getirmek ve tüketmek kesinlikle yasaktır',
    footerServiceDefault: 'Servis ücreti — %10',
    footerCookingDefault: 'Hazırlama süresi — 15–20 dakika',
    skipToMenu: 'Menüye geç',
    sectionFallback: 'BÖLÜM',
    searchPlaceholder: 'Yemek veya malzemeye göre ara…',
    searchAriaLabel: 'Menüde ara',
    searchClearAria: 'Aramayı temizle',
    searchToggleAria: 'Aramayı aç',
    searchCloseAria: 'Aramayı kapat',
    categoriesNavAria: 'Menü kategorileri',
    langSwitcherAria: 'Dil seçimi',
    langButtonLabels: {
      kk: 'Kazakça',
      ru: 'Rusça',
      tr: 'Türkçe',
      en: 'İngilizce',
    },
    nothingFoundTitle: 'Sonuç bulunamadı',
    nothingFoundText: (q) => `“${q}” araması için yemek bulunamadı.`,
    resetSearchBtn: 'Tüm yemekleri göster',
    formatItemsCount: (count) => `${count} çeşit`,
    themeColorName: 'Renkli',
    themeDarkName: 'Koyu',
    themeToggleAria: (current) =>
      current === 'color'
        ? 'Koyu temaya geç (Koyu)'
        : 'Renkli temaya geç (Renkli)',
    footerWarningHeading: 'Mekan Kuralı',
    footerServiceHeading: 'Servis',
    footerCookingHeading: 'Hazırlama Süresi',
    adminLink: 'Menü yönetimi',
    backToTopAria: 'Yukarı çık',
    documentTitle: (restaurantName, subtitle) => `${restaurantName} — ${subtitle}`,
    metaDescription:
      'Helal Palau — Menü. Geleneksel Doğu mutfağı, pilav, lağman, çorba, hamur işleri ve içecekler.',
  },
  en: {
    langName: 'English',
    restaurantNameDefault: 'Halal Palau',
    menuSubtitleDefault: 'Menu',
    restaurantTaglineDefault: 'Traditional Eastern Cuisine',
    footerWarningDefault: 'Outside drinks are strictly prohibited',
    footerServiceDefault: 'Service charge — 10%',
    footerCookingDefault: 'Preparation time — 15–20 minutes',
    skipToMenu: 'Skip to menu',
    sectionFallback: 'SECTION',
    searchPlaceholder: 'Search dishes and ingredients…',
    searchAriaLabel: 'Search menu',
    searchClearAria: 'Clear search',
    searchToggleAria: 'Open search',
    searchCloseAria: 'Close search',
    categoriesNavAria: 'Menu categories',
    langSwitcherAria: 'Select language',
    langButtonLabels: {
      kk: 'Kazakh',
      ru: 'Russian',
      tr: 'Turkish',
      en: 'English',
    },
    nothingFoundTitle: 'Nothing found',
    nothingFoundText: (q) => `No dishes found matching “${q}”.`,
    resetSearchBtn: 'Show all dishes',
    formatItemsCount: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
    themeColorName: 'Colored',
    themeDarkName: 'Dark',
    themeToggleAria: (current) =>
      current === 'color'
        ? 'Switch to dark theme (Dark)'
        : 'Switch to colored theme (Colored)',
    footerWarningHeading: 'House Policy',
    footerServiceHeading: 'Service',
    footerCookingHeading: 'Preparation Time',
    adminLink: 'Menu management',
    backToTopAria: 'Back to top',
    documentTitle: (restaurantName, subtitle) => `${restaurantName} — ${subtitle}`,
    metaDescription:
      'Halal Palau — Menu. Traditional Eastern cuisine, plov, lagman, shorpa, pastries, and drinks.',
  },
};

export function isValidLang(value: unknown): value is Lang {
  return value === 'kk' || value === 'ru' || value === 'tr' || value === 'en';
}

export function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ru';

  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang')?.trim().toLowerCase();
    if (isValidLang(urlLang)) {
      return urlLang;
    }
  } catch {
    // ignore URL errors
  }

  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY)?.trim().toLowerCase();
    if (isValidLang(saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }

  try {
    const navLangs =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
    for (const raw of navLangs) {
      if (!raw) continue;
      const prefix = raw.toLowerCase().split(/[-_]/)[0];
      if (isValidLang(prefix)) {
        return prefix;
      }
    }
  } catch {
    // ignore navigator errors
  }

  return 'ru';
}

export function getCategoryTitle(cat: MenuCategory, lang: Lang): string {
  if (lang === 'ru') return cat.title;
  if (lang === 'kk') {
    const kk = cat.i18n?.kk?.title?.trim() ?? cat.titleKz?.trim();
    return kk || cat.title;
  }
  const translated = cat.i18n?.[lang]?.title?.trim();
  return translated || cat.title;
}

export function getCategoryKicker(_cat: MenuCategory, lang: Lang): string {
  return UI_STRINGS[lang].sectionFallback;
}

export function getItemName(item: MenuItem, lang: Lang): string {
  if (lang === 'ru') return item.name;
  const translated = item.i18n?.[lang]?.name?.trim();
  return translated || item.name;
}

export function getItemPortion(item: MenuItem, lang: Lang): string | undefined {
  const base = item.portion?.trim();
  if (!base) return undefined;
  if (lang === 'ru') return base;
  const translated = item.i18n?.[lang]?.portion?.trim();
  return translated || base;
}

export function getItemDescription(item: MenuItem, lang: Lang): string | undefined {
  const base = item.description?.trim();
  if (!base) return undefined;
  if (lang === 'ru') return base;
  const translated = item.i18n?.[lang]?.description?.trim();
  return translated || base;
}

export function getRestaurantName(restaurant: MenuRestaurant, lang: Lang): string {
  if (lang === 'ru') {
    return restaurant.name?.trim() || UI_STRINGS.ru.restaurantNameDefault;
  }
  const translated = restaurant.i18n?.[lang]?.name?.trim();
  return translated || UI_STRINGS[lang].restaurantNameDefault;
}

function stripBilingualToRu(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }
  if (trimmed.includes(' · ')) {
    const parts = trimmed.split(' · ').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }
  return trimmed;
}

export function getRestaurantSubtitle(restaurant: MenuRestaurant, lang: Lang): string {
  if (lang === 'ru') {
    return stripBilingualToRu(restaurant.subtitle, UI_STRINGS.ru.menuSubtitleDefault);
  }
  const translated = restaurant.i18n?.[lang]?.subtitle?.trim();
  return translated || UI_STRINGS[lang].menuSubtitleDefault;
}

export function getRestaurantTagline(
  restaurant: MenuRestaurant,
  lang: Lang
): string | undefined {
  const base = restaurant.tagline?.trim();
  if (!base) return undefined;
  if (lang === 'ru') return base;
  const translated = restaurant.i18n?.[lang]?.tagline?.trim();
  return translated || UI_STRINGS[lang].restaurantTaglineDefault;
}

export function getRestaurantFooter(restaurant: MenuRestaurant, lang: Lang): MenuFooter {
  const defaults = UI_STRINGS[lang];
  if (lang === 'ru') {
    return {
      warning: stripBilingualToRu(restaurant.footer?.warning, defaults.footerWarningDefault),
      service: stripBilingualToRu(restaurant.footer?.service, defaults.footerServiceDefault),
      cooking: stripBilingualToRu(restaurant.footer?.cooking, defaults.footerCookingDefault),
    };
  }
  const trFooter = restaurant.i18n?.[lang]?.footer;
  return {
    warning: trFooter?.warning?.trim() || defaults.footerWarningDefault,
    service: trFooter?.service?.trim() || defaults.footerServiceDefault,
    cooking: trFooter?.cooking?.trim() || defaults.footerCookingDefault,
  };
}

export interface PrintUiStrings {
  continuationSuffix: string;
  a4Sheet1PageLabel: string;
  a4Sheet2PageLabel: string;
  qrCaption: string;
  cardSubtitle: string;
  cardCtaPrimary: string;
  cardCtaSecondary: string;
}

export const PRINT_STRINGS: Record<PrintLang, PrintUiStrings> = {
  'ru-kk': {
    continuationSuffix: '(продолжение)',
    a4Sheet1PageLabel: '01 / 02',
    a4Sheet2PageLabel: '02 / 02',
    qrCaption: 'Мәзір онлайн · Меню онлайн',
    cardSubtitle: 'Мәзір · Меню',
    cardCtaPrimary: 'Мәзірді көру үшін QR-кодты сканерлеңіз',
    cardCtaSecondary: 'Наведите камеру телефона, чтобы открыть меню',
  },
  kk: {
    continuationSuffix: '(жалғасы)',
    a4Sheet1PageLabel: '01 / 02',
    a4Sheet2PageLabel: '02 / 02',
    qrCaption: 'Онлайн мәзір',
    cardSubtitle: 'Мәзір',
    cardCtaPrimary: 'Мәзірді көру үшін QR-кодты сканерлеңіз',
    cardCtaSecondary: '',
  },
  ru: {
    continuationSuffix: '(продолжение)',
    a4Sheet1PageLabel: '01 / 02',
    a4Sheet2PageLabel: '02 / 02',
    qrCaption: 'Меню онлайн',
    cardSubtitle: 'Меню',
    cardCtaPrimary: 'Наведите камеру телефона, чтобы открыть меню',
    cardCtaSecondary: '',
  },
  tr: {
    continuationSuffix: '(devamı)',
    a4Sheet1PageLabel: '01 / 02',
    a4Sheet2PageLabel: '02 / 02',
    qrCaption: 'Çevrimiçi menü',
    cardSubtitle: 'Menü',
    cardCtaPrimary: 'Menüyü açmak için telefonunuzun kamerasını QR koda tutun',
    cardCtaSecondary: '',
  },
  en: {
    continuationSuffix: '(continued)',
    a4Sheet1PageLabel: '01 / 02',
    a4Sheet2PageLabel: '02 / 02',
    qrCaption: 'Online menu',
    cardSubtitle: 'Menu',
    cardCtaPrimary: 'Point your phone camera at the QR code to open the menu',
    cardCtaSecondary: '',
  },
};

export function isValidPrintLang(value: unknown): value is PrintLang {
  return (
    value === 'kk' ||
    value === 'ru' ||
    value === 'tr' ||
    value === 'en' ||
    value === 'ru-kk'
  );
}

export function detectPrintLangFromUrl(): PrintLang {
  if (typeof window === 'undefined') return 'ru-kk';
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('lang')?.trim().toLowerCase();
    if (isValidPrintLang(raw)) {
      return raw;
    }
  } catch {
    // ignore URL errors
  }
  return 'ru-kk';
}

export function getPrintCategoryTitle(cat: MenuCategory, printLang: PrintLang): string {
  if (printLang === 'ru-kk') return cat.title;
  return getCategoryTitle(cat, printLang);
}

export function getPrintCategoryKicker(
  cat: MenuCategory,
  printLang: PrintLang
): string | undefined {
  if (printLang === 'ru-kk') {
    return cat.i18n?.kk?.title?.trim() || cat.titleKz?.trim() || 'БӨЛІМ';
  }
  return undefined;
}

export function getPrintItemName(item: MenuItem, printLang: PrintLang): string {
  if (printLang === 'ru-kk') return item.name;
  return getItemName(item, printLang);
}

export function getPrintItemPortion(
  item: MenuItem,
  printLang: PrintLang
): string | undefined {
  if (printLang === 'ru-kk') return item.portion?.trim() || undefined;
  return getItemPortion(item, printLang);
}

export function getPrintItemDescription(
  item: MenuItem,
  printLang: PrintLang
): string | undefined {
  if (printLang === 'ru-kk') return item.description?.trim() || undefined;
  return getItemDescription(item, printLang);
}

export function getPrintRestaurantName(
  restaurant: MenuRestaurant,
  printLang: PrintLang
): string {
  if (printLang === 'ru-kk') {
    return restaurant.name?.trim() || UI_STRINGS.ru.restaurantNameDefault;
  }
  return getRestaurantName(restaurant, printLang);
}

export function getPrintRestaurantSubtitle(
  restaurant: MenuRestaurant,
  printLang: PrintLang
): string {
  if (printLang === 'ru-kk') {
    return restaurant.subtitle?.trim() || 'Мәзір · Меню';
  }
  return getRestaurantSubtitle(restaurant, printLang);
}

export function getPrintRestaurantTagline(
  restaurant: MenuRestaurant,
  printLang: PrintLang
): string | undefined {
  if (printLang === 'ru-kk') {
    return restaurant.tagline?.trim() || undefined;
  }
  return getRestaurantTagline(restaurant, printLang);
}

export function getPrintRestaurantFooter(
  restaurant: MenuRestaurant,
  printLang: PrintLang
): MenuFooter {
  if (printLang === 'ru-kk') {
    return {
      warning:
        restaurant.footer?.warning?.trim() ||
        UI_STRINGS.ru.footerWarningDefault,
      service:
        restaurant.footer?.service?.trim() ||
        'Қызмет көрсету / Обслуживание — 10%',
      cooking:
        restaurant.footer?.cooking?.trim() ||
        'Дайындау уақыты / Время приготовления — 15–20 минут',
    };
  }
  return getRestaurantFooter(restaurant, printLang);
}

export function getPrintNote(
  note: MenuNote,
  printLang: PrintLang
): { kicker: string; title: string; text: string } {
  if (printLang === 'ru-kk' || printLang === 'ru') {
    return {
      kicker: note.kicker?.trim() || '',
      title: note.title?.trim() || '',
      text: note.text?.trim() || '',
    };
  }
  const tr = note.i18n?.[printLang];
  return {
    kicker: tr?.kicker?.trim() || note.kicker?.trim() || '',
    title: tr?.title?.trim() || note.title?.trim() || '',
    text: tr?.text?.trim() || note.text?.trim() || '',
  };
}
