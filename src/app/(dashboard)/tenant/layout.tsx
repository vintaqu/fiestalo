import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TenantSidebar } from "@/components/dashboard/tenant-sidebar";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-secondary/20">
      <TenantSidebar user={session.user} />
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}
