import { useCallback, useEffect, useRef, useState } from "react";
import {
  readFavoriteIds,
  writeFavoriteIds,
  fetchFavoriteIdsFromApi,
  toggleFavoriteOnApi,
} from "../utils/favoritesUtils";

/**
 * Manages the set of favorited POS product IDs.
 *
 * Source of truth is the backend (/api/pos/favorites) so favorites are
 * shared across terminals/devices; localStorage is kept in sync as an
 * offline cache and is used as the fallback if the backend is unreachable.
 */
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set(readFavoriteIds()));
  const hasLoadedFromApi = useRef(false);

  // Load the authoritative list from the backend once on mount; keep the
  // localStorage-seeded state if that fails (offline / backend down).
  useEffect(() => {
    let cancelled = false;
    fetchFavoriteIdsFromApi()
      .then((ids) => {
        if (cancelled) return;
        hasLoadedFromApi.current = true;
        setFavoriteIds(new Set(ids));
        writeFavoriteIds(ids);
      })
      .catch(() => {
        // Backend unavailable — keep whatever localStorage had.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isFavorite = useCallback((productId: number) => favoriteIds.has(productId), [favoriteIds]);

  const toggleFavorite = useCallback((productId: number) => {
    // Optimistic update so the UI (heart pop, counter) reacts instantly.
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      writeFavoriteIds(next);
      return next;
    });

    toggleFavoriteOnApi(productId)
      .then((ids) => {
        // Reconcile with the server's authoritative state (handles
        // concurrent toggles from another terminal).
        setFavoriteIds(new Set(ids));
        writeFavoriteIds(ids);
      })
      .catch(() => {
        // Backend unreachable — the optimistic local/localStorage change
        // still stands; nothing further to do here.
      });
  }, []);

  return { favoriteIds, isFavorite, toggleFavorite, favoriteCount: favoriteIds.size };
}
