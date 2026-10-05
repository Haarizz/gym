// Files uploaded to the backend (member photos from the mobile app, branch images…)
// are stored as backend-relative paths like "/uploads/photos/abc.jpg". Used as-is in
// an <img src>, those load from the WEB app's host, which is a different origin from
// the API in local dev and some deployments — so the image silently 404s (BG_82).
// Only /uploads/ paths are rewritten: the web app's own assets (e.g. /avatars/…),
// absolute URLs and data: URIs pass through unchanged.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/api\/?$/, "");

export function resolveBackendImageUrl<T extends string | null | undefined>(url: T): T | string {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}
