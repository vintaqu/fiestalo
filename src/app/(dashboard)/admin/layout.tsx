import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-screen bg-secondary/20">
      <AdminSidebar user={session.user} />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
