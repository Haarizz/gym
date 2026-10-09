import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Building2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Package,
  Search,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  MIN_QUERY_LENGTH,
  useGlobalSearch,
  type GlobalSearchResult,
  type GlobalSearchType,
} from "./use-global-search";
import styles from "./GlobalSearch.module.css";

export interface GlobalSearchPage {
  title: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface GlobalSearchProps {
  pages: GlobalSearchPage[];
  branchId: number | null;
  branchName: string;
}

const TYPE_META: Record<GlobalSearchType, { label: string; icon: LucideIcon }> = {
  MEMBER: { label: "Members", icon: Users },
  STAFF: { label: "Staff", icon: UserCog },
  MEMBERSHIP: { label: "Memberships", icon: BadgeCheck },
  INVOICE: { label: "Invoices", icon: FileText },
  PAYMENT: { label: "Payments", icon: CreditCard },
  PRODUCT: { label: "Products", icon: Package },
  EXPENSE: { label: "Expenses", icon: Wallet },
  SUPPLIER_PAYMENT: { label: "Payment Vouchers", icon: Banknote },
  SUPPLIER: { label: "Suppliers", icon: Building2 },
};
const TYPE_ORDER = Object.keys(TYPE_META) as GlobalSearchType[];
const QUICK_ACCESS_PATHS = ["/members", "/attendance", "/billing", "/member-receipts", "/products", "/reports"];
const MAX_PAGE_RESULTS = 6;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const NON_TEXT_INPUTS = new Set(["button", "checkbox", "radio", "submit", "reset", "file", "range", "color", "image"]);

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type);
  return false;
}

const OPEN_EVENT = "gymbios:open-global-search";

