import { useEffect, useState } from "react";
import { resolveBackendImageUrl } from "../../utils/resolve-image-url";
import styles from "./MemberAvatar.module.css";

/** A member's uploaded photo (mobile uploads are backend /uploads/ paths), or null. */
export function memberPhoto(m: any): string | null {
  const raw = m?.photo_url || m?.photoUrl || m?.photo || m?.avatar || m?.profile_photo || m?.image;
  return raw ? String(resolveBackendImageUrl(raw)) : null;
}

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

/** Round member photo, falling back to initials when there's no photo or it fails to load. */
export function MemberAvatar({ name, photo, size = 40 }: { name: string; photo: string | null | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {photo && !failed
        ? <img src={photo} alt="" onError={() => setFailed(true)} />
        : initialsOf(name)}
    </span>
  );
}

const MEMBER_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "green" },
  frozen: { label: "Frozen", tone: "blue" },
  expired: { label: "Expired", tone: "gray" },
  inactive: { label: "Inactive", tone: "gray" },
  suspended: { label: "Suspended", tone: "red" },
  pending_approval: { label: "Pending approval", tone: "amber" },
};

/** Label + colour tone for a membership_status value. */
export function memberStatus(status?: string | null) {
  const key = (status || "").toLowerCase();
  return MEMBER_STATUS[key] ?? { label: status ? status.replace(/_/g, " ") : "Unknown", tone: "gray" };
}

/** A membership_status pill (dot + label). */
export function MemberStatusPill({ status }: { status?: string | null }) {
  const s = memberStatus(status);
  return <span className={styles.pill} data-tone={s.tone}>{s.label}</span>;
}
