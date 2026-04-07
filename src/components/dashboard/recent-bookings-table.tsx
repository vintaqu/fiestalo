"use client";

import { formatPrice, formatShortDate } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pendiente", variant: "outline" },
  AWAITING_PAYMENT: { label: "Pago pendiente", variant: "secondary" },
  CONFIRMED: { label: "Confirmada", variant: "default" },
  CANCELLED_BY_USER: { label: "Cancelada", variant: "destructive" },
  CANCELLED_BY_OWNER: { label: "Cancelada", variant: "destructive" },
  COMPLETED: { label: "Completada", variant: "secondary" },
  REFUNDED: { label: "Reembolsada", variant: "outline" },
  DISPUTED: { label: "En disputa", variant: "destructive" },
};

interface BookingRow {
  id: string;
  bookingRef?: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  total: number | string;
  status: string;
  tenant?: { name?: string | null; email?: string | null; image?: string | null } | null;
  venue?: { title?: string | null } | null;
  payment?: { status?: string | null } | null;
}

interface RecentBookingsTableProps {
  bookings: BookingRow[];
  role: "owner" | "admin" | "tenant";
}

export function RecentBookingsTable({ bookings, role }: RecentBookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-10 text-center">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-muted-foreground text-sm">No hay reservas todavía</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                {role === "tenant" ? "Espacio" : "Cliente"}
              </th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                Fecha
              </th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                Horario
              </th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">
                Total
              </th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map((b) => {
              const statusInfo = STATUS_MAP[b.status] ?? {
                label: b.status,
                variant: "outline" as const,
              };
              const basePath =
                role === "admin"
                  ? "/admin/bookings"
                  : role === "owner"
                    ? "/owner/bookings"
                    : "/tenant/bookings";

              return (
                <tr
                  key={b.id}
                  className="hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link href={`${basePath}/${b.id}`} className="flex items-center gap-3 group">
                      {role !== "tenant" && b.tenant && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={b.tenant.image ?? ""} />
                          <AvatarFallback className="text-xs">
                            {b.tenant.name?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {role === "tenant"
                            ? b.venue?.title ?? "—"
                            : b.tenant?.name ?? "—"}
                        </p>
                        {role !== "tenant" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {b.venue?.title}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                    {formatShortDate(b.date)}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                    {b.startTime} – {b.endTime}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap">
                    {formatPrice(Number(b.total))}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge variant={statusInfo.variant} className="whitespace-nowrap">
                      {statusInfo.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
