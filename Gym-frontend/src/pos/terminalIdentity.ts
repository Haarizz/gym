/**
 * This browser's identity as a POS terminal (BillBull device registration): a random device id kept
 * in localStorage, folded with stable browser traits into a fingerprint, plus the terminal code the
 * server issued — stored per branch, since a device is a separate terminal in each branch.
 */

const DEVICE_KEY = "gymbios.pos.device";
const codeKey = (branchId: number) => `gymbios.pos.terminal.${branchId}`;

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** FNV-1a, hex — enough to make a short, stable fingerprint string. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function parseUserAgent(ua: string): { browser: string; os: string } {
  const v = (re: RegExp) => ua.match(re)?.[1];
  const pick = (name: string, re: RegExp) => { const n = v(re); return n ? `${name} ${n}` : null; };
  const browser = pick("Edge", /Edg\/(\d+)/) ?? pick("Opera", /OPR\/(\d+)/) ?? pick("Chrome", /Chrome\/(\d+)/)
    ?? pick("Firefox", /Firefox\/(\d+)/) ?? pick("Safari", /Version\/(\d+).*Safari/) ?? "Browser";
  const os = /Windows NT 10/.test(ua) ? "Windows 10/11" : /Windows/.test(ua) ? "Windows"
    : pick("Android", /Android (\d+)/) ?? (/iPhone|iPad/.test(ua) ? "iOS"
      : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS");
  return { browser, os };
}

export function deviceProfile() {
  let device = storageGet(DEVICE_KEY);
  if (!device) {
    device = randomId();
    storageSet(DEVICE_KEY, device);
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* no Intl */ }
  const screenInfo = typeof screen !== "undefined" ? `${screen.width}x${screen.height}x${screen.colorDepth}` : "";
  const { browser, os } = parseUserAgent(ua);
  return {
    fingerprint: `${device}.${hash(`${ua}|${tz}|${screenInfo}`)}`,
    userAgent: ua.slice(0, 500),
    browser,
    os,
  };
}

export function readTerminalCode(branchId: number): string | null {
  return storageGet(codeKey(branchId));
}

export function writeTerminalCode(branchId: number, code: string) {
  storageSet(codeKey(branchId), code);
}
