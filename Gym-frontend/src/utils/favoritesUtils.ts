import { authService } from "./supabase/auth-service";

// Local persistence for POS "favorite" products — used as an offline cache
// and as the fallback when the backend is unreachable. The database
// (PosFavoriteController, /api/pos/favorites) is the source of truth
// whenever it's available; see fetchFavoriteIdsFromApi/toggleFavoriteOnApi.

const STORAGE_KEY = "gymbios_pos_favorite_products";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export function readFavoriteIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function writeFavoriteIds(ids: Iterable<number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Quota exceeded or serialization failure — favorites are a convenience
    // feature, never worth surfacing an error over.
  }
}

/** Fetch the current favorite product IDs from the backend. Throws on failure — caller decides the fallback. */
export async function fetchFavoriteIdsFromApi(): Promise<number[]> {
  const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/favorites`);
  if (!res.ok) throw new Error(`Failed to fetch favorites: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map((id: any) => Number(id)) : [];
}

/** Toggle a product's favorite state on the backend. Returns the updated full list. Throws on failure. */
export async function toggleFavoriteOnApi(productId: number): Promise<number[]> {
  const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/favorites/${productId}/toggle`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to toggle favorite: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map((id: any) => Number(id)) : [];
}
