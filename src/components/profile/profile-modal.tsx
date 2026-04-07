"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, Loader2, Save, User,
  LogOut, Settings,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

interface ProfileData {
  id:        string;
  name?:     string | null;
  email:     string;
  image?:    string | null;
  role:      string;
  createdAt: string;
  profile?: {
    bio?:     string | null;
    phone?:   string | null;
    city?:    string | null;
    country?: string | null;
    website?: string | null;
    avatar?:  string | null;
  } | null;
}

interface ProfileModalProps {
  open:     boolean;
  onClose:  () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB   = 5;

const ROLE_LABELS: Record<string, string> = {
  TENANT: "Cliente",
  OWNER:  "Propietario",
  ADMIN:  "Administrador",
};

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const router          = useRouter();
  const { toast }       = useToast();
  const { update: updateSession } = useSession();
  const fileRef         = useRef<HTMLInputElement>(null);

  const [user,            setUser]            = useState<ProfileData | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl,       setAvatarUrl]       = useState("");

  const [form, setForm] = useState({
    name:    "",
    bio:     "",
    phone:   "",
    city:    "",
    country: "ES",
    website: "",
  });

  // Fetch profile when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        const u = data.data as ProfileData;
        setUser(u);
        setAvatarUrl(u.profile?.avatar ?? u.image ?? "");
        setForm({
          name:    u.name    ?? "",
          bio:     u.profile?.bio     ?? "",
          phone:   u.profile?.phone   ?? "",
          city:    u.profile?.city    ?? "",
          country: u.profile?.country ?? "ES",
          website: u.profile?.website ?? "",
        });
      })
      .catch(() => toast({ title: "Error cargando perfil", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
      toast({ title: `Máximo ${MAX_SIZE_MB}MB`, variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign-avatar", {
        method: "POST",
      });
      if (!signRes.ok) throw new Error("Error obteniendo firma");
      const signData = await signRes.json();

      // Must send EXACTLY the same params that were signed — order doesn't matter
      // but values must match character-for-character
      const formData = new FormData();
      formData.append("file",            file);
      formData.append("api_key",         signData.apiKey);
      formData.append("timestamp",       String(signData.timestamp));
      formData.append("signature",       signData.signature);
      formData.append("folder",          signData.folder);
      formData.append("allowed_formats", "jpg,jpeg,png,webp");
      formData.append("transformation",  "w_200,h_200,c_fill,g_face,q_auto,f_auto");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Error subiendo imagen");
      const uploadData = await uploadRes.json();

      await fetch("/api/user/avatar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          url:          uploadData.secure_url,
          cloudinaryId: uploadData.public_id,
        }),
      });

      setAvatarUrl(uploadData.secure_url);
      // Push new image into session JWT so header avatar updates immediately
      await updateSession({ image: uploadData.secure_url });
      toast({ title: "Foto actualizada" });
    } catch (e: any) {
      toast({ title: e.message ?? "Error subiendo imagen", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Save ──────────────────────────────────────────────────────

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
      if (!res.ok) throw new Error(data.error ?? "Error guardando");

      // Sync name change into session so header reflects it immediately
      await updateSession({ name: form.name.trim() });
      toast({ title: "Perfil actualizado" });
      router.refresh();
      onClose();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Mi perfil</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : user ? (
                <form onSubmit={handleSave} id="profile-form" className="p-5 space-y-6">

                  {/* Avatar + info */}
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="Avatar"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-7 h-7 text-primary/40" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        {uploadingAvatar
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Camera className="w-3 h-3" />}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept={ALLOWED_TYPES.join(",")}
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.name ?? "Sin nombre"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Fields */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="modal-name">
                        Nombre <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="modal-name"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        className="mt-1.5"
                        maxLength={80}
                        placeholder="Tu nombre completo"
                      />
                    </div>

                    <div>
                      <Label htmlFor="modal-bio">Sobre mí</Label>
                      <textarea
                        id="modal-bio"
                        value={form.bio}
                        onChange={(e) => set("bio", e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Cuéntanos algo sobre ti..."
                        className="mt-1.5 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">{form.bio.length}/500</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="modal-phone">Teléfono</Label>
                        <Input
                          id="modal-phone"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          className="mt-1.5"
                          placeholder="+34 600 000 000"
                          maxLength={20}
                        />
                      </div>
                      <div>
                        <Label htmlFor="modal-city">Ciudad</Label>
                        <Input
                          id="modal-city"
                          value={form.city}
                          onChange={(e) => set("city", e.target.value)}
                          className="mt-1.5"
                          placeholder="Barcelona"
                          maxLength={80}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="modal-website">Sitio web</Label>
                      <Input
                        id="modal-website"
                        value={form.website}
                        onChange={(e) => set("website", e.target.value)}
                        className="mt-1.5"
                        placeholder="https://tuweb.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="modal-country">País</Label>
                      <select
                        id="modal-country"
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

                  <Separator />

                  {/* Account (read-only) */}
                  <div>
                    <p className="text-sm font-medium mb-1">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Para cambiar contraseña usa "¿Olvidaste tu contraseña?" en el login.
                    </p>
                  </div>

                </form>
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-border space-y-2 shrink-0 bg-background">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="profile-form"
                  className="flex-1"
                  disabled={saving || loading}
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Guardar</>
                  )}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full py-1.5 rounded-lg hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
