import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RecentBookingsTable } from "@/components/dashboard/recent-bookings-table";

async function getBookings(status?: string) {
  const where: any = {};
  if (status && status !== "all") {
    if (status === "cancelled") {
      where.status = { in: ["CANCELLED_BY_USER", "CANCELLED_BY_OWNER"] };
    } else {
      where.status = status;
    }
  }

  return db.booking.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, email: true, image: true } },
      venue:  { select: { id: true, title: true } },
      payment: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

const TABS = [
  { key: "all",       label: "Todas" },
  { key: "PENDING",   label: "Pendientes" },
  { key: "CONFIRMED", label: "Confirmadas" },
  { key: "COMPLETED", label: "Completadas" },
  { key: "cancelled", label: "Canceladas" },
  { key: "DISPUTED",  label: "En disputa" },
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const activeTab = searchParams.status ?? "all";
  const bookings  = await getBookings(activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservas</h1>
        <p className="text-muted-foreground mt-1">{bookings.length} reservas</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/bookings${tab.key !== "all" ? `?status=${tab.key}` : ""}`}
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

      <RecentBookingsTable bookings={bookings as any} role="admin" />
    </div>
  );
}
