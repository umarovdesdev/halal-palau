export interface PackInputItem<T = unknown> {
  data: T;
  height: number;
}

export interface PackInputCategory<T = unknown> {
  id: string;
  orderNumber: string;
  title: string;
  kicker?: string;
  headerHeight: number;
  continuationHeaderHeight: number;
  itemGap: number;
  items: PackInputItem<T>[];
}

export interface PackOptions {
  columnMaxHeights: number[];
  fragmentGap: number;
}

export interface PackedCategoryFragment<T = unknown> {
  categoryId: string;
  orderNumber: string;
  title: string;
  kicker?: string;
  isContinuation: boolean;
  items: T[];
  height: number;
}

export interface PackedColumn<T = unknown> {
  columnIndex: number;
  fragments: PackedCategoryFragment<T>[];
  usedHeight: number;
  maxHeight: number;
  fillRatio: number;
}

export interface PackColumnsResult<T = unknown> {
  columns: PackedColumn<T>[];
  fits: boolean;
  maxOverflow: number;
}

interface FlatItemRef<T> {
  catIdx: number;
  itemIdxInCat: number;
  catLength: number;
  item: PackInputItem<T>;
}

/**
 * Packs menu categories and items in reading order across columns/pages.
 *
 * Rules enforced:
 * 1. Exact menu order is preserved for categories and items.
 * 2. Never split a single item.
 * 3. Never leave a category title alone at the bottom of a column
 *    (a category title is followed by >= 2 items in the same column whenever split,
 *    or all items of the category if the category has < 4 items).
 * 4. Avoid leaving a single orphan item at the top of a column
 *    (every fragment of a split category has >= 2 items).
 * 5. Columns are balanced around the target fill ratio so the last column is not mostly empty.
 */
