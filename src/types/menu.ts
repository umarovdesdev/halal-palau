export type Lang = 'kk' | 'ru' | 'tr' | 'en';
export type TranslationLang = 'kk' | 'tr' | 'en';
export type PrintLang = Lang | 'ru-kk';

export interface MenuFooter {
  warning: string;
  service: string;
  cooking: string;
}

export interface MenuFooterTranslation {
  warning?: string;
  service?: string;
  cooking?: string;
}

export interface MenuRestaurantTranslation {
  name?: string;
  subtitle?: string;
  tagline?: string;
  footer?: MenuFooterTranslation;
}

export type MenuRestaurantI18n = Partial<Record<TranslationLang, MenuRestaurantTranslation>>;

export interface MenuNoteTranslation {
  kicker?: string;
  title?: string;
  text?: string;
}

export type MenuNoteI18n = Partial<Record<TranslationLang, MenuNoteTranslation>>;

export interface MenuNote {
  kicker: string;
  title: string;
  text: string;
  i18n?: MenuNoteI18n;
}

export interface MenuRestaurant {
  name: string;
  subtitle: string;
  tagline?: string;
  notes?: MenuNote[];
  footer: MenuFooter;
  i18n?: MenuRestaurantI18n;
}

export interface MenuSettings {
  siteUrl: string;
  currency: string;
  showQr: boolean;
}

export interface MenuItemTranslation {
  name?: string;
  portion?: string;
  description?: string;
}

export type MenuItemI18n = Partial<Record<TranslationLang, MenuItemTranslation>>;

export interface MenuItem {
  name: string;
  price: string;
  portion?: string;
  description?: string;
  hidden?: boolean;
  i18n?: MenuItemI18n;
}

export interface MenuCategoryTranslation {
  title?: string;
}

export type MenuCategoryI18n = Partial<Record<TranslationLang, MenuCategoryTranslation>>;

export interface MenuCategory {
  id: string;
  title: string;
  titleKz?: string;
  i18n?: MenuCategoryI18n;
  items: MenuItem[];
}

export interface Menu {
  restaurant: MenuRestaurant;
  settings: MenuSettings;
  categories: MenuCategory[];
}
