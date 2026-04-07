const TESTIMONIALS = [
  { name: "Marta G.", role: "Mamá de Lucía", text: "Reservé la sala en 5 minutos y la fiesta de cumpleaños fue perfecta. La sala tenía todo lo que necesitábamos: hinchable, cocina y zona de merienda. ¡Repetiremos!", rating: 5, avatar: "M" },
  { name: "Jordi P.", role: "Papá de tres niños", text: "Llevamos dos años usando Fiestalo para los cumpleaños de nuestros hijos. La variedad de salas temáticas en Barcelona es increíble. Siempre encontramos algo diferente.", rating: 5, avatar: "J" },
  { name: "Ana R.", role: "Organizadora de eventos infantiles", text: "Como profesional, Fiestalo es mi primera opción para recomendar a las familias. Precios transparentes, salas verificadas y proceso de reserva sin complicaciones.", rating: 5, avatar: "A" },
];

export function SocialProof() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-muted-foreground">
            Miles de familias ya celebran con Fiestalo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i} className="text-amber-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-5 text-sm">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust logos */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          {["Pago seguro con Stripe", "Salas verificadas", "Soporte familiar", "+500 salas en España"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-emerald-500">✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
