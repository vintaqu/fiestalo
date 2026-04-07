
const STEPS = [
  { emoji: "🔍", title: "Busca tu sala", desc: "Filtra por ciudad, fecha, número de invitados y características. Compara en mapa y elige la más adecuada." },
  { emoji: "📦", title: "Elige tu paquete", desc: "Selecciona el número de horas, comprueba disponibilidad real y reserva en segundos." },
  { emoji: "💳", title: "Paga con seguridad", desc: "Pago online seguro con Stripe. Solo se carga cuando la reserva se confirma." },
  { emoji: "🎂", title: "¡A celebrar!", desc: "Recibe la confirmación, llega a la sala y disfruta de una fiesta inolvidable." },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Reservar es muy sencillo
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          En cuatro pasos tienes tu sala lista para la fiesta
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Connector line */}
        <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col items-center text-center gap-3 relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 border-2 border-primary/10 flex items-center justify-center text-4xl relative z-10 bg-background">
              {step.emoji}
            </div>
            <div className="absolute top-3 right-1/4 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {i + 1}
            </div>
            <h3 className="font-semibold text-lg">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