export function packColumns<T = unknown>(
  rawCategories: PackInputCategory<T>[],
  options: PackOptions
): PackColumnsResult<T> {
  const { columnMaxHeights, fragmentGap } = options;
  const numCols = columnMaxHeights.length;

  if (numCols === 0) {
    return { columns: [], fits: true, maxOverflow: 0 };
  }

  const categories = rawCategories.filter((c) => c.items.length > 0);
  if (categories.length === 0) {
    return {
      columns: columnMaxHeights.map((maxH, idx) => ({
        columnIndex: idx,
        fragments: [],
        usedHeight: 0,
        maxHeight: maxH,
        fillRatio: 0,
      })),
      fits: true,
      maxOverflow: 0,
    };
  }

  // Flatten items while keeping category metadata and prefix sums per category
  const flatItems: FlatItemRef<T>[] = [];
  const catStartGlobalIdx: number[] = [];
  const catPrefixHeights: number[][] = [];

  categories.forEach((cat, catIdx) => {
    catStartGlobalIdx.push(flatItems.length);
    const prefix: number[] = [0];
    cat.items.forEach((item, itemIdxInCat) => {
      flatItems.push({
        catIdx,
        itemIdxInCat,
        catLength: cat.items.length,
        item,
      });
      prefix.push(prefix[prefix.length - 1] + item.height);
    });
    catPrefixHeights.push(prefix);
  });

  const totalItems = flatItems.length;

  // Determine which cut positions p in [0 .. totalItems] obey the >= 2 items rule:
  // A cut at p is valid if p is at a category boundary (p=0, p=totalItems, or itemIdxInCat === 0)
  // OR if the category is split with >= 2 items before p and >= 2 items from p onwards.
  const isCutPointValid = (p: number): boolean => {
    if (p <= 0 || p >= totalItems) return true;
    const ref = flatItems[p];
    if (ref.itemIdxInCat === 0) return true;
    // Inside a category: require >= 2 items before the split and >= 2 items remaining
    return ref.itemIdxInCat >= 2 && ref.catLength - ref.itemIdxInCat >= 2;
  };

  // Check if a slice [s, e) is valid as a single column's item range
  const isSliceValid = (s: number, e: number): boolean => {
    if (s === e) return true;
    if (s > e) return false;
    if (!isCutPointValid(s) || !isCutPointValid(e)) return false;

    const startRef = flatItems[s];
    const endLastRef = flatItems[e - 1];

    // If the column starts and ends within the same category and splits it on either side,
    // require at least 2 items in this fragment (unless it's the entire category of 1 item).
    if (startRef.catIdx === endLastRef.catIdx) {
      const count = e - s;
      if (count < startRef.catLength && count < 2) {
        return false;
      }
    }
    return true;
  };

  // Fast height & continuation count computation for a column slice [s, e)
  const evaluateSlice = (
    s: number,
    e: number
  ): { height: number; continuations: number } => {
    if (s >= e) return { height: 0, continuations: 0 };

    const firstCatIdx = flatItems[s].catIdx;
    const lastCatIdx = flatItems[e - 1].catIdx;

    let totalHeight = 0;
    let fragCount = 0;
    let continuations = 0;

    for (let cIdx = firstCatIdx; cIdx <= lastCatIdx; cIdx++) {
      const cat = categories[cIdx];
      const catGlobalStart = catStartGlobalIdx[cIdx];
      const catGlobalEnd = catGlobalStart + cat.items.length;

      const subStart = Math.max(s, catGlobalStart) - catGlobalStart;
      const subEnd = Math.min(e, catGlobalEnd) - catGlobalStart;
      const itemCount = subEnd - subStart;
      if (itemCount <= 0) continue;

      const isContinuation = subStart > 0;
      if (isContinuation) {
        continuations += 1;
      }

      const headerH = isContinuation
        ? cat.continuationHeaderHeight
        : cat.headerHeight;
      const itemsH =
        catPrefixHeights[cIdx][subEnd] -
        catPrefixHeights[cIdx][subStart] +
        Math.max(0, itemCount - 1) * cat.itemGap;

      totalHeight += headerH + itemsH;
      fragCount += 1;
    }

    if (fragCount > 1) {
      totalHeight += (fragCount - 1) * fragmentGap;
    }

    return { height: totalHeight, continuations };
  };

  // Build actual PackedCategoryFragment objects for a chosen slice [s, e)
  const buildColumnFragments = (s: number, e: number): PackedCategoryFragment<T>[] => {
    if (s >= e) return [];
    const firstCatIdx = flatItems[s].catIdx;
    const lastCatIdx = flatItems[e - 1].catIdx;
    const fragments: PackedCategoryFragment<T>[] = [];

    for (let cIdx = firstCatIdx; cIdx <= lastCatIdx; cIdx++) {
      const cat = categories[cIdx];
      const catGlobalStart = catStartGlobalIdx[cIdx];
      const catGlobalEnd = catGlobalStart + cat.items.length;

      const subStart = Math.max(s, catGlobalStart) - catGlobalStart;
      const subEnd = Math.min(e, catGlobalEnd) - catGlobalStart;
      const itemCount = subEnd - subStart;
      if (itemCount <= 0) continue;

      const isContinuation = subStart > 0;
      const headerH = isContinuation
        ? cat.continuationHeaderHeight
        : cat.headerHeight;
      const itemsH =
        catPrefixHeights[cIdx][subEnd] -
        catPrefixHeights[cIdx][subStart] +
        Math.max(0, itemCount - 1) * cat.itemGap;

      fragments.push({
        categoryId: cat.id,
        orderNumber: cat.orderNumber,
        title: cat.title,
        kicker: cat.kicker,
        isContinuation,
        items: cat.items.slice(subStart, subEnd).map((it) => it.data),
        height: headerH + itemsH,
      });
    }

    return fragments;
  };

  // Estimate target fill ratio across all columns
  const singleSliceTotal = evaluateSlice(0, totalItems).height;
  const totalCapacity = columnMaxHeights.reduce((a, b) => a + Math.max(1, b), 0);
  const targetFillRatio = Math.min(
    0.96,
    (singleSliceTotal + (numCols - 1) * fragmentGap) / Math.max(1, totalCapacity)
  );

  // Collect all valid cut indices in [0 .. totalItems]
  const validCuts: number[] = [];
  for (let p = 0; p <= totalItems; p++) {
    if (isCutPointValid(p)) {
      validCuts.push(p);
    }
  }

  // Precompute slice validity and metrics for pairs of valid cuts
  const numCuts = validCuts.length;
  const sliceHeight = new Float64Array(numCuts * numCuts);
  const sliceCont = new Uint8Array(numCuts * numCuts);
  const sliceOk = new Uint8Array(numCuts * numCuts);

  for (let i = 0; i < numCuts; i++) {
    const s = validCuts[i];
    for (let j = i; j < numCuts; j++) {
      const e = validCuts[j];
      const idx = i * numCuts + j;
      if (isSliceValid(s, e)) {
        sliceOk[idx] = 1;
        const evalRes = evaluateSlice(s, e);
        sliceHeight[idx] = evalRes.height;
        sliceCont[idx] = evalRes.continuations;
      }
    }
  }

  // Dynamic programming over (colIdx, endCutIdx)
  // Track two passes:
  // Pass A: Strictly fitting partitions (overflow === 0 for all columns) minimizing balance cost.
  // Pass B: Fallback partition minimizing maxOverflow when content exceeds columnMaxHeights.
  const INF = 1e18;
  const dpFitCost = Array.from({ length: numCols }, () =>
    new Float64Array(numCuts).fill(INF)
  );
  const dpFitPrev = Array.from({ length: numCols }, () =>
    new Int32Array(numCuts).fill(-1)
  );

  const dpOverflowMax = Array.from({ length: numCols }, () =>
    new Float64Array(numCuts).fill(INF)
  );
  const dpOverflowBalance = Array.from({ length: numCols }, () =>
    new Float64Array(numCuts).fill(INF)
  );
  const dpOverflowPrev = Array.from({ length: numCols }, () =>
    new Int32Array(numCuts).fill(-1)
  );

  const columnScore = (
    colIdx: number,
    usedH: number,
    maxH: number,
    continuations: number,
    isEmpty: boolean
  ): number => {
    const safeMax = Math.max(1, maxH);
    const fill = usedH / safeMax;
    const diff = fill - targetFillRatio;
    let score = diff * diff;

    // Small penalty for splitting a category so categories stay whole when balance is similar
    score += continuations * 0.0035;

    // Keep the last column well-filled (>= 50%) whenever total content allows it
    if (colIdx === numCols - 1 && targetFillRatio >= 0.48) {
      if (fill < 0.5) {
        const deficit = 0.52 - fill;
        score += deficit * deficit * 18 + 0.5;
      }
    }

    // Discourage empty columns if there are enough items for all columns
    if (isEmpty && totalItems >= numCols * 2) {
      score += 10;
    }

    return score;
  };

  // Initialize column 0 (starts at cut index 0 -> p=0)
  for (let j = 0; j < numCuts; j++) {
    const idx = j; // 0 * numCuts + j
    if (!sliceOk[idx]) continue;
    const usedH = sliceHeight[idx];
    const maxH = columnMaxHeights[0];
    const cont = sliceCont[idx];
    const isEmpty = validCuts[j] === 0;
    const score = columnScore(0, usedH, maxH, cont, isEmpty);
    const over = Math.max(0, usedH - maxH);

    if (over <= 0.5) {
      dpFitCost[0][j] = score;
      dpFitPrev[0][j] = 0;
    }
    dpOverflowMax[0][j] = over;
    dpOverflowBalance[0][j] = score;
    dpOverflowPrev[0][j] = 0;
  }

  for (let c = 1; c < numCols; c++) {
    const maxH = columnMaxHeights[c];
    for (let j = 0; j < numCuts; j++) {
      for (let i = 0; i <= j; i++) {
        const idx = i * numCuts + j;
        if (!sliceOk[idx]) continue;

        const usedH = sliceHeight[idx];
        const cont = sliceCont[idx];
        const isEmpty = i === j;
        const score = columnScore(c, usedH, maxH, cont, isEmpty);
        const over = Math.max(0, usedH - maxH);

        // Pass A: fitting transition
        if (over <= 0.5 && dpFitCost[c - 1][i] < INF) {
          const candCost = dpFitCost[c - 1][i] + score;
          if (candCost < dpFitCost[c][j]) {
            dpFitCost[c][j] = candCost;
            dpFitPrev[c][j] = i;
          }
        }

        // Pass B: fallback overflow transition
        if (dpOverflowMax[c - 1][i] < INF) {
          const candMaxOver = Math.max(dpOverflowMax[c - 1][i], over);
          const candBal = dpOverflowBalance[c - 1][i] + score;
          if (
            candMaxOver < dpOverflowMax[c][j] - 1e-6 ||
            (Math.abs(candMaxOver - dpOverflowMax[c][j]) <= 1e-6 &&
              candBal < dpOverflowBalance[c][j])
          ) {
            dpOverflowMax[c][j] = candMaxOver;
            dpOverflowBalance[c][j] = candBal;
            dpOverflowPrev[c][j] = i;
          }
        }
      }
    }
  }

  const lastCutIdx = numCuts - 1;
  const hasFittingSolution = dpFitCost[numCols - 1][lastCutIdx] < INF;

  const chosenCuts = new Array<number>(numCols + 1);
  chosenCuts[numCols] = lastCutIdx;
  let curr = lastCutIdx;

  for (let c = numCols - 1; c >= 0; c--) {
    const prev = hasFittingSolution ? dpFitPrev[c][curr] : dpOverflowPrev[c][curr];
    chosenCuts[c] = prev >= 0 ? prev : 0;
    curr = chosenCuts[c];
  }
  chosenCuts[0] = 0;

  let maxOverflow = 0;
  const columns: PackedColumn<T>[] = [];

  for (let c = 0; c < numCols; c++) {
    const s = validCuts[chosenCuts[c]];
    const e = validCuts[chosenCuts[c + 1]];
    const fragments = buildColumnFragments(s, e);
    const usedHeight = evaluateSlice(s, e).height;
    const maxHeight = columnMaxHeights[c];
    const overflow = Math.max(0, usedHeight - maxHeight);
    if (overflow > maxOverflow) {
      maxOverflow = overflow;
    }
    columns.push({
      columnIndex: c,
      fragments,
      usedHeight,
      maxHeight,
      fillRatio: maxHeight > 0 ? usedHeight / maxHeight : 0,
    });
  }

  return {
    columns,
    fits: maxOverflow <= 0.5,
    maxOverflow,
  };
}
