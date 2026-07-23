import React, { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "../../utils/supabase/notification-service";
import { NotificationPanel } from "./NotificationPanel";

export function NotificationBell({ className }: { className?: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore — don't crash UI on notification errors
    }
  }, []);

  useEffect(() => {
    fetchCount();
    // Poll faster when panel is open so badge stays fresh
    const delay = isOpen ? 15_000 : 60_000;
    const timer = setInterval(fetchCount, delay);
    return () => clearInterval(timer);
  }, [isOpen, fetchCount]);

  const handlePanelClose = useCallback(() => {
    setIsOpen(false);
    fetchCount(); // refresh count after user reads/clears
  }, [fetchCount]);

  const isCritical = unreadCount > 0; // could refine to check priority later
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className ?? ""}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${badgeLabel} unread)` : ""}`}
      >
        <Bell
          className={`h-5 w-5 ${isCritical ? "animate-[ring_1s_ease-in-out_infinite]" : ""}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
            {badgeLabel}
          </span>
        )}
      </button>

      <NotificationPanel
        open={isOpen}
        onClose={handlePanelClose}
        onCountChange={setUnreadCount}
      />
    </>
  );
}
