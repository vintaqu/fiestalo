import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CalendarContainer } from "@/components/calendar/calendar-container";
import { CalendarDays } from "lucide-react";

async function getOwnerVenues(ownerId: string) {
  return db.venue.findMany({
    where:   { ownerId, deletedAt: null, status: { not: "DELETED" } },
    select:  { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });
}

export default async function OwnerCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venues = await getOwnerVenues(session.user.id);

  if (venues.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-muted-foreground mt-1">Gestiona la disponibilidad de tus espacios</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <CalendarDays className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold">No tienes espacios publicados</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Crea tu primer espacio para empezar a recibir reservas y verlas en el calendario.
          </p>
          <a
            href="/owner/spaces/new"
            className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Nuevo espacio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza reservas y gestiona la disponibilidad de tus espacios
        </p>
      </div>

      <CalendarContainer
        venues={venues}
        initialVenueId={venues[0].id}
      />
    </div>
  );
}
