import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RecentBookingsTable } from "@/components/dashboard/recent-bookings-table";

async function getTenantBookings(tenantId: string, status?: string) {
  const where: any = { tenantId };
  if (status && status !== "all") {
    if (status === "upcoming") {
      where.status = "CONFIRMED";
      where.date = { gte: new Date() };
    } else {
      where.status = status;
    }
  }

  return db.booking.findMany({
    where,
    include: {
      venue: {
        select: {
          title: true,
          slug: true,
          city: true,
          images: { where: { isCover: true }, take: 1 },
        },
      },
      payment: { select: { status: true, receiptUrl: true } },
      review: { select: { id: true, rating: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });
}

const TABS = [
  { key: "all", label: "Todas" },
  { key: "upcoming", label: "Próximas" },
  { key: "COMPLETED", label: "Completadas" },
  { key: "CANCELLED_BY_USER", label: "Canceladas" },
];

export default async function TenantBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const activeTab = searchParams.status ?? "all";
  const bookings = await getTenantBookings(session.user.id, activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis reservas</h1>
        <p className="text-muted-foreground mt-1">
          Historial completo de tus reservas
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/tenant/bookings${tab.key !== "all" ? `?status=${tab.key}` : ""}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <RecentBookingsTable bookings={bookings as any} role="tenant" />
    </div>
  );
}
