"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { VenueForm } from "@/components/forms/venue-form";

export default function NewSpacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el espacio");

      toast({ title: "Espacio creado correctamente" });
      router.push("/owner/spaces");
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/owner/spaces">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Crear nuevo espacio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Completa la información para publicar tu espacio
          </p>
        </div>
      </div>

      <VenueForm onSubmit={handleSubmit} loading={loading} mode="create" />
    </div>
  );
}
