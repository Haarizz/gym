import React, { createContext, useContext, useMemo, useState } from "react";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const seedNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "Class starts in 30 minutes",
    message: "HIIT Training with Mike Chen",
    time: "30m ago",
    read: false,
  },
  {
    id: "2",
    title: "New message from trainer",
    message: "Great progress on your form!",
    time: "2h ago",
    read: false,
  },
  {
    id: "3",
    title: "Streak milestone reached",
    message: "You've maintained a 12-day streak.",
    time: "1d ago",
    read: true,
  },
];

type NotificationsContextValue = {
  notifications: NotificationItem[];
  hasUnread: boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(seedNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const hasUnread = useMemo(() => notifications.some((item) => !item.read), [notifications]);

  return (
    <NotificationsContext.Provider value={{ notifications, hasUnread, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
