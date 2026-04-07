import Link from "next/link";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata = {
  title: "Términos de uso — Fiestalo",
  description: "Condiciones generales de uso de la plataforma Fiestalo.",
};

const LAST_UPDATED = "6 de abril de 2026";
const COMPANY      = "Fiestalo Technologies S.L.";
const EMAIL        = "legal@fiestalo.es";
const ADDRESS      = "Calle Ejemplo 1, 08001 Barcelona, España";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-20 pb-20 min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6">

          {/* Header */}
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">
              Última actualización: {LAST_UPDATED}
            </p>
            <h1 className="text-3xl font-bold mb-4">Términos de uso</h1>
            <p className="text-muted-foreground leading-relaxed">
              Estos Términos de Uso regulan el acceso y uso de la plataforma Fiestalo, operada por{" "}
              <strong>{COMPANY}</strong>. Al acceder o utilizar Fiestalo, aceptas estos términos en su totalidad.
              Si no estás de acuerdo, no utilices la plataforma.
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8">

            <Section title="1. Definiciones">
              <p>A efectos de estos Términos, se entiende por:</p>
              <ul>
                <li><strong>Plataforma:</strong> el sitio web y servicios accesibles en fiestalo.es.</li>
                <li><strong>Fiestalo / nosotros:</strong> {COMPANY}, titular y operadora de la plataforma.</li>
                <li><strong>Usuario:</strong> cualquier persona que accede o utiliza la plataforma, tanto registrada como no registrada.</li>
                <li><strong>Propietario / Arrendador:</strong> usuario que publica uno o varios espacios en la plataforma para su alquiler.</li>
                <li><strong>Cliente / Arrendatario:</strong> usuario que realiza reservas de espacios a través de la plataforma.</li>
                <li><strong>Espacio:</strong> el bien inmueble, sala, local o instalación que el Propietario pone a disposición para alquiler temporal.</li>
                <li><strong>Reserva:</strong> el acuerdo entre Propietario y Cliente para el uso del Espacio en un periodo determinado, gestionado a través de la plataforma.</li>
              </ul>
            </Section>

            <Section title="2. Naturaleza de Fiestalo">
              <p>
                Fiestalo actúa como <strong>intermediario tecnológico</strong> entre Propietarios y Clientes.
                Fiestalo no es propietario de los espacios listados, no interviene físicamente en la ejecución
                de las reservas y no es parte del contrato de arrendamiento entre Propietario y Cliente.
              </p>
              <p>
                Fiestalo no puede garantizar la exactitud de las descripciones de espacios publicadas por los
                Propietarios, ni la conducta de ningún usuario. Los usuarios actúan bajo su propia responsabilidad.
              </p>
            </Section>

            <Section title="3. Registro y cuenta de usuario">
              <p>Para utilizar ciertas funcionalidades es necesario crear una cuenta. Al registrarte:</p>
              <ul>
                <li>Garantizas que eres mayor de 18 años o actúas con consentimiento de tu tutor legal.</li>
                <li>Proporcionas información veraz, completa y actualizada.</li>
                <li>Eres responsable de mantener la confidencialidad de tus credenciales.</li>
                <li>Notificarás a Fiestalo de cualquier uso no autorizado de tu cuenta.</li>
                <li>No crearás más de una cuenta personal.</li>
              </ul>
              <p>
                Fiestalo se reserva el derecho de suspender o eliminar cuentas que incumplan estos Términos,
                que proporcionen información falsa o que realicen actividades fraudulentas.
              </p>
            </Section>

            <Section title="4. Publicación de espacios (Propietarios)">
              <p>Al publicar un espacio en Fiestalo, el Propietario declara y garantiza que:</p>
              <ul>
                <li>Tiene derecho legal para arrendar el espacio (propiedad, arrendamiento con derecho de subarrendamiento, representación legal, etc.).</li>
                <li>El espacio cumple con toda la normativa aplicable (urbanística, de seguridad, sanitaria, de accesibilidad, etc.).</li>
                <li>Las descripciones, fotos y demás información publicada son verídicas y no inducen a error.</li>
                <li>Ha obtenido todos los permisos y licencias necesarios para la actividad que se ofrezca.</li>
                <li>Se compromete a mantener actualizada la disponibilidad del espacio.</li>
              </ul>
              <p>
                Fiestalo revisará las publicaciones antes de activarlas y podrá solicitar documentación adicional
                o rechazar publicaciones que no cumplan los requisitos de calidad o que infrinjan la normativa vigente.
              </p>
            </Section>

            <Section title="5. Proceso de reserva">
              <p>El proceso de reserva funciona del siguiente modo:</p>
              <ul>
                <li><strong>Reserva instantánea:</strong> si el Propietario lo activa, la reserva queda confirmada automáticamente tras el pago exitoso.</li>
                <li><strong>Reserva bajo solicitud:</strong> el Cliente realiza la solicitud y el Propietario dispone de 48 horas para aceptarla o rechazarla. Si no responde, la solicitud caduca.</li>
                <li>Una vez confirmada la reserva, tanto Propietario como Cliente reciben confirmación por email.</li>
                <li>La reserva constituye un contrato vinculante entre Propietario y Cliente. Fiestalo no es parte de dicho contrato.</li>
              </ul>
            </Section>

            <Section title="6. Pagos y comisiones">
              <p>
                Los pagos se procesan de forma segura a través de <strong>Stripe</strong>. Fiestalo nunca
                almacena datos de tarjetas de crédito.
              </p>
              <p>
                Fiestalo aplica una <strong>comisión de servicio</strong> sobre el importe de cada reserva,
                visible antes de confirmar el pago. Esta comisión está incluida en el precio total mostrado
                al Cliente y es la retribución de Fiestalo por el uso de la plataforma.
              </p>
              <p>
                Los importes mostrados incluyen todos los conceptos aplicables (precio por hora, tasas de
                limpieza, comisión de servicio). No existen cargos ocultos.
              </p>
            </Section>

            <Section title="7. Cancelaciones y reembolsos">
              <p>
                Cada espacio tiene su propia <strong>política de cancelación</strong> establecida por el
                Propietario (flexible, moderada o estricta), visible en la ficha del espacio y en el resumen
                de reserva antes de confirmar el pago.
              </p>
              <ul>
                <li><strong>Política flexible:</strong> reembolso completo si se cancela con más de 24 horas de antelación; 50% si se cancela con menos de 24 horas.</li>
                <li><strong>Política moderada:</strong> reembolso completo con más de 72 horas; 50% entre 24 y 72 horas; sin reembolso con menos de 24 horas.</li>
                <li><strong>Política estricta:</strong> reembolso completo solo si se cancela con la antelación específica indicada; sin reembolso después.</li>
              </ul>
              <p>
                Los reembolsos se procesan en un plazo de 5 a 10 días hábiles, dependiendo del banco emisor.
                La comisión de servicio de Fiestalo no es reembolsable salvo que Fiestalo haya cometido un error.
              </p>
              <p>
                En caso de cancelación por parte del Propietario de una reserva ya confirmada, el Cliente
                recibirá el reembolso íntegro del importe pagado.
              </p>
            </Section>

            <Section title="8. Obligaciones del Cliente">
              <p>El Cliente se compromete a:</p>
              <ul>
                <li>Usar el espacio únicamente para la finalidad indicada en la reserva y dentro del horario contratado.</li>
                <li>Respetar las normas del espacio publicadas por el Propietario.</li>
                <li>Tratar el espacio con el debido cuidado y dejar las instalaciones en el mismo estado que las encontró.</li>
                <li>No superar el aforo máximo indicado.</li>
                <li>Responder por los daños causados en el espacio durante el uso.</li>
                <li>No ceder la reserva a terceros sin consentimiento del Propietario.</li>
              </ul>
            </Section>

            <Section title="9. Reseñas y valoraciones">
              <p>
                Una vez completada una reserva, el Cliente puede publicar una reseña sobre el espacio.
                Las reseñas deben ser verídicas, basadas en la experiencia personal y respetuosas.
                Está prohibido publicar reseñas falsas, difamatorias o con fines de chantaje.
              </p>
              <p>
                Fiestalo se reserva el derecho de moderar y eliminar reseñas que incumplan estas normas
                o la legislación vigente.
              </p>
            </Section>

            <Section title="10. Conducta prohibida">
              <p>Queda expresamente prohibido:</p>
              <ul>
                <li>Usar la plataforma para actividades ilegales o contrarias al orden público.</li>
                <li>Publicar contenido falso, engañoso, difamatorio, obsceno o que infrinja derechos de terceros.</li>
                <li>Eludir el sistema de pagos de Fiestalo realizando acuerdos económicos directos con la contraparte para evitar las comisiones.</li>
                <li>Realizar scraping, spam o cualquier uso automatizado no autorizado de la plataforma.</li>
                <li>Suplantar la identidad de otras personas o entidades.</li>
                <li>Intentar acceder a áreas restringidas o comprometer la seguridad de la plataforma.</li>
              </ul>
              <p>
                El incumplimiento podrá resultar en la suspensión o eliminación inmediata de la cuenta,
                sin perjuicio de las acciones legales que procedan.
              </p>
            </Section>

            <Section title="11. Propiedad intelectual">
              <p>
                Fiestalo y sus contenidos originales (logotipos, diseño, código, textos) son propiedad de{" "}
                {COMPANY} y están protegidos por la normativa de propiedad intelectual e industrial.
              </p>
              <p>
                Al publicar fotos u otros contenidos en la plataforma, el usuario otorga a Fiestalo una
                licencia no exclusiva, gratuita y mundial para mostrar dichos contenidos en la plataforma
                y en materiales de marketing relacionados.
              </p>
            </Section>

            <Section title="12. Limitación de responsabilidad">
              <p>Fiestalo no será responsable de:</p>
              <ul>
                <li>El incumplimiento por parte de Propietarios o Clientes de sus respectivas obligaciones.</li>
                <li>Daños causados en el espacio durante la reserva.</li>
                <li>La exactitud de las descripciones, fotos o información publicada por los Propietarios.</li>
                <li>Interrupciones del servicio por causas ajenas a Fiestalo (mantenimiento, ataques, etc.).</li>
                <li>Pérdidas indirectas, lucro cesante o daños consecuentes derivados del uso de la plataforma.</li>
              </ul>
              <p>
                La responsabilidad máxima de Fiestalo en cualquier caso quedará limitada al importe de
                las comisiones efectivamente cobradas en la reserva en disputa durante los 12 meses anteriores.
              </p>
            </Section>

            <Section title="13. Modificaciones">
              <p>
                Fiestalo podrá modificar estos Términos en cualquier momento. Las modificaciones entrarán en
                vigor a los 30 días de su publicación en la plataforma. El uso continuado de Fiestalo tras
                dicho plazo implica la aceptación de los nuevos términos. Para cambios sustanciales,
                notificaremos a los usuarios por email.
              </p>
            </Section>

            <Section title="14. Legislación aplicable y jurisdicción">
              <p>
                Estos Términos se rigen por la legislación española. Para cualquier controversia, las partes
                se someten a los juzgados y tribunales de la ciudad de Barcelona, con renuncia expresa a
                cualquier otro fuero que pudiera corresponderles, salvo disposición legal imperativa en contrario.
              </p>
              <p>
                Para reclamaciones de consumidores en la UE, puede acceder a la plataforma de resolución
                de litigios en línea de la Comisión Europea:{" "}
                <a href="https://ec.europa.eu/consumers/odr" className="text-primary hover:underline" target="_blank" rel="noopener">
                  ec.europa.eu/consumers/odr
                </a>
              </p>
            </Section>

            <Section title="15. Contacto">
              <p>
                Para cualquier consulta sobre estos Términos, puedes contactarnos en:
              </p>
              <ul>
                <li>Email: <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a></li>
                <li>Dirección: {ADDRESS}</li>
              </ul>
            </Section>

          </div>

          {/* Footer links */}
          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Política de privacidad
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
      <div className="space-y-3 text-muted-foreground text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground [&_strong]:font-medium">
        {children}
      </div>
    </section>
  );
}
