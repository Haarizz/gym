import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axiosConfig";

export type GlobalSearchType =
  | "MEMBER"
  | "STAFF"
  | "MEMBERSHIP"
  | "INVOICE"
  | "PAYMENT"
  | "PRODUCT"
  | "EXPENSE"
  | "SUPPLIER_PAYMENT"
  | "SUPPLIER";

export interface GlobalSearchResult {
  type: GlobalSearchType;
  id: number;
  title: string;
  subtitle: string;
  route: string;
  search_value: string | null;
}

export type GlobalSearchError = "auth" | "forbidden" | "unavailable" | "network" | null;

export const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const RECENT_KEY = "gymbios_global_search_recent";
const MAX_RECENT = 5;

// Query strings only, in sessionStorage so they don't outlive the tab on shared front-desk machines.
function readRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable — recent searches are a convenience only
  }
}

export function useGlobalSearch(open: boolean, branchKey: number | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GlobalSearchError>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [retryToken, setRetryToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setQuery("");
      setResults([]);
      setLoading(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    abortRef.current?.abort();
    const trimmed = query.trim();
    if (!open || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get("/global-search", {
          params: { q: trimmed },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults(Array.isArray(res.data?.results) ? res.data.results : []);
        setError(null);
      } catch (err: any) {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
        const status = err?.response?.status;
        setResults([]);
        setError(
          status === 401 ? "auth" : status === 403 ? "forbidden" : status ? "unavailable" : "network",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, branchKey, retryToken]);

  const rememberQuery = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((p) => p.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
      writeRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    writeRecent([]);
  }, []);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  return { query, setQuery, results, loading, error, recent, rememberQuery, clearRecent, retry };
}

/**
 * Lets a list page open pre-filtered on the record picked in Global Search.
 * Runs on every navigation (location.key) so it also works when the page is already open.
 */
export function useGlobalSearchPrefill(setSearch: (value: string) => void) {
  const location = useLocation();
  useEffect(() => {
    const value = (location.state as { globalSearch?: unknown } | null)?.globalSearch;
    if (typeof value === "string" && value) setSearch(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}
