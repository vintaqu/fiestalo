import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OwnerSidebar } from "@/components/dashboard/owner-sidebar";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || !["OWNER", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-secondary/20">
      <OwnerSidebar user={session.user} />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
