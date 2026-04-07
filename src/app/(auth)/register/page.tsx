"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { registerSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [role, setRole] = useState<"TENANT" | "OWNER">(
    (searchParams.get("role") as "TENANT" | "OWNER") ?? "TENANT"
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ ...form, role });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        errs[err.path[0] as string] = err.message;
      });
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error ?? "Error al registrarse", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Auto login after register
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      router.push(role === "OWNER" ? "/owner" : "/");
      router.refresh();
    } catch {
      toast({ title: "Error inesperado", variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-secondary/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          Fiestalo
        </Link>

        <h1 className="text-2xl font-bold mb-1">Crear cuenta</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Únete a la comunidad de Fiestalo
        </p>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole("TENANT")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
              role === "TENANT"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            )}
          >
            <Users className="w-5 h-5" />
            Busco espacios
          </button>
          <button
            type="button"
            onClick={() => setRole("OWNER")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
              role === "OWNER"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            )}
          >
            <Building2 className="w-5 h-5" />
            Tengo espacios
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input
              placeholder="Ana García"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Contraseña</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className={cn("pr-10", errors.password ? "border-destructive" : "")}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <Input
              type="password"
              placeholder="Repite la contraseña"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Al registrarte aceptas los{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Términos de uso
          </Link>{" "}
          y la{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Política de privacidad
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
