import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Pause, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: "Borrador",           color: "bg-gray-100 text-gray-700" },
  PENDING_REVIEW: { label: "En revisión",         color: "bg-amber-100 text-amber-700" },
  ACTIVE:         { label: "Activo",              color: "bg-emerald-100 text-emerald-700" },
  PAUSED:         { label: "Pausado",             color: "bg-orange-100 text-orange-700" },
  REJECTED:       { label: "Rechazado",           color: "bg-red-100 text-red-700" },
  SUSPENDED:      { label: "Suspendido",          color: "bg-red-100 text-red-700" },
};

async function getOwnerSpaces(ownerId: string) {
  return db.venue.findMany({
    where: { ownerId, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      city: true,
      pricePerHour: true,
      capacity: true,
      totalBookings: true,
      viewCount: true,
      completenessScore: true,
      averageRating: true,
      totalReviews: true,
      isFeatured: true,
      createdAt: true,
      category: { select: { name: true, icon: true } },
      images: { where: { isCover: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function OwnerSpacesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const spaces = await getOwnerSpaces(session.user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis espacios</h1>
          <p className="text-muted-foreground mt-1">
            {spaces.length} espacio{spaces.length !== 1 ? "s" : ""} publicado{spaces.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/owner/spaces/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo espacio
          </Link>
        </Button>
      </div>

      {spaces.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {spaces.map((space) => {
            const statusInfo = STATUS_LABELS[space.status] ?? { label: space.status, color: "bg-gray-100 text-gray-700" };
            const cover = space.images[0];

            return (
              <div
                key={space.id}
                className="bg-card rounded-2xl border border-border p-5 flex gap-5 items-start hover:shadow-sm transition-shadow"
              >
                {/* Thumbnail */}
                <div className="w-32 h-24 rounded-xl overflow-hidden bg-muted shrink-0">
                  {cover ? (
                    <Image
                      src={cover.url}
                      alt={space.title}
                      width={128}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {space.category?.icon ?? "🏢"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        {space.isFeatured && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            ⭐ Destacado
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-base">{space.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {space.city} · {space.category?.name} · hasta {space.capacity} personas
                      </p>
                    </div>
                    <p className="font-bold text-lg shrink-0">
                      {formatPrice(Number(space.pricePerHour))}/h
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground">
                    <span title="Vistas">{space.viewCount} vistas</span>
                    <span title="Reservas">{space.totalBookings} reservas</span>
                    {space.totalReviews > 0 && (
                      <span>⭐ {Number(space.averageRating).toFixed(1)} ({space.totalReviews})</span>
                    )}
                    {/* Completeness bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${space.completenessScore}%` }}
                        />
                      </div>
                      <span className="text-xs">{space.completenessScore}% completo</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/owner/spaces/${space.id}/edit`}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/venues/${space.slug}`} target="_blank">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Ver
                      </Link>
                    </Button>
                    <SpaceStatusToggle
                      spaceId={space.id}
                      currentStatus={space.status}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center">
      <div className="text-5xl mb-4">🏢</div>
      <h3 className="text-lg font-semibold mb-2">Todavía no tienes espacios</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
        Publica tu primer espacio y empieza a recibir reservas de cientos de usuarios.
      </p>
      <Button asChild>
        <Link href="/owner/spaces/new">
          <Plus className="w-4 h-4 mr-2" />
          Crear mi primer espacio
        </Link>
      </Button>
    </div>
  );
}

function SpaceStatusToggle({
  spaceId,
  currentStatus,
}: {
  spaceId: string;
  currentStatus: string;
}) {
  // DRAFT or REJECTED → show Publish button
  if (currentStatus === "DRAFT" || currentStatus === "REJECTED") {
    return (
      <form
        action={async () => {
          "use server";
          const { db } = await import("@/lib/db");
          const { revalidatePath } = await import("next/cache");
          await db.venue.update({
            where: { id: spaceId },
            data: { status: "ACTIVE", publishedAt: new Date() },
          });
          revalidatePath("/owner/spaces");
        }}
      >
        <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Publicar
        </Button>
      </form>
    );
  }

  if (currentStatus === "ACTIVE") {
    return (
      <form
        action={async () => {
          "use server";
          const { db } = await import("@/lib/db");
          const { revalidatePath } = await import("next/cache");
          await db.venue.update({
            where: { id: spaceId },
            data: { status: "PAUSED" },
          });
          revalidatePath("/owner/spaces");
        }}
      >
        <Button variant="outline" size="sm" type="submit">
          <Pause className="w-3.5 h-3.5 mr-1.5" />
          Pausar
        </Button>
      </form>
    );
  }

  if (currentStatus === "PAUSED") {
    return (
      <form
        action={async () => {
          "use server";
          const { db } = await import("@/lib/db");
          const { revalidatePath } = await import("next/cache");
          await db.venue.update({
            where: { id: spaceId },
            data: { status: "ACTIVE" },
          });
          revalidatePath("/owner/spaces");
        }}
      >
        <Button variant="outline" size="sm" type="submit">
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Activar
        </Button>
      </form>
    );
  }

  // PENDING_REVIEW or SUSPENDED — no action available
  return (
    <p className="text-xs text-muted-foreground italic">
      {currentStatus === "PENDING_REVIEW" ? "Pendiente de revisión" : ""}
    </p>
  );
}
