import { Section, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout, EmailHero, EmailBody, EmailButton,
  EmailText, EmailDivider, colors,
} from "./layout";

interface WelcomeEmailProps {
  name: string;
  role: "TENANT" | "OWNER";
  appUrl: string;
}

export function WelcomeEmail({ name, role, appUrl }: WelcomeEmailProps) {
  const isOwner = role === "OWNER";

  return (
    <EmailLayout preview={`¡Bienvenido a Fiestalo, ${name}!`}>
      <EmailHero
        title="¡Bienvenido a Fiestalo! 🎂"
        subtitle="El marketplace de salas de fiestas único en España"
      />
      <EmailBody>
        <EmailText>Hola <strong>{name}</strong>,</EmailText>
        <EmailText>
          {isOwner
            ? "Tu cuenta como propietario ya está lista. Ahora puedes publicar tus salas de fiestas y empezar a recibir reservas de familias en tu zona."
            : "Tu cuenta está lista. Ya puedes explorar y reservar salas de fiestas para los cumpleaños y celebraciones de tu familia."}
        </EmailText>

        <Section style={{
          backgroundColor: "#f5f3ff",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}>
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: "14px", margin: "0 0 12px" }}>
            {isOwner ? "¿Cómo empezar?" : "¿Qué puedes hacer?"}
          </Text>
          {isOwner ? (
            <>
              <Text style={{ color: colors.text, fontSize: "13px", margin: "0 0 6px" }}>✅ Crea tu primer espacio en minutos</Text>
              <Text style={{ color: colors.text, fontSize: "13px", margin: "0 0 6px" }}>✅ Sube fotos y define tu disponibilidad</Text>
              <Text style={{ color: colors.text, fontSize: "13px", margin: 0 }}>✅ Recibe reservas y gestiónalas desde tu panel</Text>
            </>
          ) : (
            <>
              <Text style={{ color: colors.text, fontSize: "13px", margin: "0 0 6px" }}>✅ Busca entre +500 salas de fiestas verificadas</Text>
              <Text style={{ color: colors.text, fontSize: "13px", margin: "0 0 6px" }}>✅ Reserva por horas o paquetes con confirmación inmediata</Text>
              <Text style={{ color: colors.text, fontSize: "13px", margin: 0 }}>✅ Pago seguro con Stripe — sin sorpresas</Text>
            </>
          )}
        </Section>

        <EmailButton href={isOwner ? `${appUrl}/owner` : `${appUrl}/search`}>
          {isOwner ? "Publicar mi sala →" : "Explorar salas →"}
        </EmailButton>

        <EmailDivider />
        <EmailText muted size="sm">
          Si no creaste esta cuenta, ignora este email. Para cualquier duda escríbenos a hola@fiestalo.es
        </EmailText>
      </EmailBody>
    </EmailLayout>
  );
}

export default WelcomeEmail;
