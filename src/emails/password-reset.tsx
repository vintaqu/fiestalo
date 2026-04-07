import * as React from "react";
import {
  EmailLayout, EmailHero, EmailBody, EmailButton,
  EmailText, EmailDivider, colors,
} from "./layout";
import { Section, Text } from "@react-email/components";

interface PasswordResetEmailProps {
  name:     string;
  resetUrl: string;
  expiresIn: string; // "1 hora"
}

export function PasswordResetEmail({ name, resetUrl, expiresIn }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Recupera tu contraseña de Fiestalo">
      <EmailHero
        title="Recuperar contraseña 🔐"
        subtitle="Solicitud de restablecimiento de contraseña"
        color="#374151"
      />
      <EmailBody>
        <EmailText>Hola <strong>{name}</strong>,</EmailText>
        <EmailText>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en Fiestalo.
          Haz clic en el botón para crear una nueva contraseña:
        </EmailText>

        <EmailButton href={resetUrl} color={colors.primary}>
          Restablecer contraseña →
        </EmailButton>

        <Text style={{ textAlign: "center", color: colors.textMuted, fontSize: "13px", margin: "8px 0 24px" }}>
          Este enlace es válido durante <strong>{expiresIn}</strong>
        </Text>

        <Section style={{
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "24px",
        }}>
          <Text style={{ color: colors.warning, fontSize: "13px", margin: 0 }}>
            ⚠️ Si no solicitaste este cambio, ignora este email. Tu contraseña no cambiará.
          </Text>
        </Section>

        <EmailDivider />
        <EmailText muted size="sm">
          Por seguridad, nunca compartimos tu contraseña. Si tienes problemas, contacta con
          nosotros en hola@fiestalo.es
        </EmailText>
      </EmailBody>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
