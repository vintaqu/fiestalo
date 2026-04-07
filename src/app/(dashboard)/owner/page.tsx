import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardKPIs } from "@/components/dashboard/dashboard-kpis";
import { RecentBookingsTable } from "@/components/dashboard/recent-bookings-table";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

async function getOwnerStats(ownerId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    totalVenues,
    activeVenues,
    totalBookings,
    monthBookings,
    lastMonthBookings,
    revenueResult,
    lastMonthRevenueResult,
    recentBookings,
    upcomingBookings,
  ] = await Promise.all([
    db.venue.count({ where: { ownerId, deletedAt: null } }),
    db.venue.count({ where: { ownerId, status: "ACTIVE", deletedAt: null } }),
    db.booking.count({
      where: { venue: { ownerId }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    db.booking.count({
      where: {
        venue: { ownerId },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: monthStart },
      },
    }),
    db.booking.count({
      where: {
        venue: { ownerId },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
    db.booking.aggregate({
      where: {
        venue: { ownerId },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: monthStart },
      },
      _sum: { total: true },
    }),
    db.booking.aggregate({
      where: {
        venue: { ownerId },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { total: true },
    }),
    db.booking.findMany({
      where: { venue: { ownerId } },
      include: {
        tenant: { select: { name: true, email: true, image: true } },
        venue: { select: { title: true } },
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.booking.findMany({
      where: {
        venue: { ownerId },
        status: "CONFIRMED",
        date: { gte: now },
      },
      include: {
        tenant: { select: { name: true, image: true } },
        venue: { select: { title: true } },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const monthRevenue = Number(revenueResult._sum.total ?? 0);
  const lastMonthRevenue = Number(lastMonthRevenueResult._sum.total ?? 0);

  return {
    totalVenues,
    activeVenues,
    totalBookings,
    monthBookings,
    lastMonthBookings,
    monthRevenue,
    lastMonthRevenue,
    recentBookings,
    upcomingBookings,
  };
}

export default async function OwnerDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const stats = await getOwnerStats(session.user.id);

  const kpis = [
    {
      label: "Ingresos este mes",
      value: stats.monthRevenue,
      type: "currency" as const,
      change:
        stats.lastMonthRevenue > 0
          ? ((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
          : null,
      icon: "euro" as const,
    },
    {
      label: "Reservas este mes",
      value: stats.monthBookings,
      type: "number" as const,
      change:
        stats.lastMonthBookings > 0
          ? ((stats.monthBookings - stats.lastMonthBookings) / stats.lastMonthBookings) * 100
          : null,
      icon: "calendar" as const,
    },
    {
      label: "Espacios activos",
      value: stats.activeVenues,
      total: stats.totalVenues,
      type: "number" as const,
      icon: "building" as const,
    },
    {
      label: "Reservas totales",
      value: stats.totalBookings,
      type: "number" as const,
      icon: "check" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bienvenido, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí tienes el resumen de tu actividad
          </p>
        </div>
        <Button asChild>
          <Link href="/owner/spaces/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo espacio
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <DashboardKPIs kpis={kpis} />

      {/* Charts + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OccupancyChart ownerId={session.user.id} />
        </div>
        <div>
          <UpcomingBookings bookings={stats.upcomingBookings} />
        </div>
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Reservas recientes</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/owner/bookings">Ver todas</Link>
          </Button>
        </div>
        <RecentBookingsTable bookings={stats.recentBookings} role="owner" />
      </div>
    </div>
  );
}

function UpcomingBookings({ bookings }: { bookings: any[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 h-full">
      <h3 className="font-semibold mb-4">Próximas reservas</h3>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No hay reservas próximas
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {b.tenant?.name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {b.tenant?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {b.venue?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(b.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {b.startTime}–{b.endTime}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
