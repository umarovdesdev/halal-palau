import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Moon, Sun } from '@phosphor-icons/react';
import { loadMenu, Menu } from '../data/store';
import type { Lang } from '../types/menu';
import { Logo, DiamondMotif } from '../components/Logo';
import { LangDropdown } from './LangDropdown';
import {
  GirihLattice,
  OrnamentBorderBand,
  OrnamentCorner,
  QoshqarMuizMotif,
} from './ornaments';
import {
  detectInitialLang,
  getCategoryTitle,
  getItemDescription,
  getItemName,
  getItemPortion,
  getRestaurantFooter,
  getRestaurantName,
  getRestaurantSubtitle,
  getRestaurantTagline,
  isValidLang,
  LANGUAGES,
  LANG_STORAGE_KEY,
  THEME_STORAGE_KEY,
  UI_STRINGS,
} from '../i18n/ui';
import defaultMenuData from '../../public/menu.json';

const initialMenu = defaultMenuData as unknown as Menu;

export type ThemeMode = 'color' | 'dark';

function detectInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'color';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme')?.trim().toLowerCase();
    if (urlTheme === 'color' || urlTheme === 'dark') {
      return urlTheme;
    }
  } catch {
    // ignore
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)?.trim().toLowerCase();
    if (saved === 'color' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore
  }
  try {
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'color';
}

