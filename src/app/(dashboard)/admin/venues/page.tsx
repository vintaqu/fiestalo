import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/utils/format";
import { AdminVenueActions } from "@/components/dashboard/admin-venue-actions";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: "Borrador",      color: "bg-gray-100 text-gray-600" },
  PENDING_REVIEW: { label: "En revisión",   color: "bg-amber-100 text-amber-700" },
  ACTIVE:         { label: "Activo",        color: "bg-emerald-100 text-emerald-700" },
  PAUSED:         { label: "Pausado",       color: "bg-orange-100 text-orange-700" },
  REJECTED:       { label: "Rechazado",     color: "bg-red-100 text-red-700" },
  SUSPENDED:      { label: "Suspendido",    color: "bg-red-100 text-red-700" },
};

async function getVenues(status?: string) {
  const where: any = { deletedAt: null };
  if (status && status !== "all") where.status = status;

  return db.venue.findMany({
    where,
    include: {
      owner:    { select: { name: true, email: true } },
      category: { select: { name: true } },
      images:   { where: { isCover: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const activeTab = searchParams.status ?? "all";
  const venues    = await getVenues(activeTab);

  const TABS = [
    { key: "all",            label: "Todos" },
    { key: "PENDING_REVIEW", label: "En revisión" },
    { key: "ACTIVE",         label: "Activos" },
    { key: "PAUSED",         label: "Pausados" },
    { key: "REJECTED",       label: "Rechazados" },
    { key: "SUSPENDED",      label: "Suspendidos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Espacios</h1>
        <p className="text-muted-foreground mt-1">{venues.length} espacios encontrados</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/venues${tab.key !== "all" ? `?status=${tab.key}` : ""}`}
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

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Espacio</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Propietario</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Categoría</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Precio/h</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {venues.map((venue) => {
                const statusInfo = STATUS_LABELS[venue.status] ?? { label: venue.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={venue.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          {venue.images[0] ? (
                            <Image src={venue.images[0].url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🏢</div>
                          )}
                        </div>
                        <div>
                          <Link href={`/venues/${venue.slug}`} className="font-medium hover:text-primary transition-colors" target="_blank">
                            {venue.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{venue.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-sm">{venue.owner.name}</p>
                      <p className="text-xs text-muted-foreground">{venue.owner.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{venue.category?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatPrice(Number(venue.pricePerHour))}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <AdminVenueActions venueId={venue.id} status={venue.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {venues.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-2">🏢</p>
            <p className="text-sm">No hay espacios en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
