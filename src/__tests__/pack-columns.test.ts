import { describe, it, expect } from 'vitest';
import { packColumns, type PackInputCategory } from '../print/packColumns';
import defaultMenuData from '../../public/menu.json';
import type { Menu, MenuItem } from '../types/menu';

const menu = defaultMenuData as unknown as Menu;

function buildInputFromMenu(
  customMenu: Menu = menu,
  scale: number = 1.0
): PackInputCategory<MenuItem>[] {
  return customMenu.categories.map((cat, idx) => ({
    id: cat.id,
    orderNumber: String(idx + 1).padStart(2, '0'),
    title: cat.title,
    kicker: cat.titleKz || 'БӨЛІМ',
    headerHeight: 36 * scale,
    continuationHeaderHeight: 24 * scale,
    itemGap: 8 * scale,
    items: cat.items.map((item) => ({
      data: item,
      height: (item.description ? 34 : 20) * scale,
    })),
  }));
}

describe('Column packing (packColumns)', () => {
  it('places all 67 items in exact menu order across 4 A4 columns and 3 A3 columns without splitting any item', () => {
    const input = buildInputFromMenu();
    const expectedItems = menu.categories.flatMap((c) => c.items.map((i) => i.name));
    expect(expectedItems.length).toBe(67);

    // Pack into 4 A4 columns
    const a4Res = packColumns(input, {
      columnMaxHeights: [920, 920, 900, 900],
      fragmentGap: 16,
    });
    expect(a4Res.fits).toBe(true);
    expect(a4Res.columns.length).toBe(4);

    const a4Placed = a4Res.columns.flatMap((col) =>
      col.fragments.flatMap((frag) => frag.items.map((i) => i.name))
    );
    expect(a4Placed.length).toBe(67);
    expect(a4Placed).toEqual(expectedItems);

    // Pack into 3 A3 columns
    const a3Res = packColumns(input, {
      columnMaxHeights: [1320, 1320, 1320],
      fragmentGap: 16,
    });
    expect(a3Res.fits).toBe(true);
    expect(a3Res.columns.length).toBe(3);

    const a3Placed = a3Res.columns.flatMap((col) =>
      col.fragments.flatMap((frag) => frag.items.map((i) => i.name))
    );
    expect(a3Placed.length).toBe(67);
    expect(a3Placed).toEqual(expectedItems);
  });

  it('never leaves a category title alone at the bottom of a column and never leaves a single orphan item in a continuation', () => {
    const input = buildInputFromMenu();
    const catSizes = new Map(menu.categories.map((c) => [c.id, c.items.length]));

    const res = packColumns(input, {
      columnMaxHeights: [620, 620, 600, 600],
      fragmentGap: 16,
    });

    for (const col of res.columns) {
      for (const frag of col.fragments) {
        // Every fragment has at least 1 item (never a lone title with 0 items)
        expect(frag.items.length).toBeGreaterThanOrEqual(1);

        const totalInCat = catSizes.get(frag.categoryId) ?? 0;
        // If the category has >= 4 items (or if this fragment is part of a split category),
        // every fragment must have >= 2 items (no lone title with 1 item at bottom, no 1-item orphan at top)
        if (totalInCat >= 4 || frag.isContinuation) {
          expect(frag.items.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('marks continuation fragments with isContinuation=true and balances the last column (>= 50% fill)', () => {
    // Add 15 extra items to "Вторые блюда" (overflow scenario)
    const cloned: Menu = JSON.parse(JSON.stringify(menu));
    const mains = cloned.categories.find((c) => c.id === 'mains' || c.title === 'Вторые блюда')!;
    for (let k = 1; k <= 15; k++) {
      mains.items.push({
        name: `Дополнительное блюдо ${k}`,
        price: '2400',
        portion: '300 г',
        description: 'Говядина, рис лазер, морковь, нут, специи',
      });
    }

    const input = buildInputFromMenu(cloned, 0.85);
    const res = packColumns(input, {
      columnMaxHeights: [920, 920, 900, 900],
      fragmentGap: 14,
    });

    expect(res.fits).toBe(true);
    const allPlaced = res.columns.flatMap((c) => c.fragments.flatMap((f) => f.items));
    expect(allPlaced.length).toBe(67 + 15);

    // Check that mains was split across columns with a continuation fragment
    const mainsFragments = res.columns.flatMap((c) =>
      c.fragments.filter((f) => f.categoryId === mains.id)
    );
    expect(mainsFragments.length).toBeGreaterThanOrEqual(2);
    expect(mainsFragments[0].isContinuation).toBe(false);
    for (let i = 1; i < mainsFragments.length; i++) {
      expect(mainsFragments[i].isContinuation).toBe(true);
      expect(mainsFragments[i].items.length).toBeGreaterThanOrEqual(2);
    }

    // Last column fill ratio >= 50%
    const lastCol = res.columns[res.columns.length - 1];
    expect(lastCol.fillRatio).toBeGreaterThanOrEqual(0.5);
  });

  it('refuses to place a category title with fewer than 2 items at the bottom of a column when the category is split', () => {
    const categories: PackInputCategory<{ name: string }>[] = [
      {
        id: 'cat-a',
        orderNumber: '01',
        title: 'Категория А',
        headerHeight: 30,
        continuationHeaderHeight: 20,
        itemGap: 5,
        items: [
          { data: { name: 'A1' }, height: 40 },
          { data: { name: 'A2' }, height: 40 },
          { data: { name: 'A3' }, height: 40 },
          { data: { name: 'A4' }, height: 40 },
        ],
      },
      {
        id: 'cat-b',
        orderNumber: '02',
        title: 'Категория Б',
        headerHeight: 30,
        continuationHeaderHeight: 20,
        itemGap: 5,
        // Suppose column 0 has just enough room after cat-a for cat-b's header (30) + 1 item (40),
        // but NOT 2 items. packColumns must NOT split cat-b as 1 + 4; it must either move cat-b
        // to column 1 or split cat-a so cat-b has >= 2 items in column 0.
        items: [
          { data: { name: 'B1' }, height: 40 },
          { data: { name: 'B2' }, height: 40 },
          { data: { name: 'B3' }, height: 40 },
          { data: { name: 'B4' }, height: 40 },
          { data: { name: 'B5' }, height: 40 },
        ],
      },
    ];

    // cat-a total = 30 + 4*40 + 3*5 = 205.
    // With maxHeight = 290, remaining in col 0 after cat-a is 85 (minus fragmentGap 10 = 75),
    // which fits header (30) + B1 (40) = 70, but NOT header + B1 + B2 = 115.
    const res = packColumns(categories, {
      columnMaxHeights: [290, 290],
      fragmentGap: 10,
    });

    expect(res.fits).toBe(true);
    for (const col of res.columns) {
      for (const frag of col.fragments) {
        expect(frag.items.length).toBeGreaterThanOrEqual(2);
      }
    }
    const allNames = res.columns.flatMap((c) => c.fragments.flatMap((f) => f.items.map((x) => x.name)));
    expect(allNames).toEqual(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'B5']);
  });
});
