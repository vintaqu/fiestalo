import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/utils/format";
import { AdminUserActions } from "@/components/dashboard/admin-user-actions";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:  { label: "Admin",       color: "bg-purple-100 text-purple-700" },
  OWNER:  { label: "Propietario", color: "bg-blue-100 text-blue-700" },
  TENANT: { label: "Cliente",     color: "bg-gray-100 text-gray-600" },
};

async function getUsers(role?: string, search?: string) {
  const where: any = { deletedAt: null };
  if (role && role !== "all") where.role = role;
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  return db.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, image: true,
      role: true, isActive: true, isBanned: true,
      emailVerified: true, createdAt: true,
      _count: { select: { bookings: true, venues: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { role?: string; q?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const activeRole = searchParams.role ?? "all";
  const users      = await getUsers(activeRole, searchParams.q);

  const TABS = [
    { key: "all",    label: "Todos" },
    { key: "TENANT", label: "Clientes" },
    { key: "OWNER",  label: "Propietarios" },
    { key: "ADMIN",  label: "Admins" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground mt-1">{users.length} usuarios</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              href={`/admin/users${tab.key !== "all" ? `?role=${tab.key}` : ""}${searchParams.q ? `${tab.key !== "all" ? "&" : "?"}q=${searchParams.q}` : ""}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeRole === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* Search */}
        <form method="GET" action="/admin/users" className="sm:ml-auto">
          <input type="hidden" name="role" value={activeRole} />
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar por nombre o email..."
            className="h-10 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
          />
        </form>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Usuario</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Rol</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Reservas</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Espacios</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Registro</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={user.image ?? ""} />
                          <AvatarFallback className="text-xs">{user.name?.charAt(0) ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name ?? "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted-foreground">{user._count.bookings}</td>
                    <td className="px-5 py-3.5 text-center text-muted-foreground">{user._count.venues}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3.5 text-center">
                      {user.isBanned ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Baneado</span>
                      ) : !user.isActive ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">Inactivo</span>
                      ) : (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Activo</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <AdminUserActions
                        userId={user.id}
                        isBanned={user.isBanned}
                        currentUserId={session.user.id}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-sm">No hay usuarios</p>
          </div>
        )}
      </div>
    </div>
  );
}
