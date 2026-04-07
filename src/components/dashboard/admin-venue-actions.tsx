"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ShieldAlert, Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AdminVenueActionsProps {
  venueId: string;
  status:  string;
}

export function AdminVenueActions({ venueId, status }: AdminVenueActionsProps) {
  const router     = useRouter();
  const { toast }  = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  async function doAction(action: "approve" | "reject" | "suspend" | "activate") {
    setLoading(action);
    const url = action === "approve"
      ? `/api/admin/venues/${venueId}/approve`
      : action === "reject"
      ? `/api/admin/venues/${venueId}/reject`
      : `/api/admin/venues/${venueId}/${action}`;

    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast({ title: "Acción realizada correctamente" });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const btn = (action: "approve" | "reject" | "suspend" | "activate", label: string, icon: React.ReactNode, color: string) => (
    <button
      onClick={() => doAction(action)}
      disabled={!!loading}
      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${color}`}
    >
      {loading === action ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {status === "PENDING_REVIEW" && (
        <>
          {btn("approve", "Aprobar", <CheckCircle2 className="w-3 h-3" />, "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}
          {btn("reject",  "Rechazar", <XCircle className="w-3 h-3" />,      "bg-red-100 text-red-700 hover:bg-red-200")}
        </>
      )}
      {status === "ACTIVE" && (
        btn("suspend", "Suspender", <ShieldAlert className="w-3 h-3" />, "bg-orange-100 text-orange-700 hover:bg-orange-200")
      )}
      {(status === "SUSPENDED" || status === "REJECTED") && (
        btn("activate", "Activar", <Play className="w-3 h-3" />, "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")
      )}
      {status === "PAUSED" && (
        btn("activate", "Activar", <Play className="w-3 h-3" />, "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")
      )}
    </div>
  );
}
