import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { SpaceEditClient } from "@/components/forms/space-edit-client";

interface PageProps {
  params: { id: string };
}

async function getVenueForOwner(id: string, ownerId: string) {
  return db.venue.findFirst({
    where: { id, ownerId, deletedAt: null },
    include: {
      amenities: { include: { amenity: true } },
      images: { orderBy: { sortOrder: "asc" } },
      availabilityRules: { orderBy: { dayOfWeek: "asc" } },
    },
  });
}

export default async function EditSpacePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await getVenueForOwner(params.id, session.user.id);
  if (!venue) notFound();

  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true },
  });

  const amenities = await db.amenity.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, icon: true, category: true },
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editar espacio</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{venue.title}</p>
      </div>

      <SpaceEditClient
        venue={venue as any}
        categories={categories}
        amenities={amenities}
      />
    </div>
  );
}
