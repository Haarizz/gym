// BG_67: some notifications carry targets with no web route of their own — the
// backend's reward notifications point at "/reward-queue" and "/my-rewards" (and
// "/profile?view=referrals" for the member app), which fell through to the
// Dashboard. They live as tabs on the Referrals page; already-stored notifications
// keep the old URLs, so the mapping is applied when "View" is followed.
const LEGACY_TARGETS: Record<string, string> = {
  "/reward-queue": "/referrals?tab=reward-queue",
  "/my-rewards": "/referrals?tab=my-rewards",
  "/profile?view=referrals": "/referrals?tab=my-rewards",
};

export function notificationTarget(actionUrl: string | null | undefined): string | null {
  if (!actionUrl) return null;
  const url = actionUrl.trim();
  return LEGACY_TARGETS[url] ?? url;
}
