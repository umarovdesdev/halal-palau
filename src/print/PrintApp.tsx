import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  getPublicMenuUrl,
  loadMenu,
  Menu,
  MenuCategory,
  MenuItem,
  MenuNote,
  PrintLang,
} from '../data/store';
import {
  detectPrintLangFromUrl,
  getPrintCategoryKicker,
  getPrintCategoryTitle,
  getPrintItemDescription,
  getPrintItemName,
  getPrintItemPortion,
  getPrintNote,
  getPrintRestaurantFooter,
  getPrintRestaurantName,
  getPrintRestaurantSubtitle,
  getPrintRestaurantTagline,
  isValidPrintLang,
  PRINT_STRINGS,
} from '../i18n/ui';
import {
  packColumns,
  PackedCategoryFragment,
  PackedColumn,
  PackInputCategory,
} from './packColumns';
import { Logo, DiamondMotif } from '../components/Logo';
import defaultMenuData from '../../public/menu.json';

declare global {
  interface Window {
    __menuReady?: boolean;
    __menuScales?: number[];
    __menuColumnFills?: number[];
  }
}

export type PrintFormat = 'a3' | 'a4' | 'card';

interface IndexedCategory extends MenuCategory {
  orderNumber: string;
}

const initialMenu = defaultMenuData as unknown as Menu;

function getFormatFromUrl(): PrintFormat {
  const params = new URLSearchParams(window.location.search);
  const fmt = (params.get('format') || 'a3').toLowerCase();
  if (fmt === 'a4') return 'a4';
  if (fmt === 'card') return 'card';
  return 'a3';
}

function getFallbackDirectoryUrl(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  const indexUrl = new URL('./index.html', window.location.href);
  return indexUrl.href.replace(/index\.html$/, '');
}

function buildInitialUnmeasuredColumns(
  categories: IndexedCategory[],
  lang: PrintLang,
  numCols: number
): PackedColumn<MenuItem>[] {
  const synthInput: PackInputCategory<MenuItem>[] = categories.map((cat) => ({
    id: cat.id,
    orderNumber: cat.orderNumber,
    title: getPrintCategoryTitle(cat, lang),
    kicker: getPrintCategoryKicker(cat, lang),
    headerHeight: 34,
    continuationHeaderHeight: 24,
    itemGap: 8,
    items: cat.items.map((item) => ({
      data: item,
      height: getPrintItemDescription(item, lang) ? 32 : 18,
    })),
  }));
  const res = packColumns(synthInput, {
    columnMaxHeights: Array.from({ length: numCols }, () => 900),
    fragmentGap: 16,
  });
  return res.columns;
}

