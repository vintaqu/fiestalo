"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, Flag, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface AdminReviewActionsProps {
  reviewId:    string;
  isPublished: boolean;
  isFlagged:   boolean;
}

export function AdminReviewActions({ reviewId, isPublished, isFlagged }: AdminReviewActionsProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const [loading,    setLoading]    = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [showFlag,   setShowFlag]   = useState(false);

  async function doAction(action: string, extra?: Record<string, string>) {
    setLoading(action);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method:  action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    action === "delete" ? undefined : JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error");
      }
      const labels: Record<string, string> = {
        publish:   "Reseña publicada",
        unpublish: "Reseña despublicada",
        flag:      "Reseña reportada",
        unflag:    "Reporte eliminado",
        delete:    "Reseña eliminada",
      };
      toast({ title: labels[action] ?? "Acción realizada" });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
      setShowDelete(false);
      setShowFlag(false);
    }
  }

  const btn = (action: string, label: string, icon: React.ReactNode, cls: string) => (
    <Button
      key={action}
      size="sm"
      variant="ghost"
      disabled={!!loading}
      onClick={() => doAction(action)}
      className={`gap-1.5 text-xs h-8 ${cls}`}
    >
      {loading === action ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
      {!isPublished && btn("publish", "Publicar", <CheckCircle2 className="w-3.5 h-3.5" />, "text-emerald-700 hover:bg-emerald-50")}
      {isPublished  && btn("unpublish", "Despublicar", <EyeOff className="w-3.5 h-3.5" />, "text-orange-700 hover:bg-orange-50")}

      {!isFlagged && !showFlag && (
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8 text-red-600 hover:bg-red-50"
          onClick={() => setShowFlag(true)}>
          <Flag className="w-3.5 h-3.5" />Reportar
        </Button>
      )}
      {showFlag && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Motivo del reporte..."
            className="text-xs border border-border rounded-lg px-2 py-1 h-8 focus:outline-none"
          />
          <Button size="sm" disabled={!!loading} onClick={() => doAction("flag", { reason: flagReason })}
            className="h-8 text-xs bg-red-600 hover:bg-red-700">
            {loading === "flag" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmar"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowFlag(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {isFlagged && btn("unflag", "Quitar reporte", <Flag className="w-3.5 h-3.5" />, "text-muted-foreground hover:bg-secondary")}

      {/* Delete */}
      {!showDelete && (
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 ml-auto"
          onClick={() => setShowDelete(true)}>
          <Trash2 className="w-3.5 h-3.5" />Eliminar
        </Button>
      )}
      {showDelete && (
        <div className="flex gap-2 items-center ml-auto">
          <span className="text-xs text-destructive font-medium">¿Eliminar permanentemente?</span>
          <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={!!loading}
            onClick={() => doAction("delete")}>
            {loading === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sí, eliminar"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowDelete(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
