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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { registerSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { toast }    = useToast();

  const [role, setRole] = useState<"TENANT" | "OWNER">(
    (searchParams.get("role") as "TENANT" | "OWNER") ?? "TENANT"
  );
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
  });
  const [showPw,        setShowPw]        = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Google OAuth ───────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true);
    // After Google auth, user lands on /onboarding to pick role
    // The role selector here is just UX — onboarding confirms it server-side
    await signIn("google", {
      callbackUrl: "/onboarding",
    });
  }

  // ── Email/password register ────────────────────────────────────
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error ?? "Error al registrarse", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Auto login after register
      await signIn("credentials", {
        email:    form.email,
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
              role === "TENANT" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            )}
          >
            <Users className="w-5 h-5" />
            Busco salas
          </button>
          <button
            type="button"
            onClick={() => setRole("OWNER")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
              role === "OWNER" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            )}
          >
            <Building2 className="w-5 h-5" />
            Tengo salas
          </button>
        </div>

        {/* Google button */}
        <Button
          variant="outline"
          className="w-full h-11 gap-3 mb-4"
          onClick={handleGoogle}
          disabled={googleLoading}
          type="button"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">o con email</span>
          <Separator className="flex-1" />
        </div>

        {/* Email form */}
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
          <Link href="/terms" className="underline hover:text-foreground">Términos de uso</Link>
          {" "}y la{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Política de privacidad</Link>
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
