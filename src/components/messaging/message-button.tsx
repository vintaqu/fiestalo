"use client";

import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessagingPanel } from "@/components/messaging/messaging-panel";
import { useToast } from "@/components/ui/use-toast";

interface MessageButtonProps {
  recipientId:  string;
  venueId?:     string;
  bookingId?:   string;
  venueName?:   string;
  bookingRef?:  string;
  label?:       string;
  variant?:     "default" | "outline" | "ghost";
  size?:        "sm" | "default" | "lg";
}

export function MessageButton({
  recipientId,
  venueId,
  bookingId,
  venueName,
  bookingRef,
  label = "Contactar",
  variant = "outline",
  size = "sm",
}: MessageButtonProps) {
  const { toast } = useToast();
  const [open,              setOpen]              = useState(false);
  const [loading,           setLoading]           = useState(false);
  const [conversationId,    setConversationId]    = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      // Create or get existing conversation
      const res = await fetch("/api/conversations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type:         bookingId ? "BOOKING_SUPPORT" : "VENUE_INQUIRY",
          venueId,
          bookingId,
          recipientId,
          subject:      bookingId
            ? `Consulta sobre reserva ${bookingRef ?? ""}`
            : venueName
            ? `Consulta sobre ${venueName}`
            : "Consulta",
          firstMessage: bookingId
            ? `Hola, tengo una consulta sobre mi reserva${bookingRef ? ` ${bookingRef}` : ""}.`
            : `Hola, me gustaría saber más sobre ${venueName ?? "tu espacio"}.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast({ title: "Inicia sesión para contactar", variant: "destructive" });
          return;
        }
        throw new Error(data.error);
      }

      setConversationId(data.data.id);
      setOpen(true);
    } catch (e: any) {
      toast({ title: e.message ?? "Error al abrir el chat", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={loading}
        className="gap-2"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <MessageSquare className="w-4 h-4" />}
        {label}
      </Button>

      <MessagingPanel
        open={open}
        onClose={() => setOpen(false)}
        initialConversationId={conversationId ?? undefined}
      />
    </>
  );
}
