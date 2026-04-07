"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

interface ProfileFormProps {
  user: {
    id:        string;
    name?:     string | null;
    email:     string;
    image?:    string | null;
    role:      string;
    createdAt: Date | string;
    profile?: {
      bio?:     string | null;
      phone?:   string | null;
      city?:    string | null;
      country?: string | null;
      website?: string | null;
      avatar?:  string | null;
    } | null;
  };
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB   = 5;

const ROLE_LABELS: Record<string, string> = {
  TENANT: "Cliente",
  OWNER:  "Propietario",
  ADMIN:  "Administrador",
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);

  const [saving,          setSaving]          = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl,       setAvatarUrl]       = useState(
    user.profile?.avatar ?? user.image ?? ""
  );

  const [form, setForm] = useState({
    name:    user.name    ?? "",
    bio:     user.profile?.bio     ?? "",
    phone:   user.profile?.phone   ?? "",
    city:    user.profile?.city    ?? "",
    country: user.profile?.country ?? "ES",
    website: user.profile?.website ?? "",
  });

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // ── Avatar upload ─────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Formato no permitido. Usa JPG, PNG o WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: `La imagen supera ${MAX_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      // 1. Get Cloudinary signature
      const signRes = await fetch("/api/cloudinary/sign", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ venueId: `avatar_${user.id}` }),
      });
      if (!signRes.ok) throw new Error("Error obteniendo firma");
      const signData = await signRes.json();

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file",            file);
      formData.append("api_key",         signData.apiKey);
      formData.append("timestamp",       String(signData.timestamp));
      formData.append("signature",       signData.signature);
      formData.append("folder",          `fiestalo/avatars/${user.id}`);
      formData.append("allowed_formats", "jpg,jpeg,png,webp");
      formData.append("transformation",  "w_200,h_200,c_fill,g_face,q_auto,f_auto");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Error subiendo imagen");
      const uploadData = await uploadRes.json();

      // 3. Save to DB
      const saveRes = await fetch("/api/user/avatar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: uploadData.secure_url, cloudinaryId: uploadData.public_id }),
      });
      if (!saveRes.ok) throw new Error("Error guardando avatar");

      setAvatarUrl(uploadData.secure_url);
      toast({ title: "Foto de perfil actualizada" });
    } catch (e: any) {
      toast({ title: e.message ?? "Error subiendo la imagen", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Save profile ──────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (form.name.trim().length < 2) {
      toast({ title: "El nombre debe tener al menos 2 caracteres", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:    form.name.trim(),
          bio:     form.bio.trim()     || undefined,
          phone:   form.phone.trim()   || undefined,
          city:    form.city.trim()    || undefined,
          country: form.country        || undefined,
          website: form.website.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      toast({ title: "Perfil actualizado correctamente" });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const joinYear = new Date(user.createdAt).getFullYear();

  return (
    <form onSubmit={handleSave} className="space-y-8">

      {/* Avatar + account info */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary/40" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
            >
              {uploadingAvatar
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Account info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{user.name ?? "Sin nombre"}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className="text-xs text-muted-foreground">
                Miembro desde {joinYear}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Haz clic en el icono de cámara para cambiar tu foto. JPG, PNG o WebP · Máx. {MAX_SIZE_MB}MB.
        </p>
      </div>

      {/* Personal info */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <h3 className="font-semibold">Información personal</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nombre completo <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Tu nombre"
              className="mt-1.5"
              maxLength={80}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="bio">Sobre mí</Label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Cuéntanos algo sobre ti..."
              rows={3}
              maxLength={500}
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{form.bio.length}/500</p>
          </div>

          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+34 600 000 000"
              className="mt-1.5"
              maxLength={20}
            />
          </div>

          <div>
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Barcelona"
              className="mt-1.5"
              maxLength={80}
            />
          </div>

          <div>
            <Label htmlFor="website">Sitio web</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://tuweb.com"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="country">País</Label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className="mt-1.5 w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ES">España</option>
              <option value="PT">Portugal</option>
              <option value="FR">Francia</option>
              <option value="DE">Alemania</option>
              <option value="IT">Italia</option>
              <option value="GB">Reino Unido</option>
              <option value="US">Estados Unidos</option>
              <option value="MX">México</option>
              <option value="AR">Argentina</option>
              <option value="CO">Colombia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email info (read-only) */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
        <h3 className="font-semibold">Cuenta</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
            No editable
          </span>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">
          Para cambiar tu contraseña usa la opción "¿Olvidaste tu contraseña?" en el login.
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="px-8">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Guardar cambios</>
          )}
        </Button>
      </div>
    </form>
  );
}
