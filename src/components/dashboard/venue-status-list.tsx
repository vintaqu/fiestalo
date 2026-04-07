import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/utils/format";

interface VenueStatusListProps {
  venues?: Array<{
    id: string;
    title: string;
    status: string;
    pricePerHour: number | string;
    totalBookings: number;
  }>;
}

export function VenueStatusList({ venues = [] }: VenueStatusListProps) {
  if (venues.length === 0) return null;
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold mb-3">Estado de espacios</h3>
      <div className="space-y-2">
        {venues.map((v) => (
          <Link
            key={v.id}
            href={`/owner/spaces/${v.id}/edit`}
            className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-medium truncate flex-1">{v.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">
                {v.totalBookings} reservas
              </span>
              <span className="text-sm font-medium">
                {formatPrice(Number(v.pricePerHour))}/h
              </span>
              <Badge
                variant={v.status === "ACTIVE" ? "default" : "secondary"}
                className="text-xs"
              >
                {v.status === "ACTIVE" ? "Activo" : v.status}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
