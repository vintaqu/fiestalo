"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface OwnerReviewActionsProps {
  reviewId:        string;
  hasResponse:     boolean;
  existingResponse:string;
}

export function OwnerReviewActions({
  reviewId,
  hasResponse,
  existingResponse,
}: OwnerReviewActionsProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState(existingResponse);
  const [saving,  setSaving]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast({ title: "La respuesta debe tener al menos 10 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "respond", response: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast({ title: hasResponse ? "Respuesta actualizada" : "Respuesta publicada" });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-xs"
      >
        {hasResponse
          ? <><Edit3 className="w-3.5 h-3.5" />Editar respuesta</>
          : <><MessageSquare className="w-3.5 h-3.5" />Responder a esta reseña</>}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Tu respuesta pública
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gracias por tu valoración. Nos alegra que..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-right mt-1">{text.length}/1000</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {hasResponse ? "Actualizar respuesta" : "Publicar respuesta"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setOpen(false); setText(existingResponse); }}
          disabled={saving}
        >
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tu respuesta será visible públicamente junto a la reseña.
      </p>
    </form>
  );
}
