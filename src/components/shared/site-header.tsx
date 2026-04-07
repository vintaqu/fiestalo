"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  LayoutDashboard,
  Building2,
  Heart,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface SiteHeaderProps {
  transparent?: boolean;
}

export function SiteHeader({ transparent = false }: SiteHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isTransparent = transparent && !scrolled;

  const dashboardHref =
    session?.user?.role === "ADMIN"
      ? "/admin"
      : session?.user?.role === "OWNER"
        ? "/owner"
        : "/tenant";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isTransparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 font-bold text-xl",
            isTransparent ? "text-white" : "text-foreground"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white text-base leading-none">🎉</span>
          </div>
          Fiestalo
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/search"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isTransparent ? "text-white/90" : "text-muted-foreground"
            )}
          >
            Explorar
          </Link>
          <Link
            href="/owner/spaces/new"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isTransparent ? "text-white/90" : "text-muted-foreground"
            )}
          >
            Publicar espacio
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center gap-2 h-9 px-2",
                      isTransparent && "text-white hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={session.user.image ?? ""} />
                      <AvatarFallback className="text-xs bg-primary text-white">
                        {session.user.name?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardHref}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Panel de control
                    </Link>
                  </DropdownMenuItem>
                  {session.user.role === "OWNER" && (
                    <DropdownMenuItem asChild>
                      <Link href="/owner/spaces">
                        <Building2 className="mr-2 h-4 w-4" />
                        Mis espacios
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/tenant/bookings">
                      <Calendar className="mr-2 h-4 w-4" />
                      Reservas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/tenant/favorites">
                      <Heart className="mr-2 h-4 w-4" />
                      Favoritos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  isTransparent && "text-white hover:text-white hover:bg-white/10"
                )}
                asChild
              >
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Registrarse</Link>
              </Button>
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden",
              isTransparent && "text-white hover:text-white hover:bg-white/10"
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border px-4 pb-4"
          >
            <nav className="flex flex-col gap-2 pt-2">
              <Link
                href="/search"
                className="py-2 text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Explorar espacios
              </Link>
              <Link
                href="/owner/spaces/new"
                className="py-2 text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Publicar espacio
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
