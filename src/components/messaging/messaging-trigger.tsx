"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { MessagingPanel } from "@/components/messaging/messaging-panel";
import { cn } from "@/lib/utils";

interface MessagingTriggerProps {
  label?: string;
  className?: string;
}

export function MessagingTrigger({ label = "Mensajes", className }: MessagingTriggerProps) {
  const [open,    setOpen]    = useState(false);
  const [unread,  setUnread]  = useState(0);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 30_000);
    return () => clearInterval(iv);
  }, []);

  async function fetchUnread() {
    try {
      const res  = await fetch("/api/conversations/unread");
      const data = await res.json();
      setUnread(data.data?.unread ?? 0);
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left text-muted-foreground hover:bg-secondary hover:text-foreground",
          className
        )}
      >
        <div className="relative">
          <MessageSquare className="w-4 h-4 shrink-0" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        {label}
        {unread > 0 && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {unread}
          </span>
        )}
      </button>

      <MessagingPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
