import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

export function OwnerCTA() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 text-white px-8 py-16 text-center">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Tienes una sala de fiestas?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8 leading-relaxed">
              Únete a los propietarios que ya generan ingresos con sus salas de fiestas.
              Publica gratis y empieza a recibir reservas de familias en tu zona.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              {["Sin exclusividad", "Comisión solo al cobrar", "Calendario de reservas", "Soporte dedicado"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-white text-brand-700 hover:bg-white/90 font-semibold h-12 px-8"
                asChild
              >
                <Link href="/register?role=OWNER">
                  Publicar mi sala
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 h-12"
                asChild
              >
                <Link href="/owner/info">Saber más</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
