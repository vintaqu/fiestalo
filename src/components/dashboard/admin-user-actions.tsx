"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldBan, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AdminUserActionsProps {
  userId:        string;
  isBanned:      boolean;
  currentUserId: string;
}

export function AdminUserActions({ userId, isBanned, currentUserId }: AdminUserActionsProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Can't ban yourself
  if (userId === currentUserId) return <span className="text-xs text-muted-foreground">—</span>;

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/${isBanned ? "unban" : "ban"}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast({ title: isBanned ? "Usuario desbaneado" : "Usuario baneado" });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors mx-auto ${
        isBanned
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-red-100 text-red-700 hover:bg-red-200"
      }`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isBanned ? (
        <ShieldCheck className="w-3 h-3" />
      ) : (
        <ShieldBan className="w-3 h-3" />
      )}
      {isBanned ? "Desbanear" : "Banear"}
    </button>
  );
}
