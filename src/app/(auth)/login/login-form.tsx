"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { loginSchema } from "@/lib/validations";
import type { LoginInput } from "@/lib/validations";

function getRoleRedirect(role: string, callbackUrl: string): string {
  if (callbackUrl && callbackUrl !== "/" && !callbackUrl.includes("/login")) {
    return callbackUrl;
  }
  if (role === "ADMIN") return "/admin";
  if (role === "OWNER") return "/owner";
  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<LoginInput>>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<LoginInput> = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof LoginInput;
        errs[key] = err.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast({
        title: "Credenciales incorrectas",
        description: "Revisa tu email y contraseña.",
        variant: "destructive",
      });
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role ?? "TENANT";

    router.push(getRoleRedirect(role, callbackUrl));
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Fiestalo
          </Link>

          <h1 className="text-2xl font-bold mb-1">Bienvenido de nuevo</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Inicia sesión en tu cuenta para continuar
          </p>

          <Button
            variant="outline"
            className="w-full h-11 gap-3 mb-6"
            onClick={handleGoogle}
            disabled={googleLoading}
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

          <div className="flex items-center gap-3 mb-6">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o con email</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className={errors.email ? "border-destructive" : ""}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
<span className="text-xs text-muted-foreground">¿La olvidaste? Contacta con soporte</span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Iniciar sesión"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>

          <div className="mt-6 p-3 bg-secondary rounded-xl text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">Acceso de demo:</p>
            <p>Admin: admin@fiestalo.es</p>
            <p>Owner: propietario1@demo.com</p>
            <p>Cliente: cliente@demo.com</p>
            <p className="text-foreground">Contraseña: Password123!</p>
          </div>
        </motion.div>
      </div>

      {/* Right: Decorative */}
      <div
        className="hidden lg:block bg-cover bg-center relative"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 to-brand-700/60" />
        <div className="relative h-full flex flex-col items-center justify-center text-white text-center p-12">
          <h2 className="text-3xl font-bold mb-4">¡La fiesta perfecta empieza aquí!</h2>
          <p className="text-white/80 max-w-sm">
            Más de 500 salas de fiestas verificadas en toda España esperando tu celebración.
          </p>
        </div>
      </div>
    </div>
  );
}
