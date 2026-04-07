import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Redirect to appropriate dashboard based on role
  const dashPath =
    session.user.role === "OWNER" || session.user.role === "ADMIN"
      ? "/owner"
      : "/tenant";

  return (
    <div className="flex min-h-screen bg-secondary/20">
      {/* Simple sidebar just for settings — inherits dashboard chrome */}
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
