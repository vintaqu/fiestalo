"use client";
import { MessagingTrigger } from "@/components/messaging/messaging-trigger";
import { NotificationBell } from "@/components/notifications/notification-bell";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  Star,
  CreditCard,
  ClipboardList,
  Tag,
  Settings,
  LogOut,
  ShieldCheck,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_SECTIONS = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },

    ],
  },
  {
    label: "Gestión",
    items: [
      { href: "/admin/venues", label: "Espacios", icon: Building2 },
      { href: "/admin/users", label: "Usuarios", icon: Users },
      { href: "/admin/bookings", label: "Reservas", icon: BookOpen },
      { href: "/admin/payments", label: "Pagos", icon: CreditCard },
      { href: "/admin/reviews", label: "Reseñas", icon: Star },
      { href: "/admin/tickets", label: "Soporte", icon: ClipboardList },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/categories", label: "Categorías", icon: Tag },
      { href: "/admin/promotions", label: "Promociones", icon: Megaphone },
      { href: "/admin/verification", label: "Verificaciones", icon: ShieldCheck },
      { href: "/admin/settings", label: "Ajustes", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white text-sm leading-none">🎉</span>
          </div>
          Fiestalo
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Administración</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, (item as any).exact);
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
            </div>
          </div>
        ))}
        <MessagingTrigger />
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.image ?? ""} />
            <AvatarFallback className="text-xs bg-primary text-white">
              {user.name?.charAt(0) ?? "A"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-amber-600 font-medium">Admin</p>
          </div>
          <NotificationBell />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-destructive/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
