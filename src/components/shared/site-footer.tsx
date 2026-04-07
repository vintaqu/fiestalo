import Link from "next/link";
import { Building2 } from "lucide-react";

const LINKS = {
  Plataforma: [
    { href: "/search", label: "Buscar espacios" },
    { href: "/register?role=OWNER", label: "Publicar espacio" },
    { href: "/pricing", label: "Precios" },
    { href: "/how-it-works", label: "Cómo funciona" },
  ],
  Categorías: [
    { href: "/search?categoryId=sala-reuniones", label: "Salas de reuniones" },
    { href: "/search?categoryId=estudio-fotografico", label: "Estudios fotográficos" },
    { href: "/search?categoryId=espacio-eventos", label: "Espacios para eventos" },
    { href: "/search?categoryId=coworking", label: "Coworking" },
  ],
  Empresa: [
    { href: "/about", label: "Sobre nosotros" },
    { href: "/blog", label: "Blog" },
    { href: "/press", label: "Prensa" },
    { href: "/jobs", label: "Trabaja con nosotros" },
  ],
  Soporte: [
    { href: "/help", label: "Centro de ayuda" },
    { href: "/contact", label: "Contacto" },
    { href: "/privacy", label: "Privacidad" },
    { href: "/terms", label: "Términos de uso" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              Fiestalo
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El marketplace de salas de fiestas más completo de España.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-semibold text-sm mb-3">{section}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fiestalo Technologies S.L. · Todos los derechos reservados
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>🇪🇸 España</span>
            <span>€ EUR</span>
            <span>ES</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