/** Opens global search without a keyboard — used by the search button in the mobile header. */
export function openGlobalSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function GlobalSearch({ pages, branchId, branchName }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { query, setQuery, results, loading, error, recent, rememberQuery, clearRecent, retry } =
    useGlobalSearch(open, branchId);

  // One root-level listener. Ctrl/Cmd+X only opens search when focus is outside an
  // editable field, so cutting text in inputs/textareas/contenteditable is untouched.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat || e.altKey || e.shiftKey) return;
      if (!(isMac ? e.metaKey : e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (key === "x") {
        if (isEditable(e.target) || isEditable(document.activeElement)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const trimmed = query.trim();
  const pageMatches = useMemo(() => {
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    return pages
      .filter((p) => p.title.toLowerCase().includes(q))
      .sort((a, b) => Number(!a.title.toLowerCase().startsWith(q)) - Number(!b.title.toLowerCase().startsWith(q)))
      .slice(0, MAX_PAGE_RESULTS);
  }, [pages, trimmed]);

  const quickAccess = useMemo(
    () => QUICK_ACCESS_PATHS.map((path) => pages.find((p) => p.path === path)).filter(Boolean) as GlobalSearchPage[],
    [pages],
  );

  const grouped = useMemo(() => {
    const map = new Map<GlobalSearchType, GlobalSearchResult[]>();
    for (const r of results) {
      if (!TYPE_META[r.type]) continue;
      const list = map.get(r.type) ?? [];
      list.push(r);
      map.set(r.type, list);
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => [t, map.get(t)!] as const);
  }, [results]);

  const openResult = useCallback(
    (r: GlobalSearchResult) => {
      rememberQuery(query);
      setOpen(false);
      const state: Record<string, string> = {};
      if (r.search_value) state.globalSearch = r.search_value;
      if (r.type === "MEMBER") state.memberId = String(r.id);
      navigate(r.route, { state });
    },
    [navigate, query, rememberQuery],
  );

  const openPage = useCallback(
    (page: GlobalSearchPage) => {
      if (trimmed) rememberQuery(trimmed);
      setOpen(false);
      navigate(page.path);
    },
    [navigate, rememberQuery, trimmed],
  );

  const renderPage = (page: GlobalSearchPage, valuePrefix: string) => {
    const Icon = page.icon;
    return (
      <Command.Item
        key={`${valuePrefix}-${page.path}`}
        value={`${valuePrefix}-${page.path}`}
        onSelect={() => openPage(page)}
        className={styles.item}
      >
        <span className={styles.icon}>{Icon ? <Icon className="h-4 w-4" /> : <Search className="h-4 w-4" />}</span>
        <span className={styles.text}>
          <span className={styles.title}>{page.title}</span>
        </span>
        <span className={styles.hint}>Page</span>
      </Command.Item>
    );
  };

  const serverSearchActive = trimmed.length >= MIN_QUERY_LENGTH;
  const hasAnyResult = grouped.length > 0 || pageMatches.length > 0;
  const errorMessage =
    error === "auth"
      ? "Your session has expired. Please sign in again."
      : error === "forbidden"
        ? "You don't have access to search in this branch."
        : error === "network"
          ? "Couldn't reach the server. Check your connection."
          : error === "unavailable"
            ? "Search is temporarily unavailable."
            : null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={styles.content} aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Search GymBios</DialogPrimitive.Title>
          <Command shouldFilter={false} loop label="Global search" className={styles.command}>
            <div className={styles.inputWrap}>
              <Search className={styles.inputIcon} />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search members, invoices, payments, products, pages…"
                className={styles.input}
                maxLength={100}
              />
              {loading && <Loader2 className={`${styles.inputIcon} animate-spin`} />}
              {/* Full-screen on phones, where there's no overlay to tap and no Esc key. */}
              <DialogPrimitive.Close className={styles.cancelBtn}>Cancel</DialogPrimitive.Close>
            </div>

            <Command.List className={styles.list}>
              {!trimmed && (
                <>
                  {recent.length > 0 && (
                    <Command.Group
                      heading={
                        <span className={styles.headingRow}>
                          Recent searches
                          <button type="button" className={styles.clearBtn} onClick={clearRecent}>
                            Clear
                          </button>
                        </span>
                      }
                      className={styles.group}
                    >
                      {recent.map((q) => (
                        <Command.Item key={`recent-${q}`} value={`recent-${q}`} onSelect={() => setQuery(q)} className={styles.item}>
                          <span className={styles.icon}>
                            <Clock className="h-4 w-4" />
                          </span>
                          <span className={styles.text}>
                            <span className={styles.title}>{q}</span>
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {quickAccess.length > 0 && (
                    <Command.Group heading="Quick access" className={styles.group}>
                      {quickAccess.map((p) => renderPage(p, "quick"))}
                    </Command.Group>
                  )}
                  {recent.length === 0 && quickAccess.length === 0 && (
                    <div className={styles.message}>Start typing to search.</div>
                  )}
                </>
              )}

              {grouped.map(([type, items]) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <Command.Group key={type} heading={meta.label} className={styles.group}>
                    {items.map((r) => (
                      <Command.Item
                        key={`${r.type}-${r.id}`}
                        value={`${r.type}-${r.id}`}
                        onSelect={() => openResult(r)}
                        className={styles.item}
                      >
                        <span className={styles.icon}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={styles.text}>
                          <span className={styles.title}>{r.title}</span>
                          {r.subtitle && <span className={styles.subtitle}>{r.subtitle}</span>}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}

              {pageMatches.length > 0 && (
                <Command.Group heading="Pages" className={styles.group}>
                  {pageMatches.map((p) => renderPage(p, "page"))}
                </Command.Group>
              )}

              {serverSearchActive && loading && grouped.length === 0 && (
                <div className={styles.message}>Searching…</div>
              )}

              {serverSearchActive && !loading && errorMessage && (
                <div className={styles.error}>
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                  {(error === "network" || error === "unavailable") && (
                    <button type="button" className={styles.retryBtn} onClick={retry}>
                      Retry
                    </button>
                  )}
                </div>
              )}

              {trimmed && !serverSearchActive && pageMatches.length === 0 && (
                <div className={styles.message}>Type at least {MIN_QUERY_LENGTH} characters to search records.</div>
              )}

              {serverSearchActive && !loading && !error && !hasAnyResult && (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>No results found</div>
                  <div>Try searching for members, invoices, payments, products, staff…</div>
                </div>
              )}
            </Command.List>

            <div className={styles.footer}>
              <span className={styles.shortcuts}>
                <span><kbd className={styles.kbd}>↑</kbd><kbd className={styles.kbd}>↓</kbd> Navigate</span>
                <span><kbd className={styles.kbd}>↵</kbd> Open</span>
                <span><kbd className={styles.kbd}>Esc</kbd> Close</span>
              </span>
              <span className={styles.branch} title="Results are limited to this branch">
                {branchId === null ? "All branches" : branchName || "Current branch"}
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
