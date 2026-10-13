// BG_98: the backend JWT lives 24h (jwt.expiration), and an expired token is
// rejected as an anonymous request — a bare 403 with no message, not a 401. The
// app restored sessions from sessionStorage without ever checking expiry, so a tab
// left open past 24h still looked logged in: pages quietly loaded nothing and every
// save failed with "…: 403" (e.g. "Failed to create staff member: 403").
// These helpers detect expiry client-side from the token's own `exp` claim.

export const SESSION_EXPIRED_FLAG = "gymbios_session_expired";
export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

const SESSION_KEYS = [
  "token", "username", "roles", "userId", "gymbios_email", "gymbios_user", "gymbios_auth",
  "gymbios_auth_source", "gymbios_demo_mode", "gymbios_role_name", "gymbios_staff_name",
  "accessibleBranches", "activeBranchId",
];

/** True when the JWT's `exp` claim is in the past. Unparseable tokens are left to the backend. */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" && json.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

/** Drops the stored session and flags it so the login screen can say why. */
export function clearExpiredSession(): void {
  for (const key of SESSION_KEYS) sessionStorage.removeItem(key);
  sessionStorage.setItem(SESSION_EXPIRED_FLAG, "1");
}

let reloading = false;

/**
 * Clears the session and reloads, so App re-initialises logged out and sends the
 * user to /login (remembering the current page to return to after sign-in).
 */
export function expireSessionAndReload(): void {
  if (reloading) return;
  reloading = true;
  clearExpiredSession();
  window.location.reload();
}
