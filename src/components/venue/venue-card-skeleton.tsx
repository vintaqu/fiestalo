export function VenueCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card animate-pulse">
      <div className="aspect-[4/3] bg-muted skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded skeleton w-3/4" />
        <div className="h-3 bg-muted rounded skeleton w-1/2" />
        <div className="h-3 bg-muted rounded skeleton w-1/3" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-muted rounded skeleton w-16" />
          <div className="h-5 bg-muted rounded skeleton w-20" />
        </div>
      </div>
    </div>
  );
}
