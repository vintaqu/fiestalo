import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RecentBookingsTable } from "@/components/dashboard/recent-bookings-table";
import { DashboardKPIs } from "@/components/dashboard/dashboard-kpis";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

async function getTenantStats(userId: string) {
  const [totalBookings, activeBookings, completedBookings, favoriteCount] =
    await Promise.all([
      db.booking.count({ where: { tenantId: userId } }),
      db.booking.count({
        where: { tenantId: userId, status: "CONFIRMED", date: { gte: new Date() } },
      }),
      db.booking.count({ where: { tenantId: userId, status: "COMPLETED" } }),
      db.favorite.count({ where: { userId } }),
    ]);

  const recentBookings = await db.booking.findMany({
    where: { tenantId: userId },
    include: {
      venue: {
        select: {
          title: true,
          images: { where: { isCover: true }, take: 1 },
        },
      },
      payment: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return { totalBookings, activeBookings, completedBookings, favoriteCount, recentBookings };
}

export default async function TenantDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const stats = await getTenantStats(session.user.id);

  const kpis = [
    { label: "Total reservas", value: stats.totalBookings, type: "number" as const, icon: "calendar" as const },
    { label: "Próximas", value: stats.activeBookings, type: "number" as const, icon: "check" as const },
    { label: "Completadas", value: stats.completedBookings, type: "number" as const, icon: "building" as const },
    { label: "Favoritos", value: stats.favoriteCount, type: "number" as const, icon: "euro" as const },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {session.user.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus reservas y favoritos</p>
        </div>
        <Button asChild>
          <Link href="/search">
            <Search className="w-4 h-4 mr-2" />
            Buscar espacios
          </Link>
        </Button>
      </div>

      <DashboardKPIs kpis={kpis} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mis reservas</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tenant/bookings">Ver todas</Link>
          </Button>
        </div>
        <RecentBookingsTable bookings={stats.recentBookings as any} role="tenant" />
      </div>
    </div>
  );
}
