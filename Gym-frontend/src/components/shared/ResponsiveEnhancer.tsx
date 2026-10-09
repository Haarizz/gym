import { useEffect } from "react";

// Small runtime helpers for the responsive layer (src/styles/responsive.css) — the
// parts plain CSS can't do: labelling table cells for the phone card layout, and
// keeping the selected tab visible in a swipeable tab strip.
//
// Phones get data tables as stacked cards instead of a squeezed grid. This component
// only annotates the DOM — it never moves or wraps nodes, so React's reconciliation
// is unaffected — and src/styles/responsive.css does the actual re-layout below 768px:
//
//   table[data-gb-table="cards"]   each row becomes a card; every cell shows its column
//                                  header (td[data-label]) beside the value
//   table[data-gb-table="scroll"]  kept as a real table that scrolls sideways inside
//                                  its own box (editable grids, merged cells, narrow
//                                  tables, or tables opted out with data-gb-keep-table)
//
// Annotation runs only while a phone-width viewport is active, and never on the POS
// (the caller passes enabled={false} there; the CSS is scoped away from it as well).

const PHONE_QUERY = "(max-width: 767px)";
const MIN_CARD_COLUMNS = 4;
const EDITABLE = "input:not([type=checkbox]):not([type=radio]), select, textarea, [role=combobox]";
const ACTION_LABEL = /^(actions?|options|manage|operations?)$/i;

function setAttr(el: Element, name: string, value: string | null) {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

function headerLabels(table: HTMLTableElement): string[] | null {
  const head = table.tHead;
  const row = head?.rows[head.rows.length - 1];
  if (!row) return null;
  const labels: string[] = [];
  for (const cell of Array.from(row.cells)) {
    const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
    for (let i = 0; i < Math.max(1, cell.colSpan); i++) labels.push(text);
  }
  return labels;
}

function hasScrollingAncestor(table: HTMLElement): boolean {
  let el = table.parentElement;
  for (let depth = 0; el && depth < 4; depth++, el = el.parentElement) {
    const overflowX = getComputedStyle(el).overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return true;
  }
  return false;
}

function isOnlyControls(cell: HTMLTableCellElement): boolean {
  if ((cell.textContent || "").trim().length > 0) return false;
  return cell.querySelector("button, a, [role=button], [data-slot=dropdown-menu-trigger]") !== null;
}

function markScroll(table: HTMLTableElement) {
  setAttr(table, "data-gb-table", "scroll");
  setAttr(table, "data-gb-self-scroll", hasScrollingAncestor(table) ? null : "");
}

function enhance(table: HTMLTableElement) {
  if (table.closest("[data-gb-keep-table]")) return markScroll(table);
  const labels = headerLabels(table);
  const bodies = Array.from(table.tBodies);
  const columnCount = labels?.length ?? 0;
  const rows = bodies.flatMap((b) => Array.from(b.rows));
  if (
    !labels ||
    columnCount < MIN_CARD_COLUMNS ||
    rows.length === 0 ||
    table.querySelector(`tbody ${EDITABLE}`) !== null ||
    rows.some((r) => Array.from(r.cells).some((c) => c.rowSpan > 1))
  ) {
    return markScroll(table);
  }

  // The card title is the first real column: skip leading checkbox/expander columns.
  let primary = labels.findIndex((l) => l.length > 0);
  if (primary < 0) primary = 0;

  setAttr(table, "data-gb-table", "cards");
  setAttr(table, "data-gb-self-scroll", null);
  const footRows = table.tFoot ? Array.from(table.tFoot.rows) : [];
  for (const row of [...rows, ...footRows]) {
    let col = 0;
    for (const cell of Array.from(row.cells)) {
      const span = Math.max(1, cell.colSpan);
      const label = labels[col] ?? "";
      if (span >= columnCount) {
        setAttr(cell, "data-gb-cell", "full");
        setAttr(cell, "data-label", null);
      } else if (col === primary && span === 1) {
        setAttr(cell, "data-gb-cell", "primary");
        setAttr(cell, "data-label", null);
      } else if (ACTION_LABEL.test(label) || (label === "" && isOnlyControls(cell))) {
        setAttr(cell, "data-gb-cell", "actions");
        setAttr(cell, "data-label", null);
      } else {
        setAttr(cell, "data-gb-cell", null);
        setAttr(cell, "data-label", label || null);
      }
      col += span;
    }
  }
}

// Below 1024px tab lists become swipeable strips (responsive.css); keep the tab the
// user just picked fully in view instead of half cut off at the edge.
function useTabStripFollow(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const onClick = (event: MouseEvent) => {
      if (!mql.matches || !(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLElement>('[data-slot="tabs-trigger"]');
      const list = trigger?.parentElement;
      if (!trigger || !list || list.scrollWidth <= list.clientWidth) return;
      requestAnimationFrame(() => {
        const t = trigger.getBoundingClientRect();
        const l = list.getBoundingClientRect();
        if (t.left < l.left) list.scrollBy({ left: t.left - l.left - 16, behavior: "smooth" });
        else if (t.right > l.right) list.scrollBy({ left: t.right - l.right + 16, behavior: "smooth" });
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled]);
}

export function ResponsiveEnhancer({ enabled }: { enabled: boolean }) {
  useTabStripFollow(enabled);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const mql = window.matchMedia(PHONE_QUERY);
    let frame = 0;
    let observer: MutationObserver | null = null;

    const run = () => {
      frame = 0;
      document.querySelectorAll<HTMLTableElement>("table").forEach((t) => {
        try {
          enhance(t);
        } catch {
          // Never let a malformed table break the page; it simply stays a table.
        }
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    const start = () => {
      if (observer) return;
      // Attribute changes are not observed, so our own annotations never re-trigger.
      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      schedule();
    };
    const stop = () => {
      observer?.disconnect();
      observer = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => (mql.matches ? start() : stop());

    sync();
    mql.addEventListener("change", sync);
    return () => {
      mql.removeEventListener("change", sync);
      stop();
    };
  }, [enabled]);

  return null;
}
