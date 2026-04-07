import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminDashboardClient } from "@/components/dashboard/admin-dashboard-client";

async function getFilterOptions() {
  const [owners, categories, cities] = await Promise.all([
    db.user.findMany({
      where:   { role: "OWNER", deletedAt: null },
      select:  { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, icon: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.venue.groupBy({
      by:      ["city"],
      where:   { status: "ACTIVE", deletedAt: null },
      _count:  { id: true },
      orderBy: { _count: { id: "desc" } },
      take:    30,
    }),
  ]);
  return {
    owners,
    categories,
    cities: cities.map((c) => c.city).filter(Boolean) as string[],
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");
  const filterOptions = await getFilterOptions();
  return <AdminDashboardClient filterOptions={filterOptions} />;
}
