"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Trash2, Loader2 } from "lucide-react";
import { MessagingPanel } from "@/components/messaging/messaging-panel";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  link?:     string | null;
  isRead:    boolean;
  createdAt: string;
}

const ICONS: Record<string, string> = {
  BOOKING_NEW:       "📅",
  BOOKING_REQUEST:   "🔔",
  BOOKING_CONFIRMED: "✅",
  BOOKING_ACCEPTED:  "🎉",
  BOOKING_REJECTED:  "❌",
  BOOKING_CANCELLED: "❌",
  BOOKING_COMPLETED: "🏁",
  BOOKING_REMINDER:  "⏰",
  PAYMENT_RECEIVED:  "💰",
  PAYMENT_FAILED:    "⚠️",
  PAYMENT_REFUNDED:  "↩️",
  REVIEW_NEW:        "⭐",
  REVIEW_RESPONSE:   "💬",
  MESSAGE_NEW:       "💬",
  VENUE_APPROVED:    "✅",
  VENUE_REJECTED:    "❌",
  VENUE_SUSPENDED:   "🚫",
  VENUE_PAUSED:      "⏸️",
  TICKET_NEW:        "🎫",
  TICKET_REPLY:      "💬",
  TICKET_RESOLVED:   "✅",
  ADMIN_ALERT:       "🚨",
  ADMIN_DISPUTE:     "⚖️",
  SYSTEM:            "🔔",
};

export function NotificationBell() {
  const router = useRouter();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [messagingOpen,     setMessagingOpen]     = useState(false);
  const [messagingConvoId,  setMessagingConvoId]  = useState<string | undefined>(undefined);

  // Poll unread count every 60s
  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 60_000);
    return () => clearInterval(iv);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // When opening: fetch + auto-mark all as read after 1.5s
  useEffect(() => {
    if (!open) return;
    fetchNotifications().then(() => {
      setTimeout(() => {
        fetch("/api/notifications", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ all: true }),
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }, 1500);
    });
  }, [open]);

  async function fetchCount() {
    try {
      const res  = await fetch("/api/notifications");
      const data = await res.json();
      setUnreadCount(data.data?.unreadCount ?? 0);
    } catch {}
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications?limit=30");
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
      setUnreadCount(data.data?.unreadCount ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {} finally {
      setDeleting(null);
    }
  }

  function handleNotificationClick(n: Notification) {
    setOpen(false);
    if (!n.link) return;
    // messaging: links open the panel instead of navigating
    if (n.link.startsWith("messaging:")) {
      const convoId = n.link.replace("messaging:", "") || undefined;
      setMessagingConvoId(convoId);
      setMessagingOpen(true);
      return;
    }
    // Guard against old /messages/ links that have no page
    if (n.link.startsWith("/messages")) {
      const convoId = n.link.replace("/messages/", "") || undefined;
      setMessagingConvoId(convoId);
      setMessagingOpen(true);
      return;
    }
    router.push(n.link);
  }

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-xl hover:bg-secondary transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over panel — renders at root level, no z-index issues */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-50"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background shadow-xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">Notificaciones</h2>
                  {unread.length > 0 && (
                    <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                      {unread.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl">
                      🔔
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Sin notificaciones</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aquí aparecerán tus avisos importantes
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "group flex gap-3 px-5 py-4 hover:bg-secondary/40 transition-colors cursor-pointer",
                          !n.isRead && "bg-primary/5"
                        )}
                        onClick={() => handleNotificationClick(n)}
                      >
                        {/* Icon */}
                        <span className="text-xl shrink-0 mt-0.5 leading-none">
                          {ICONS[n.type] ?? "🔔"}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm leading-snug",
                            !n.isRead ? "font-semibold text-foreground" : "text-foreground/80"
                          )}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                          <p className="text-xs text-muted-foreground/50 mt-1.5">
                            {formatDate(new Date(n.createdAt))}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                          )}
                          <button
                            onClick={(e) => deleteNotification(n.id, e)}
                            disabled={deleting === n.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            {deleting === n.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-5 py-3 border-t border-border shrink-0">
                  <button
                    onClick={async () => {
                      await fetch("/api/notifications/clear", { method: "DELETE" });
                      setNotifications([]);
                      setUnreadCount(0);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5 w-full justify-center py-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Borrar todas las notificaciones
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <MessagingPanel
        open={messagingOpen}
        onClose={() => setMessagingOpen(false)}
        initialConversationId={messagingConvoId}
      />
    </>
  );
}