export const PrintApp: React.FC = () => {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [format, setFormat] = useState<PrintFormat>(getFormatFromUrl);
  const [lang, setLang] = useState<PrintLang>(detectPrintLangFromUrl);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [cardQrSvg, setCardQrSvg] = useState<string>('');
  const [scales, setScales] = useState<number[]>([1]);
  const [fitStatus, setFitStatus] = useState<'ok' | 'overflow'>('ok');
  const [packedColumns, setPackedColumns] = useState<PackedColumn<MenuItem>[] | null>(
    null
  );

  const sheetRefs = useRef<(HTMLElement | null)[]>([]);
  const measureSheetRef = useRef<HTMLDivElement | null>(null);
  const measureColRef = useRef<HTMLDivElement | null>(null);

  // Sync <html lang> with selected print language
  useEffect(() => {
    const htmlLang = lang === 'ru-kk' ? 'ru' : lang;
    document.documentElement.lang = htmlLang;
  }, [lang]);

  useEffect(() => {
    let mounted = true;
    loadMenu()
      .then((loaded) => {
        if (mounted) {
          setMenu(loaded);
          setMenuLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Ошибка загрузки меню для печати:', err);
        if (mounted) setMenuLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const publicMenuUrl = getPublicMenuUrl(menu);
  const effectiveCardUrl = publicMenuUrl || getFallbackDirectoryUrl();

  // Generate QR SVG for A3 / A4 footer if getPublicMenuUrl is non-null and settings.showQr is true
  useEffect(() => {
    const show = menu.settings?.showQr ?? true;
    if (!publicMenuUrl || !show) {
      setQrSvg('');
      return;
    }

    let active = true;
    QRCode.toString(publicMenuUrl, {
      type: 'svg',
      margin: 0,
      color: {
        dark: '#1D1A17',
        light: '#00000000',
      },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch((err) => {
        console.warn('Не удалось сгенерировать QR-код:', err);
        if (active) setQrSvg('');
      });

    return () => {
      active = false;
    };
  }, [publicMenuUrl, menu.settings?.showQr]);

  // Generate QR SVG for table cards (format=card)
  useEffect(() => {
    if (!effectiveCardUrl) {
      setCardQrSvg('');
      return;
    }

    let active = true;
    QRCode.toString(effectiveCardUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#1D1A17',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setCardQrSvg(svg);
      })
      .catch((err) => {
        console.warn('Не удалось сгенерировать QR-код для карточки:', err);
        if (active) setCardQrSvg('');
      });

    return () => {
      active = false;
    };
  }, [effectiveCardUrl]);

  const visibleCategories: IndexedCategory[] = useMemo(() => {
    return menu.categories
      .map((cat, idx) => ({
        ...cat,
        orderNumber: String(idx + 1).padStart(2, '0'),
        items: cat.items.filter((item) => item.hidden !== true),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu]);

  const validNotes: MenuNote[] = useMemo(() => {
    const rawNotes = menu.restaurant?.notes;
    if (!Array.isArray(rawNotes)) return [];
    return rawNotes
      .slice(0, 3)
      .filter((n) => n && (n.kicker?.trim() || n.title?.trim() || n.text?.trim()));
  }, [menu.restaurant?.notes]);

  const handleFormatSwitch = (nextFormat: PrintFormat) => {
    window.__menuReady = false;
    document.body.removeAttribute('data-fit');
    const url = new URL(window.location.href);
    url.searchParams.set('format', nextFormat);
    window.history.replaceState({}, '', url.toString());
    setPackedColumns(null);
    setFormat(nextFormat);
  };

  const handleLangSwitch = (nextLang: PrintLang) => {
    if (!isValidPrintLang(nextLang)) return;
    window.__menuReady = false;
    document.body.removeAttribute('data-fit');
    const url = new URL(window.location.href);
    url.searchParams.set('lang', nextLang);
    window.history.replaceState({}, '', url.toString());
    setPackedColumns(null);
    setLang(nextLang);
  };

  // Global AUTO-FIT + FLOWING COLUMN PACKING after fonts & menu are ready
  useLayoutEffect(() => {
    if (!menuLoaded) return;

    let cancelled = false;
    window.__menuReady = false;

    const runAutoFit = async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (cancelled) return;

      if (format === 'card') {
        if (!cardQrSvg && effectiveCardUrl) {
          return;
        }
        setScales([1]);
        setFitStatus('ok');
        document.body.setAttribute('data-fit', 'ok');
        document.body.setAttribute('data-scale', '1');
        window.__menuScales = [1];
        window.__menuReady = true;
        return;
      }

      const expectedSheets = format === 'a3' ? 1 : 2;
      const numCols = format === 'a3' ? 3 : 4;
      const measureSheet = measureSheetRef.current;
      const measureCol = measureColRef.current;

      if (!measureSheet || !measureCol) {
        return;
      }

      const spaceForScale = (s: number): number => {
        if (s < 1.0) {
          return +(Math.max(0.72, 0.72 + ((s - 0.6) / 0.4) * 0.28)).toFixed(2);
        }
        return 1.0;
      };

      const applyScaleAndSpaceToAll = (s: number, sp: number) => {
        measureSheet.style.setProperty('--scale', String(s));
        measureSheet.style.setProperty('--space', String(sp));
        for (let i = 0; i < expectedSheets; i++) {
          const sheet = sheetRefs.current[i];
          if (sheet) {
            sheet.style.setProperty('--scale', String(s));
            sheet.style.setProperty('--space', String(sp));
          }
        }
      };

      const measureAndPack = (s: number, sp: number, safetyFactor: number = 0.96) => {
        applyScaleAndSpaceToAll(s, sp);

        // 1. Measure available body height on each sheet
        const sheetBodyHeights: number[] = [];
        for (let i = 0; i < expectedSheets; i++) {
          const sheet = sheetRefs.current[i];
          if (!sheet) {
            sheetBodyHeights.push(800);
            continue;
          }
          const sheetStyle = window.getComputedStyle(sheet);
          const padTop = parseFloat(sheetStyle.paddingTop) || 0;
          const padBottom = parseFloat(sheetStyle.paddingBottom) || 0;
          const totalInnerH = sheet.clientHeight - padTop - padBottom;

          const headerEl = sheet.querySelector(
            '.print-header, .print-header-compact'
          ) as HTMLElement | null;
          let headerH = 0;
          if (headerEl) {
            const hStyle = window.getComputedStyle(headerEl);
            headerH =
              headerEl.getBoundingClientRect().height +
              (parseFloat(hStyle.marginBottom) || 0);
          }

          const footerEl = sheet.querySelector(
            '.print-footer, .print-sheet1-strip'
          ) as HTMLElement | null;
          let footerH = 0;
          if (footerEl) {
            const fStyle = window.getComputedStyle(footerEl);
            footerH =
              footerEl.getBoundingClientRect().height +
              (parseFloat(fStyle.marginTop) || 0);
          }

          sheetBodyHeights.push(Math.max(100, totalInnerH - headerH - footerH - 2));
        }

        const rawColMaxHeights =
          format === 'a3'
            ? [sheetBodyHeights[0], sheetBodyHeights[0], sheetBodyHeights[0]]
            : [
                sheetBodyHeights[0],
                sheetBodyHeights[0],
                sheetBodyHeights[1],
                sheetBodyHeights[1],
              ];

        // Account for editorial notes in the last column if present
        const noteEls = measureCol.querySelectorAll<HTMLElement>('[data-measure-note]');
        let notesTotalH = 0;
        noteEls.forEach((nEl) => {
          const nStyle = window.getComputedStyle(nEl);
          notesTotalH +=
            nEl.getBoundingClientRect().height +
            (parseFloat(nStyle.marginTop) || 0);
        });
        if (notesTotalH > 0) {
          rawColMaxHeights[numCols - 1] = Math.max(
            100,
            rawColMaxHeights[numCols - 1] - notesTotalH
          );
        }

        const effectiveColMaxHeights = rawColMaxHeights.map((h) => h * safetyFactor);

        // 2. Measure gaps
        const colStyle = window.getComputedStyle(measureCol);
        const fragmentGap =
          parseFloat(colStyle.rowGap || colStyle.gap || '0') || 15;

        const firstItemsList = measureCol.querySelector<HTMLElement>(
          '.print-items'
        );
        const itemGap = firstItemsList
          ? parseFloat(
              window.getComputedStyle(firstItemsList).rowGap ||
                window.getComputedStyle(firstItemsList).gap ||
                '0'
            ) || 7
          : 7;

        // 3. Measure every category header, continuation header, and item in a single read pass
        const packInput: PackInputCategory<MenuItem>[] = visibleCategories.map(
          (cat) => {
            const headerEl = measureCol.querySelector<HTMLElement>(
              `[data-measure-cat-header="${cat.id}"]`
            );
            const contEl = measureCol.querySelector<HTMLElement>(
              `[data-measure-cat-cont="${cat.id}"]`
            );

            let headerHeight = 34;
            if (headerEl) {
              const hs = window.getComputedStyle(headerEl);
              headerHeight =
                headerEl.getBoundingClientRect().height +
                (parseFloat(hs.marginBottom) || 0);
            }

            let continuationHeaderHeight = 24;
            if (contEl) {
              const cs = window.getComputedStyle(contEl);
              continuationHeaderHeight =
                contEl.getBoundingClientRect().height +
                (parseFloat(cs.marginBottom) || 0);
            }

            const items = cat.items.map((item, idx) => {
              const itemEl = measureCol.querySelector<HTMLElement>(
                `[data-measure-item="${cat.id}-${idx}"]`
              );
              const h = itemEl ? itemEl.getBoundingClientRect().height : 20;
              return {
                data: item,
                height: h,
              };
            });

            return {
              id: cat.id,
              orderNumber: cat.orderNumber,
              title: getPrintCategoryTitle(cat, lang),
              kicker: getPrintCategoryKicker(cat, lang),
              headerHeight,
              continuationHeaderHeight,
              itemGap,
              items,
            };
          }
        );

        const packed = packColumns(packInput, {
          columnMaxHeights: effectiveColMaxHeights,
          fragmentGap,
        });

        // Recompute fillRatio relative to rawColMaxHeights
        const normalizedColumns: PackedColumn<MenuItem>[] = packed.columns.map(
          (col, idx) => ({
            ...col,
            maxHeight: rawColMaxHeights[idx],
            fillRatio:
              rawColMaxHeights[idx] > 0
                ? col.usedHeight / rawColMaxHeights[idx]
                : 0,
          })
        );

        return {
          fits: packed.fits,
          columns: normalizedColumns,
          rawColMaxHeights,
        };
      };

      // Binary-search global scale in [0.60, 1.30] (step 0.01)
      let low = 60;
      let high = 130;
      let bestScale = 0.6;
      let bestSpace = 0.72;
      let bestResult = measureAndPack(0.6, 0.72, 0.985);

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candScale = +(mid / 100).toFixed(2);
        const candSpace = spaceForScale(candScale);
        const safety = candScale >= 0.95 ? 0.955 : 0.98;
        const evalRes = measureAndPack(candScale, candSpace, safety);

        if (evalRes.fits) {
          bestScale = candScale;
          bestSpace = candSpace;
          bestResult = evalRes;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // If average column fill at bestScale is below 0.86, expand --space slightly so columns fill evenly
      const avgFill =
        bestResult.columns.reduce((acc, c) => acc + c.fillRatio, 0) /
        Math.max(1, bestResult.columns.length);

      if (bestResult.fits && avgFill < 0.86 && bestSpace < 1.35) {
        let sLow = Math.round(bestSpace * 100);
        let sHigh = 135;
        while (sLow <= sHigh) {
          const sMid = Math.floor((sLow + sHigh) / 2);
          const candSpace = +(sMid / 100).toFixed(2);
          const evalRes = measureAndPack(bestScale, candSpace, 0.955);
          if (evalRes.fits) {
            bestSpace = candSpace;
            bestResult = evalRes;
            sLow = sMid + 1;
          } else {
            sHigh = sMid - 1;
          }
        }
      }

      if (cancelled) return;

      applyScaleAndSpaceToAll(bestScale, bestSpace);
      setPackedColumns(bestResult.columns);

      // Wait one animation frame for React to commit the packed columns into the actual sheets
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (cancelled) return;

      // Verify on actual rendered sheets that no sheet overflows; if needed, step down globally
      let finalScale = bestScale;
      let finalSpace = bestSpace;
      let finalColumns = bestResult.columns;

      const checkSheetsFit = (): boolean => {
        for (let i = 0; i < expectedSheets; i++) {
          const sheet = sheetRefs.current[i];
          if (!sheet) continue;
          const inner = sheet.querySelector('.print-sheet-inner') as HTMLElement | null;
          if (!inner) continue;
          const style = window.getComputedStyle(sheet);
          const padTop = parseFloat(style.paddingTop) || 0;
          const padBottom = parseFloat(style.paddingBottom) || 0;
          const availH = sheet.clientHeight - padTop - padBottom;

          inner.classList.add('is-measuring');
          const usedH = inner.scrollHeight;
          inner.classList.remove('is-measuring');

          if (usedH > availH + 2) {
            return false;
          }
        }
        return true;
      };

      let guard = 0;
      while (!checkSheetsFit() && guard < 15 && finalScale > 0.6) {
        guard += 1;
        finalScale = +(Math.max(0.6, finalScale - 0.01)).toFixed(2);
        finalSpace = spaceForScale(finalScale);
        const reEval = measureAndPack(finalScale, finalSpace, 0.95);
        finalColumns = reEval.columns;
        applyScaleAndSpaceToAll(finalScale, finalSpace);
        setPackedColumns(finalColumns);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;
      }

      const allSheetsFit = checkSheetsFit();
      const finalStatus: 'ok' | 'overflow' = allSheetsFit ? 'ok' : 'overflow';
      const equalScales = Array.from({ length: expectedSheets }, () => finalScale);
      const colFills = finalColumns.map((c) => +(c.fillRatio * 100).toFixed(1));

      setScales(equalScales);
      setFitStatus(finalStatus);
      document.body.setAttribute('data-fit', finalStatus);
      document.body.setAttribute('data-scale', equalScales.join(','));
      window.__menuScales = equalScales;
      window.__menuColumnFills = colFills;
      window.__menuReady = true;
    };

    runAutoFit();

    return () => {
      cancelled = true;
    };
  }, [
    menuLoaded,
    menu,
    format,
    lang,
    qrSvg,
    cardQrSvg,
    effectiveCardUrl,
    visibleCategories,
  ]);

  const currency = menu.settings?.currency || '₸';
  const printStrings = PRINT_STRINGS[lang];
  const restName = getPrintRestaurantName(menu.restaurant, lang);
  const restSubtitle = getPrintRestaurantSubtitle(menu.restaurant, lang);
  const restTagline = getPrintRestaurantTagline(menu.restaurant, lang) || '';
  const restFooter = getPrintRestaurantFooter(menu.restaurant, lang);

  const effectivePackedColumns: PackedColumn<MenuItem>[] = useMemo(() => {
    const numCols = format === 'a3' ? 3 : 4;
    if (packedColumns && packedColumns.length === numCols) {
      return packedColumns;
    }
    return buildInitialUnmeasuredColumns(visibleCategories, lang, numCols);
  }, [packedColumns, format, visibleCategories, lang]);

  const renderFragment = (
    frag: PackedCategoryFragment<MenuItem>,
    colIndex: number,
    fragIndex: number
  ) => (
    <section
      key={`${frag.categoryId}-${colIndex}-${fragIndex}`}
      className={`print-category ${frag.isContinuation ? 'is-continuation' : ''}`}
      data-category={frag.categoryId}
      data-continuation={frag.isContinuation ? 'true' : undefined}
    >
      {frag.isContinuation ? (
        <div className="print-category-header is-continuation">
          <div className="print-category-title-wrap">
            <h2 className="print-category-title is-continuation">
              <DiamondMotif className="diamond-icon print-cont-diamond" />
              <span>{frag.title}</span>
            </h2>
          </div>
        </div>
      ) : (
        <div className="print-category-header">
          <div className="print-category-title-wrap">
            {frag.kicker && (
              <span className="print-category-num">
                <DiamondMotif className="diamond-icon" />
                <span>{frag.kicker}</span>
              </span>
            )}
            <h2 className="print-category-title">{frag.title}</h2>
          </div>
        </div>
      )}

      <ul className="print-items">
        {frag.items.map((item, idx) => {
          const itemName = getPrintItemName(item, lang);
          const itemPortion = getPrintItemPortion(item, lang);
          const itemDesc = getPrintItemDescription(item, lang);
          return (
            <li
              key={`${frag.categoryId}-${colIndex}-${idx}-${item.name}`}
              className="print-item"
              data-item={itemName}
            >
              <div className="print-item-line">
                <div className="print-item-title-group">
                  <span className="print-item-name">{itemName}</span>
                  {itemPortion && (
                    <span className="print-item-portion">{itemPortion}</span>
                  )}
                </div>
                <div className="print-item-price">
                  <span>{item.price}</span>
                  <span className="print-item-currency">{currency}</span>
                </div>
              </div>
              {itemDesc && <p className="print-item-desc">{itemDesc}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );

  const renderFooter = () => (
    <footer className="print-footer">
      <div className="print-footer-texts">
        <span className="print-footer-item is-warning">
          <DiamondMotif className="diamond-icon" />
          <span>{restFooter.warning}</span>
        </span>
        <span className="print-footer-item">
          <DiamondMotif className="diamond-icon" />
          <span>{restFooter.service}</span>
        </span>
        <span className="print-footer-item">
          <DiamondMotif className="diamond-icon" />
          <span>{restFooter.cooking}</span>
        </span>
      </div>

      {qrSvg && menu.settings?.showQr && (
        <div className="print-qr-box" data-qr-url={publicMenuUrl || undefined}>
          <div
            className="print-qr-svg"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <span className="print-qr-caption">{printStrings.qrCaption}</span>
        </div>
      )}
    </footer>
  );

  const renderEditorialNote = (note: MenuNote, key: string, isMeasure = false) => {
    const localized = getPrintNote(note, lang);
    return (
      <aside
        key={key}
        className="print-editorial-note"
        {...(isMeasure ? { 'data-measure-note': key } : {})}
      >
        {localized.kicker && (
          <span className="print-editorial-note-kicker">
            <DiamondMotif className="diamond-icon" />
            <span>{localized.kicker}</span>
          </span>
        )}
        {localized.title && (
          <h3 className="print-editorial-note-title">{localized.title}</h3>
        )}
        {localized.text && (
          <p className="print-editorial-note-text">{localized.text}</p>
        )}
      </aside>
    );
  };

  return (
    <>
      <style>
        {format === 'a3'
          ? `@page { size: A3 portrait; margin: 0; }`
          : `@page { size: A4 portrait; margin: 0; }`}
      </style>

      <div className="print-toolbar" role="toolbar" aria-label="Панель печати">
        <div className="print-toolbar-inner">
          <div className="print-toolbar-left">
            <div className="print-format-group">
              <button
                type="button"
                className={`print-format-btn ${format === 'a3' ? 'is-active' : ''}`}
                onClick={() => handleFormatSwitch('a3')}
              >
                Формат A3 (1 лист)
              </button>
              <button
                type="button"
                className={`print-format-btn ${format === 'a4' ? 'is-active' : ''}`}
                onClick={() => handleFormatSwitch('a4')}
              >
                Формат A4 (2 листа)
              </button>
              <button
                type="button"
                className={`print-format-btn ${format === 'card' ? 'is-active' : ''}`}
                onClick={() => handleFormatSwitch('card')}
              >
                Карточки QR
              </button>
            </div>

            <select
              className="print-lang-select"
              aria-label="Язык печатного меню"
              value={lang}
              onChange={(e) => handleLangSwitch(e.target.value as PrintLang)}
            >
              <option value="ru-kk">Русский + Қазақша</option>
              <option value="kk">Қазақша</option>
              <option value="ru">Русский</option>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>

            <button
              type="button"
              className="print-download-btn"
              onClick={() => window.print()}
            >
              Скачать PDF
            </button>

            <span className="print-hint">
              Выберите «Сохранить как PDF», поля: нет, фон: включить
            </span>
          </div>

          <div className="print-toolbar-right">
            {format !== 'card' && (
              <span className="print-scale-badge">
                Авто-масштаб: {scales[0]?.toFixed(2)} ({fitStatus})
              </span>
            )}
            <a className="print-toolbar-link" href="./index.html">
              Онлайн-меню
            </a>
            <a className="print-toolbar-link" href="./admin.html">
              Админ-панель
            </a>
          </div>
        </div>
      </div>

      {/* Hidden Measuring Container with exact column width */}
      {format !== 'card' && (
        <div
          ref={measureSheetRef}
          className={`print-sheet ${
            format === 'a3' ? 'print-sheet-a3' : 'print-sheet-a4'
          } print-measure-container`}
          aria-hidden="true"
        >
          <div className={format === 'a3' ? 'print-grid-3' : 'print-grid-2'}>
            <div ref={measureColRef} className="print-col">
              {visibleCategories.map((cat) => {
                const catTitle = getPrintCategoryTitle(cat, lang);
                const catKicker = getPrintCategoryKicker(cat, lang);
                return (
                  <div key={`measure-${cat.id}`} className="print-category">
                    <div
                      className="print-category-header"
                      data-measure-cat-header={cat.id}
                    >
                      <div className="print-category-title-wrap">
                        {catKicker && (
                          <span className="print-category-num">
                            <DiamondMotif className="diamond-icon" />
                            <span>{catKicker}</span>
                          </span>
                        )}
                        <h2 className="print-category-title">{catTitle}</h2>
                      </div>
                    </div>

                    <div
                      className="print-category-header is-continuation"
                      data-measure-cat-cont={cat.id}
                    >
                      <div className="print-category-title-wrap">
                        <h2 className="print-category-title is-continuation">
                          <DiamondMotif className="diamond-icon print-cont-diamond" />
                          <span>{catTitle}</span>
                        </h2>
                      </div>
                    </div>

                    <ul className="print-items">
                      {cat.items.map((item, idx) => {
                        const itemName = getPrintItemName(item, lang);
                        const itemPortion = getPrintItemPortion(item, lang);
                        const itemDesc = getPrintItemDescription(item, lang);
                        return (
                          <li
                            key={`m-${cat.id}-${idx}`}
                            className="print-item"
                            data-measure-item={`${cat.id}-${idx}`}
                          >
                            <div className="print-item-line">
                              <div className="print-item-title-group">
                                <span className="print-item-name">{itemName}</span>
                                {itemPortion && (
                                  <span className="print-item-portion">
                                    {itemPortion}
                                  </span>
                                )}
                              </div>
                              <div className="print-item-price">
                                <span>{item.price}</span>
                                <span className="print-item-currency">{currency}</span>
                              </div>
                            </div>
                            {itemDesc && (
                              <p className="print-item-desc">{itemDesc}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {validNotes.map((note, idx) =>
                renderEditorialNote(note, `m-note-${idx}`, true)
              )}
            </div>
          </div>
        </div>
      )}

      <main className="print-stage">
        {format === 'card' ? (
          <article
            ref={(el) => {
              sheetRefs.current[0] = el;
            }}
            className="print-sheet print-sheet-cards"
            data-sheet="cards-1"
          >
            <div className="print-cards-grid">
              {[0, 1, 2, 3].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="print-table-card"
                  data-card={cardIdx + 1}
                  data-qr-url={effectiveCardUrl}
                >
                  <div className="print-table-card-frame">
                    <div className="print-table-card-top">
                      <Logo className="print-table-card-logo" title={restName} />
                      <h2 className="print-table-card-title">{restName}</h2>
                      <div className="print-table-card-subtitle-row">
                        <span className="print-table-card-line" aria-hidden="true" />
                        <span className="print-table-card-subtitle">
                          {restSubtitle || printStrings.cardSubtitle}
                        </span>
                        <span className="print-table-card-line" aria-hidden="true" />
                      </div>
                    </div>

                    <div
                      className="print-table-card-qr-wrap"
                      data-qr-url={effectiveCardUrl}
                    >
                      {cardQrSvg && (
                        <div
                          className="print-table-card-qr"
                          dangerouslySetInnerHTML={{ __html: cardQrSvg }}
                        />
                      )}
                    </div>

                    <div className="print-table-card-bottom">
                      <p className="print-table-card-cta-kz">
                        {printStrings.cardCtaPrimary}
                      </p>
                      {printStrings.cardCtaSecondary && (
                        <p className="print-table-card-cta-ru">
                          {printStrings.cardCtaSecondary}
                        </p>
                      )}
                      <div className="print-table-card-ornament" aria-hidden="true">
                        <DiamondMotif className="diamond-icon" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : format === 'a3' ? (
          <article
            ref={(el) => {
              sheetRefs.current[0] = el;
            }}
            className="print-sheet print-sheet-a3"
            data-sheet="a3-1"
          >
            <div className="print-sheet-inner">
              <header className="print-header">
                <div className="print-header-left">
                  <Logo className="print-logo" />
                  <div className="print-title-block">
                    {restTagline && (
                      <span className="print-kicker">
                        <DiamondMotif className="diamond-icon" />
                        <span>{restTagline}</span>
                      </span>
                    )}
                    <h1 className="print-restaurant-name">{restName}</h1>
                  </div>
                </div>
                <div className="print-header-right">
                  <p className="print-subtitle">{restSubtitle}</p>
                  <span className="print-header-meta">{restFooter.cooking}</span>
                </div>
              </header>

              <div className="print-body">
                <div className="print-grid-3">
                  {effectivePackedColumns.slice(0, 3).map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className="print-col"
                      data-col-index={colIdx}
                      data-col-fill={(col.fillRatio * 100).toFixed(1)}
                    >
                      {col.fragments.map((frag, fragIdx) =>
                        renderFragment(frag, colIdx, fragIdx)
                      )}
                      {colIdx === 2 &&
                        validNotes.map((note, noteIdx) =>
                          renderEditorialNote(note, `a3-note-${noteIdx}`)
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {renderFooter()}
            </div>
          </article>
        ) : (
          <>
            {/* A4 Sheet 1 */}
            <article
              ref={(el) => {
                sheetRefs.current[0] = el;
              }}
              className="print-sheet print-sheet-a4"
              data-sheet="a4-1"
            >
              <div className="print-sheet-inner">
                <header className="print-header">
                  <div className="print-header-left">
                    <Logo className="print-logo" />
                    <div className="print-title-block">
                      {restTagline && (
                        <span className="print-kicker">
                          <DiamondMotif className="diamond-icon" />
                          <span>{restTagline}</span>
                        </span>
                      )}
                      <h1 className="print-restaurant-name">{restName}</h1>
                    </div>
                  </div>
                  <div className="print-header-right">
                    <p className="print-subtitle">{restSubtitle}</p>
                    <span className="print-header-meta">{restFooter.service}</span>
                  </div>
                </header>

                <div className="print-body">
                  <div className="print-grid-2">
                    {effectivePackedColumns.slice(0, 2).map((col, colIdx) => (
                      <div
                        key={colIdx}
                        className="print-col"
                        data-col-index={colIdx}
                        data-col-fill={(col.fillRatio * 100).toFixed(1)}
                      >
                        {col.fragments.map((frag, fragIdx) =>
                          renderFragment(frag, colIdx, fragIdx)
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="print-sheet1-strip">
                  <span>{restFooter.cooking}</span>
                  <span className="print-sheet1-strip-page">
                    {printStrings.a4Sheet1PageLabel}
                  </span>
                </div>
              </div>
            </article>

            {/* A4 Sheet 2 */}
            <article
              ref={(el) => {
                sheetRefs.current[1] = el;
              }}
              className="print-sheet print-sheet-a4"
              data-sheet="a4-2"
            >
              <div className="print-sheet-inner">
                <header className="print-header-compact">
                  <div className="print-header-compact-left">
                    <Logo className="print-logo-small" />
                    <div>
                      <h2 className="print-compact-title">{restName}</h2>
                      <p className="print-compact-subtitle">{restSubtitle}</p>
                    </div>
                  </div>
                  <span className="print-sheet1-strip-page">
                    {printStrings.a4Sheet2PageLabel}
                  </span>
                </header>

                <div className="print-body">
                  <div className="print-grid-2">
                    {effectivePackedColumns.slice(2, 4).map((col, idx) => {
                      const globalColIdx = idx + 2;
                      return (
                        <div
                          key={globalColIdx}
                          className="print-col"
                          data-col-index={globalColIdx}
                          data-col-fill={(col.fillRatio * 100).toFixed(1)}
                        >
                          {col.fragments.map((frag, fragIdx) =>
                            renderFragment(frag, globalColIdx, fragIdx)
                          )}
                          {globalColIdx === 3 &&
                            validNotes.map((note, noteIdx) =>
                              renderEditorialNote(note, `a4-note-${noteIdx}`)
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {renderFooter()}
              </div>
            </article>
          </>
        )}
      </main>
    </>
  );
};
