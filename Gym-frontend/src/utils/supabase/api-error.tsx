// Backend errors (see GlobalExceptionHandler) come back as
// { timestamp, status, error, message } — this pulls out the human-readable
// `message` so callers surface the real validation/business-rule reason
// (e.g. "Couple membership allows only one connected member.") instead of a
// generic "Failed to X: <status>" toast.
export async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // response body wasn't JSON (or was empty) — fall through to the fallback
  }
  return fallback;
}
