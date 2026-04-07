import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatDate } from "@/utils/format";
import { ExternalLink } from "lucide-react";

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:            { label: "Pendiente",    color: "bg-gray-100 text-gray-600" },
  PROCESSING:         { label: "Procesando",   color: "bg-blue-100 text-blue-700" },
  SUCCEEDED:          { label: "Completado",   color: "bg-emerald-100 text-emerald-700" },
  FAILED:             { label: "Fallido",      color: "bg-red-100 text-red-700" },
  REFUNDED:           { label: "Reembolsado",  color: "bg-orange-100 text-orange-700" },
  PARTIALLY_REFUNDED: { label: "Reemb. parcial", color: "bg-amber-100 text-amber-700" },
};

async function getPayments(status?: string) {
  const where: any = {};
  if (status && status !== "all") where.status = status;

  return db.payment.findMany({
    where,
    include: {
      booking: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          tenant: { select: { name: true, email: true } },
          venue:  { select: { title: true } },
        },
      },
      refunds: { select: { amount: true, processedAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

const TABS = [
  { key: "all",       label: "Todos" },
  { key: "SUCCEEDED", label: "Completados" },
  { key: "PROCESSING",label: "Procesando" },
  { key: "FAILED",    label: "Fallidos" },
  { key: "REFUNDED",  label: "Reembolsados" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const activeTab = searchParams.status ?? "all";
  const payments  = await getPayments(activeTab);

  const totalVolume = payments
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-muted-foreground mt-1">{payments.length} transacciones</p>
        </div>
        <div className="bg-card border border-border rounded-2xl px-5 py-3 text-right">
          <p className="text-sm text-muted-foreground">Volumen filtrado</p>
          <p className="text-xl font-bold text-emerald-600">{formatPrice(totalVolume)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/payments${tab.key !== "all" ? `?status=${tab.key}` : ""}`}
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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Espacio</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Importe</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Stripe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => {
                const statusInfo = PAYMENT_STATUS[payment.status] ?? { label: payment.status, color: "bg-gray-100 text-gray-600" };
                const refundedTotal = payment.refunds.reduce((s, r) => s + Number(r.amount), 0);
                return (
                  <tr key={payment.id} className="hover:bg-secondary/20">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{payment.booking.tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{payment.booking.tenant.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/bookings/${payment.booking.id}`} className="hover:text-primary transition-colors">
                        {payment.booking.venue.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="font-semibold">{formatPrice(Number(payment.amount))}</p>
                      {refundedTotal > 0 && (
                        <p className="text-xs text-orange-600">−{formatPrice(refundedTotal)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {payment.stripePaymentIntentId && (
                        <a
                          href={`https://dashboard.stripe.com/test/payments/${payment.stripePaymentIntentId}`}
                          target="_blank"
                          rel="noopener"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-2">💳</p>
            <p className="text-sm">No hay pagos</p>
          </div>
        )}
      </div>
    </div>
  );
}
