import Link from "next/link";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata = {
  title: "Política de privacidad — Fiestalo",
  description: "Cómo Fiestalo trata y protege tus datos personales conforme al RGPD y la LOPDGDD.",
};

const LAST_UPDATED  = "6 de abril de 2026";
const COMPANY       = "Fiestalo Technologies S.L.";
const CIF           = "B-XXXXXXXX";
const EMAIL         = "privacidad@fiestalo.es";
const ADDRESS       = "Calle Ejemplo 1, 08001 Barcelona, España";
const DPO_EMAIL     = "dpo@fiestalo.es";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-20 pb-20 min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6">

          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">
              Última actualización: {LAST_UPDATED}
            </p>
            <h1 className="text-3xl font-bold mb-4">Política de privacidad</h1>
            <p className="text-muted-foreground leading-relaxed">
              En Fiestalo nos comprometemos a proteger tu privacidad. Esta Política explica qué datos
              personales recopilamos, cómo los usamos y cuáles son tus derechos conforme al{" "}
              <strong>Reglamento General de Protección de Datos (RGPD)</strong> y la{" "}
              <strong>Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos
              digitales (LOPDGDD)</strong>.
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8">

            <Section title="1. Responsable del tratamiento">
              <table className="text-sm w-full border-collapse">
                <tbody>
                  <Row label="Empresa" value={COMPANY} />
                  <Row label="CIF" value={CIF} />
                  <Row label="Domicilio" value={ADDRESS} />
                  <Row label="Email" value={EMAIL} />
                  <Row label="DPO (Delegado de Protección de Datos)" value={DPO_EMAIL} />
                </tbody>
              </table>
            </Section>

            <Section title="2. Datos que recopilamos">
              <p>Recopilamos los siguientes tipos de datos personales:</p>

              <p><strong>a) Datos que nos proporcionas directamente</strong></p>
              <ul>
                <li><strong>Datos de registro:</strong> nombre, dirección de email, contraseña (almacenada con hash bcrypt, nunca en texto plano).</li>
                <li><strong>Datos de perfil:</strong> foto de perfil, teléfono, ciudad, biografía, sitio web.</li>
                <li><strong>Datos de espacios (Propietarios):</strong> título, descripción, dirección, fotos, precios y disponibilidad.</li>
                <li><strong>Datos de reservas:</strong> fechas, horarios, número de personas, mensajes asociados.</li>
                <li><strong>Datos de pago:</strong> gestionados íntegramente por Stripe. Fiestalo no almacena números de tarjeta ni datos bancarios completos. Solo guardamos identificadores de cliente y de transacción de Stripe.</li>
              </ul>

              <p><strong>b) Datos recogidos automáticamente</strong></p>
              <ul>
                <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo, páginas visitadas, duración de la sesión.</li>
                <li><strong>Cookies:</strong> utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas para mejorar el servicio. Ver sección 9.</li>
                <li><strong>Datos de geolocalización aproximada:</strong> derivados de la dirección IP para mostrar resultados relevantes.</li>
              </ul>

              <p><strong>c) Datos de terceros</strong></p>
              <ul>
                <li>Si te registras con Google, recibimos tu nombre, email y foto de perfil de Google conforme a su política de privacidad.</li>
              </ul>
            </Section>

            <Section title="3. Finalidad y base legal del tratamiento">
              <table className="text-sm w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-foreground">Finalidad</th>
                    <th className="text-left py-2 font-medium text-foreground">Base legal (RGPD Art. 6)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr><td className="py-2 pr-4">Gestión de la cuenta de usuario</td><td className="py-2">Ejecución de contrato (6.1.b)</td></tr>
                  <tr><td className="py-2 pr-4">Gestión de reservas y pagos</td><td className="py-2">Ejecución de contrato (6.1.b)</td></tr>
                  <tr><td className="py-2 pr-4">Envío de emails transaccionales</td><td className="py-2">Ejecución de contrato (6.1.b)</td></tr>
                  <tr><td className="py-2 pr-4">Mejora del servicio y análisis de uso</td><td className="py-2">Interés legítimo (6.1.f)</td></tr>
                  <tr><td className="py-2 pr-4">Comunicaciones de marketing</td><td className="py-2">Consentimiento (6.1.a)</td></tr>
                  <tr><td className="py-2 pr-4">Cumplimiento de obligaciones legales</td><td className="py-2">Obligación legal (6.1.c)</td></tr>
                  <tr><td className="py-2 pr-4">Prevención de fraude y seguridad</td><td className="py-2">Interés legítimo (6.1.f)</td></tr>
                </tbody>
              </table>
            </Section>

            <Section title="4. Destinatarios de los datos">
              <p>
                No vendemos ni alquilamos tus datos personales a terceros. Compartimos datos únicamente con:
              </p>
              <ul>
                <li>
                  <strong>Stripe Inc.</strong> — procesamiento seguro de pagos. Datos transferidos bajo
                  cláusulas contractuales tipo UE.{" "}
                  <a href="https://stripe.com/es/privacy" className="text-primary hover:underline" target="_blank" rel="noopener">
                    Política de privacidad de Stripe
                  </a>
                </li>
                <li>
                  <strong>Cloudinary Inc.</strong> — almacenamiento y procesamiento de imágenes.
                  Datos transferidos bajo cláusulas contractuales tipo UE.
                </li>
                <li>
                  <strong>Resend Inc.</strong> — envío de emails transaccionales.
                </li>
                <li>
                  <strong>Mapbox Inc.</strong> — servicios de geolocalización y mapas. Solo se transmiten
                  coordenadas aproximadas o consultas de búsqueda de ubicación.
                </li>
                <li>
                  <strong>Vercel Inc.</strong> — alojamiento de la infraestructura de la plataforma.
                </li>
                <li>
                  <strong>Autoridades públicas</strong> — cuando sea requerido por ley o resolución judicial.
                </li>
              </ul>
              <p>
                Cuando los datos se transfieren fuera del Espacio Económico Europeo, nos aseguramos de que
                existan garantías adecuadas (decisiones de adecuación, cláusulas contractuales tipo, etc.).
              </p>
            </Section>

            <Section title="5. Plazos de conservación">
              <ul>
                <li><strong>Datos de cuenta:</strong> mientras la cuenta esté activa y, tras su eliminación, durante los plazos legales aplicables (generalmente 5 años para obligaciones fiscales y 3 años para acciones contractuales).</li>
                <li><strong>Datos de reservas y pagos:</strong> 5 años desde la fecha de la reserva, por obligaciones fiscales y contables.</li>
                <li><strong>Logs de acceso y seguridad:</strong> 12 meses.</li>
                <li><strong>Comunicaciones de marketing:</strong> hasta que retires tu consentimiento.</li>
              </ul>
            </Section>

            <Section title="6. Tus derechos">
              <p>
                Como interesado, tienes los siguientes derechos sobre tus datos personales:
              </p>
              <ul>
                <li><strong>Derecho de acceso:</strong> obtener confirmación de si tratamos tus datos y recibir una copia.</li>
                <li><strong>Derecho de rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Derecho de supresión ("derecho al olvido"):</strong> solicitar la eliminación de tus datos cuando ya no sean necesarios.</li>
                <li><strong>Derecho de limitación:</strong> solicitar que restrinjamos el tratamiento en determinadas circunstancias.</li>
                <li><strong>Derecho de portabilidad:</strong> recibir tus datos en formato estructurado y de uso común.</li>
                <li><strong>Derecho de oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
                <li><strong>Derecho a retirar el consentimiento:</strong> en cualquier momento, sin que ello afecte a la licitud del tratamiento previo.</li>
                <li><strong>Derecho a no ser objeto de decisiones automatizadas:</strong> a no ser sometido a decisiones tomadas exclusivamente por sistemas automatizados que produzcan efectos jurídicos significativos.</li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, envía un email a{" "}
                <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>{" "}
                con tu nombre, DNI/NIF y la solicitud concreta. Responderemos en el plazo máximo de 30 días.
              </p>
              <p>
                Si consideras que el tratamiento de tus datos no es adecuado, tienes derecho a presentar
                una reclamación ante la{" "}
                <a href="https://www.aepd.es" className="text-primary hover:underline" target="_blank" rel="noopener">
                  Agencia Española de Protección de Datos (AEPD)
                </a>.
              </p>
            </Section>

            <Section title="7. Seguridad de los datos">
              <p>
                Adoptamos medidas técnicas y organizativas adecuadas para proteger tus datos:
              </p>
              <ul>
                <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
                <li>Contraseñas almacenadas con hash bcrypt (coste 12), nunca en texto plano.</li>
                <li>Acceso a los datos de producción limitado al personal autorizado.</li>
                <li>Copias de seguridad regulares y cifradas.</li>
                <li>Registro de auditoría de accesos y modificaciones sensibles.</li>
                <li>Datos de pago gestionados íntegramente por Stripe (certificación PCI DSS Nivel 1).</li>
              </ul>
              <p>
                En caso de brecha de seguridad que pueda afectar a tus derechos, te notificaremos en el
                plazo establecido por el RGPD (72 horas desde que tengamos conocimiento).
              </p>
            </Section>

            <Section title="8. Menores de edad">
              <p>
                Fiestalo no está dirigido a menores de 14 años. No recopilamos conscientemente datos de
                menores. Si eres padre o tutor y crees que tu hijo ha proporcionado datos personales,
                contáctanos en {EMAIL} para proceder a su eliminación.
              </p>
            </Section>

            <Section title="9. Cookies">
              <p>Utilizamos los siguientes tipos de cookies:</p>
              <ul>
                <li>
                  <strong>Cookies esenciales:</strong> necesarias para el funcionamiento de la plataforma
                  (sesión de usuario, seguridad). No pueden desactivarse.
                </li>
                <li>
                  <strong>Cookies analíticas:</strong> nos permiten entender cómo se usa la plataforma para
                  mejorarla. Puedes desactivarlas desde la configuración de tu navegador.
                </li>
              </ul>
              <p>
                No utilizamos cookies de publicidad ni rastreamos tu actividad fuera de Fiestalo.
              </p>
            </Section>

            <Section title="10. Cambios en esta política">
              <p>
                Podemos actualizar esta Política cuando sea necesario. Te notificaremos los cambios
                significativos por email con al menos 30 días de antelación. La fecha de "última actualización"
                al inicio del documento refleja siempre la versión vigente.
              </p>
            </Section>

            <Section title="11. Contacto">
              <p>Para cualquier consulta sobre privacidad:</p>
              <ul>
                <li>Email general: <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a></li>
                <li>Delegado de Protección de Datos: <a href={`mailto:${DPO_EMAIL}`} className="text-primary hover:underline">{DPO_EMAIL}</a></li>
                <li>Dirección postal: {ADDRESS}</li>
              </ul>
            </Section>

          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Términos de uso
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Volver al inicio
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground [&_strong]:font-medium [&_table]:w-full [&_td]:py-1.5 [&_td]:pr-4">
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-2 pr-4 font-medium text-foreground text-sm w-48">{label}</td>
      <td className="py-2 text-muted-foreground text-sm">{value}</td>
    </tr>
  );
}
