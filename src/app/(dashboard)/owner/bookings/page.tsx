import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RecentBookingsTable } from "@/components/dashboard/recent-bookings-table";

const TABS = [
  { key: "all", label: "Todas" },
  { key: "CONFIRMED", label: "Confirmadas" },
  { key: "PENDING", label: "Pendientes" },
  { key: "COMPLETED", label: "Completadas" },
  { key: "CANCELLED_BY_USER", label: "Canceladas" },
];

async function getOwnerBookings(ownerId: string, status?: string) {
  const where: any = { venue: { ownerId } };
  if (status && status !== "all") {
    if (status === "CANCELLED_BY_USER") {
      where.status = { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OWNER"] };
    } else {
      where.status = status;
    }
  }

  return db.booking.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, email: true, image: true } },
      venue: { select: { title: true } },
      payment: { select: { status: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });
}

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const activeTab = searchParams.status ?? "all";
  const bookings = await getOwnerBookings(session.user.id, activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservas</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona todas las reservas de tus espacios
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/owner/bookings${tab.key !== "all" ? `?status=${tab.key}` : ""}`}
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

      <RecentBookingsTable bookings={bookings as any} role="owner" />
    </div>
  );
}
