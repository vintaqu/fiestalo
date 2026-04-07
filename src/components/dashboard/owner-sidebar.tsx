"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Calendar,
  BookOpen, BarChart3,
  Settings, Plus, Star, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ProfileModal } from "@/components/profile/profile-modal";
import { MessagingTrigger } from "@/components/messaging/messaging-trigger";

const NAV_ITEMS = [
  { href: "/owner",           label: "Panel",        icon: LayoutDashboard, exact: true },
  { href: "/owner/spaces",    label: "Mis espacios", icon: Building2 },
  { href: "/owner/bookings",  label: "Reservas",     icon: BookOpen },
  { href: "/owner/calendar",  label: "Calendario",   icon: Calendar },
  { href: "/owner/analytics", label: "Analítica",    icon: BarChart3 },
  { href: "/owner/reviews",   label: "Reseñas",      icon: Star },
  { href: "/owner/billing",   label: "Facturación",  icon: CreditCard },
];

interface OwnerSidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function OwnerSidebar({ user }: OwnerSidebarProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-sm leading-none">🎉</span>
            </div>
            Fiestalo
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Panel de propietario</p>
        </div>

        {/* Quick action */}
        <div className="px-4 pt-4">
          <Button size="sm" className="w-full gap-2" asChild>
            <Link href="/owner/spaces/new">
              <Plus className="w-4 h-4" />
              Nuevo espacio
            </Link>
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* Messages — opens messaging panel */}
          <MessagingTrigger />

          {/* Profile button — opens modal */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Mi perfil
          </button>
        </nav>

        {/* User — click avatar to open profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-3 flex-1 min-w-0 group"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="text-xs bg-primary text-white">
                  {user.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {user.name}
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
