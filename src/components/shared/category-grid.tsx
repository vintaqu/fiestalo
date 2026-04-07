// CategoryGrid
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/search?categoryId=${cat.id}`}
          className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all text-center"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">
            {cat.icon ?? "🏢"}
          </span>
          <span className="text-xs font-medium leading-tight">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