export const OnlineMenuApp: React.FC = () => {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [lang, setLang] = useState<Lang>(() => detectInitialLang());
  const [theme, setTheme] = useState<ThemeMode>(() => detectInitialTheme());
  const [isFadingText, setIsFadingText] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    initialMenu.categories[0]?.id ?? ''
  );

  const stickyBarRef = useRef<HTMLDivElement | null>(null);
  const chipsContainerRef = useRef<HTMLElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScroll = useRef(false);
  const fadeTimeoutRef = useRef<number | null>(null);

  const ui = UI_STRINGS[lang];
  const currency = menu.settings?.currency || '₸';
  const restaurantName = getRestaurantName(menu.restaurant, lang);
  const restaurantSubtitle = getRestaurantSubtitle(menu.restaurant, lang);
  const restaurantTagline = getRestaurantTagline(menu.restaurant, lang);
  const restaurantFooter = getRestaurantFooter(menu.restaurant, lang);

  // Measure sticky bar height via ResizeObserver -> CSS variable --sticky-bar-height
  useLayoutEffect(() => {
    const barEl = stickyBarRef.current;
    if (!barEl) return;

    const updateBarHeight = () => {
      const h = Math.round(barEl.getBoundingClientRect().height || barEl.offsetHeight || 92);
      if (h > 0) {
        document.documentElement.style.setProperty('--sticky-bar-height', `${h}px`);
      }
    };

    updateBarHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateBarHeight();
      });
      observer.observe(barEl);
    }

    window.addEventListener('resize', updateBarHeight, { passive: true });
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateBarHeight);
    };
  }, [lang]);

  // Sync <html lang>, document.title, <meta name="description">, and URL ?lang= parameter
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = ui.documentTitle(restaurantName, restaurantSubtitle);
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', ui.metaDescription);
    }

    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('lang') !== lang) {
        url.searchParams.set('lang', lang);
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      // ignore
    }
  }, [lang, restaurantName, restaurantSubtitle, ui]);

  // Listen to popstate for URL lang changes
  useEffect(() => {
    const onPopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang')?.trim().toLowerCase();
        if (isValidLang(urlLang)) {
          setLang(urlLang);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Sync data-theme="color"|"dark" on :root and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#16120F' : '#9E3B19');
    }
  }, [theme]);

  // Load menu data
  useEffect(() => {
    let mounted = true;
    loadMenu()
      .then((loaded) => {
        if (mounted) {
          setMenu(loaded);
          if (loaded.categories.length > 0 && !activeCategoryId) {
            setActiveCategoryId(loaded.categories[0].id);
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectLang = (nextLang: Lang) => {
    if (nextLang === lang) return;
    const scrollYBefore = window.scrollY;
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
    }
    setIsFadingText(true);
    setLang(nextLang);
    // Preserve scroll position on language change
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollYBefore, behavior: 'instant' as ScrollBehavior });
    });
    fadeTimeoutRef.current = window.setTimeout(() => {
      setIsFadingText(false);
    }, 150);
  };

  const handleToggleTheme = () => {
    const scrollYBefore = window.scrollY;
    setTheme((prev) => (prev === 'color' ? 'dark' : 'color'));
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollYBefore, behavior: 'instant' as ScrollBehavior });
    });
  };

  const visibleCategories = useMemo(() => {
    return menu.categories
      .map((cat, index) => {
        const visibleItems = cat.items.filter((item) => item.hidden !== true);
        return {
          ...cat,
          accentIndex: index % 3,
          items: visibleItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [menu]);

  // Scroll-spy for category sections + back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 320);

      if (isProgrammaticScroll.current || visibleCategories.length === 0) return;
      const barHeight = stickyBarRef.current?.getBoundingClientRect().height || 92;
      const offset = barHeight + 48;
      let currentId = visibleCategories[0].id;

      for (const cat of visibleCategories) {
        const el = document.getElementById(`cat-${cat.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            currentId = cat.id;
          } else {
            break;
          }
        }
      }

      setActiveCategoryId((prev) => (prev !== currentId ? currentId : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCategories]);

  // Keep active chip scrolled into view horizontally
  useEffect(() => {
    const chip = chipRefs.current[activeCategoryId];
    if (chip && typeof chip.scrollIntoView === 'function') {
      chip.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [activeCategoryId]);

  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const chip = chipRefs.current[catId];
    if (chip && typeof chip.scrollIntoView === 'function') {
      chip.scrollIntoView({ inline: 'center', block: 'nearest' });
    }

    const sectionEl = document.getElementById(`cat-${catId}`);
    if (sectionEl) {
      isProgrammaticScroll.current = true;
      const barHeight = stickyBarRef.current?.getBoundingClientRect().height || 92;
      const rect = sectionEl.getBoundingClientRect();
      const targetScrollY = Math.max(0, window.scrollY + rect.top - (barHeight + 8));
      window.scrollTo({ top: targetScrollY, behavior: 'instant' as ScrollBehavior });
      window.setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 250);
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="online-root">
      <a className="online-skip-link" href="#online-main-content">
        {ui.skipToMenu}
      </a>

      <div className="online-layout">
        <div className="online-center-column">
          {/* HERO HEADER */}
          <header className="online-hero">
            <div className="online-hero-lattice" aria-hidden="true">
              <GirihLattice className="online-hero-lattice-svg" />
            </div>

            <div
              className={`online-hero-content ${
                isFadingText ? 'is-text-fading' : ''
              }`}
            >
              <div className="online-hero-logo-col">
                <div className="online-logo-medallion">
                  <Logo className="online-logo" title={restaurantName} />
                </div>
              </div>

              <div className="online-hero-text-col">
                {restaurantTagline && (
                  <div className="online-hero-kicker">
                    <DiamondMotif className="diamond-icon" />
                    <span>{restaurantTagline}</span>
                    <DiamondMotif className="diamond-icon" />
                  </div>
                )}

                <h1 className="online-title">{restaurantName}</h1>

                <div className="online-subtitle-row">
                  <span className="online-subtitle-line" aria-hidden="true" />
                  <p className="online-subtitle">{restaurantSubtitle}</p>
                  <span className="online-subtitle-line" aria-hidden="true" />
                </div>

                <div className="online-meta-pills">
                  <span className="online-meta-pill">
                    <DiamondMotif className="diamond-icon" />
                    <span>{restaurantFooter.cooking}</span>
                  </span>
                  <span className="online-meta-pill">
                    <DiamondMotif className="diamond-icon" />
                    <span>{restaurantFooter.service}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="online-hero-band" aria-hidden="true">
              <OrnamentBorderBand className="online-ornament-band-svg" />
            </div>
          </header>

          {/* UNIFIED STICKY TOP BAR (Phone, Tablet & Desktop) */}
          <div className="online-sticky-bar" ref={stickyBarRef}>
            <div className="online-sticky-inner">
              <div className="online-sticky-row">
              {/* Row 2: Category Chips with Scroll-Spy */}
              {visibleCategories.length > 0 && (
                <nav
                  className="online-chips-scroll"
                  ref={chipsContainerRef}
                  aria-label={ui.categoriesNavAria}
                >
                  {visibleCategories.map((cat) => {
                    const isActive = cat.id === activeCategoryId;
                    const catTitle = getCategoryTitle(cat, lang);
                    return (
                      <button
                        key={cat.id}
                        ref={(el) => {
                          chipRefs.current[cat.id] = el;
                        }}
                        type="button"
                        className={`online-chip ${isActive ? 'is-active' : ''}`}
                        data-accent={cat.accentIndex}
                        data-cat-id={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        title={catTitle}
                      >
                        <span>{catTitle}</span>
                      </button>
                    );
                  })}
                </nav>
              )}

                <div className="online-sticky-actions">
                  <LangDropdown lang={lang} ariaLabel={ui.langSwitcherAria} onSelect={handleSelectLang} />
                  <button
                    type="button"
                    className="online-theme-toggle"
                    onClick={handleToggleTheme}
                    aria-label={ui.themeToggleAria(theme)}
                    title={ui.themeToggleAria(theme)}
                    data-theme-toggle={theme}
                  >
                    {theme === 'color' ? (
                      <Moon className="online-theme-icon" weight="bold" aria-hidden="true" />
                    ) : (
                      <Sun className="online-theme-icon" weight="bold" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="online-sticky-band" aria-hidden="true">
              <OrnamentBorderBand className="online-sticky-band-svg" />
            </div>
          </div>

          {/* MAIN MENU CONTENT */}
          <main
            id="online-main-content"
            className={`online-main ${isFadingText ? 'is-text-fading' : ''}`}
          >
            {visibleCategories.map((cat) => {
                const catTitle = getCategoryTitle(cat, lang);
                return (
                  <section
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    className="online-category"
                    data-accent={cat.accentIndex}
                    aria-labelledby={`heading-${cat.id}`}
                  >
                    <div className="online-category-header">
                      <OrnamentCorner
                        position="top-left"
                        className="online-cat-corner is-tl"
                      />
                      <OrnamentCorner
                        position="top-right"
                        className="online-cat-corner is-tr"
                      />

                      <div className="online-category-title-group">
                        <h2 id={`heading-${cat.id}`} className="online-category-title">
                          {catTitle}
                        </h2>
                      </div>

                      <div className="online-category-header-right">
                        <QoshqarMuizMotif className="online-category-motif" />
                        <span className="online-category-count">
                          {ui.formatItemsCount(cat.items.length)}
                        </span>
                      </div>
                    </div>

                    <ul className="online-items-list">
                      {cat.items.map((item, idx) => {
                        const itemName = getItemName(item, lang);
                        const itemPortion = getItemPortion(item, lang);
                        const itemDesc = getItemDescription(item, lang);
                        return (
                          <li
                            key={`${cat.id}-${idx}-${item.name}`}
                            className="online-item"
                            data-item={item.name}
                          >
                            <OrnamentCorner
                              position="top-right"
                              className="online-item-corner"
                            />
                            <div className="online-item-top">
                              <div className="online-item-heading">
                                <h3 className="online-item-name">{itemName}</h3>
                                {itemPortion && (
                                  <span className="online-item-portion">
                                    {itemPortion}
                                  </span>
                                )}
                              </div>
                              <div className="online-item-price">
                                <span>{item.price}</span>
                                <span className="online-item-currency">{currency}</span>
                              </div>
                            </div>
                            {itemDesc && (
                              <p className="online-item-description">{itemDesc}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
          </main>

          {/* FOOTER */}
          <footer
            className={`online-footer ${isFadingText ? 'is-text-fading' : ''}`}
          >
            <div className="online-footer-band" aria-hidden="true">
              <OrnamentBorderBand className="online-ornament-band-svg" />
            </div>

            <div className="online-footer-divider" aria-hidden="true">
              <QoshqarMuizMotif className="online-footer-motif" />
            </div>

            <div className="online-footer-cards">
              <div className="online-footer-card is-warning">
                <span className="online-footer-card-kicker">
                  {ui.footerWarningHeading}
                </span>
                <p className="online-footer-card-text">{restaurantFooter.warning}</p>
              </div>
              <div className="online-footer-card">
                <span className="online-footer-card-kicker">
                  {ui.footerServiceHeading}
                </span>
                <p className="online-footer-card-text">{restaurantFooter.service}</p>
              </div>
              <div className="online-footer-card">
                <span className="online-footer-card-kicker">
                  {ui.footerCookingHeading}
                </span>
                <p className="online-footer-card-text">{restaurantFooter.cooking}</p>
              </div>
            </div>

            <div className="online-footer-links">
              <a className="online-admin-link" href="./admin.html">
                {ui.adminLink}
              </a>
            </div>
          </footer>
        </div>
      </div>

      {/* FLOATING BACK TO TOP BUTTON */}
      <button
        type="button"
        className={`online-back-to-top ${showBackToTop ? 'is-visible' : ''}`}
        onClick={handleScrollToTop}
        aria-label={ui.backToTopAria}
        title={ui.backToTopAria}
      >
        <ArrowUp weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
};
