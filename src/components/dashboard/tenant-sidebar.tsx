"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ProfileModal } from "@/components/profile/profile-modal";
import { MessagingTrigger } from "@/components/messaging/messaging-trigger";

const NAV = [
  { href: "/tenant",           label: "Mi panel",  icon: "📊" },
  { href: "/tenant/bookings",  label: "Reservas",  icon: "📅" },
  { href: "/tenant/favorites", label: "Favoritos", icon: "❤️" },
  { href: "/tenant/reviews",   label: "Reseñas",   icon: "⭐" },
];

interface TenantSidebarProps {
  user: {
    name?:  string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function TenantSidebar({ user }: TenantSidebarProps) {
  const pathname    = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-card border-r border-border flex flex-col z-40">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <Link href="/" className="font-bold text-lg flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold">
              S
            </div>
            Fiestalo
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                pathname === item.href || (item.href !== "/tenant" && pathname.startsWith(item.href))
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Messages — opens messaging panel */}
          <MessagingTrigger />

          {/* Profile — opens modal */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <span className="text-base leading-none">👤</span>
            Mi perfil
          </button>
        </nav>

        {/* User — click to open profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 flex-1 min-w-0 group"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {user.name ?? "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
