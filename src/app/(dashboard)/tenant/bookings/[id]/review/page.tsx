import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/reviews/review-form";

async function getBookingForReview(id: string, tenantId: string) {
  const booking = await db.booking.findFirst({
    where: { id, tenantId, status: "COMPLETED" },
    include: {
      venue: { select: { id: true, title: true, city: true } },
      review: { select: { id: true } },
    },
  });
  return booking;
}

export default async function WriteReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const booking = await getBookingForReview(params.id, session.user.id);
  if (!booking) notFound();

  // Already reviewed — redirect to booking detail
  if (booking.review) redirect(`/tenant/bookings/${params.id}`);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/tenant/bookings/${params.id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Escribir reseña</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{booking.venue.title}</p>
        </div>
      </div>

      <ReviewForm bookingId={booking.id} venue={booking.venue} />
    </div>
  );
}
