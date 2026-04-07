"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Building2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<"TENANT" | "OWNER">("TENANT");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");

      // Update session with new role and clear needsOnboarding
      await update({ role });

      router.push(role === "OWNER" ? "/owner" : "/");
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message ?? "Error inesperado", variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/20 p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-3xl shadow-lg p-8 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-xl mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          Fiestalo
        </div>

        <h1 className="text-2xl font-bold mb-2">
          ¡Bienvenido{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Cuéntanos cómo quieres usar Fiestalo para personalizar tu experiencia.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setRole("TENANT")}
            className={cn(
              "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
              role === "TENANT"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                role === "TENANT" ? "bg-primary/10" : "bg-secondary"
              )}
            >
              <Users
                className={cn(
                  "w-6 h-6",
                  role === "TENANT" ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Busco espacios</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quiero reservar
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole("OWNER")}
            className={cn(
              "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
              role === "OWNER"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                role === "OWNER" ? "bg-primary/10" : "bg-secondary"
              )}
            >
              <Building2
                className={cn(
                  "w-6 h-6",
                  role === "OWNER" ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Tengo espacios</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quiero publicar
              </p>
            </div>
          </button>
        </div>

        <Button
          className="w-full h-11 text-base font-semibold"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Continuar"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Puedes cambiar esto más adelante en tu perfil
        </p>
      </motion.div>
    </div>
  );
}
