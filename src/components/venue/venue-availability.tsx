const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface AvailabilityRule {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export function VenueAvailability({
  venueId,
  availabilityRules,
  minHours,
}: {
  venueId: string;
  availabilityRules: AvailabilityRule[];
  minHours: number;
}) {
  const sorted = [...availabilityRules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Disponibilidad</h2>
      <div className="rounded-2xl border border-border overflow-hidden">
        {sorted.map((rule, i) => (
          <div
            key={rule.dayOfWeek}
            className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
          >
            <span className="text-sm font-medium w-10">
              {DAYS[rule.dayOfWeek]}
            </span>
            {rule.isOpen ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  {rule.openTime} – {rule.closeTime}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span className="text-sm text-muted-foreground">Cerrado</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Reserva mínima: {minHours}h · Los precios pueden variar según la temporada
      </p>
    </div>
  );
}
