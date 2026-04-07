import { Section, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout, EmailHero, EmailBody, EmailButton,
  EmailText, EmailInfoRow, EmailInfoTable,
  EmailDivider, colors,
} from "./layout";

interface BookingCancellationEmailProps {
  recipientName:      string;
  venueTitle:         string;
  date:               string;
  startTime:          string;
  endTime:            string;
  cancelledBy:        "user" | "owner" | "system";
  cancellationReason?: string;
  refundAmount?:      string;
  refundIsFullAmount?: boolean;
  appUrl:             string;
}

export function BookingCancellationEmail({
  recipientName, venueTitle, date, startTime, endTime,
  cancelledBy, cancellationReason, refundAmount,
  refundIsFullAmount, appUrl,
}: BookingCancellationEmailProps) {
  const cancellerLabel = {
    user:   "has cancelado",
    owner:  "el propietario ha cancelado",
    system: "se ha cancelado",
  }[cancelledBy];

  return (
    <EmailLayout preview={`Reserva cancelada – ${venueTitle}`}>
      <EmailHero
        title="Reserva cancelada"
        subtitle={venueTitle}
        color={colors.danger}
      />
      <EmailBody>
        <EmailText>Hola <strong>{recipientName}</strong>,</EmailText>
        <EmailText>
          Te confirmamos que {cancellerLabel} la reserva en <strong>{venueTitle}</strong>.
        </EmailText>

        <Section style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}>
          <EmailInfoTable>
            <EmailInfoRow label="📍 Espacio"  value={venueTitle} />
            <EmailInfoRow label="📅 Fecha"    value={date} />
            <EmailInfoRow label="🕐 Horario"  value={`${startTime} – ${endTime}`} />
          </EmailInfoTable>

          {cancellationReason && (
            <Text style={{ color: colors.textMuted, fontSize: "13px", margin: "8px 0 0", fontStyle: "italic" }}>
              Motivo: {cancellationReason}
            </Text>
          )}
        </Section>

        {/* Refund info */}
        {refundAmount && (
          <Section style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
          }}>
            <Text style={{ color: colors.success, fontWeight: "700", fontSize: "15px", margin: "0 0 4px" }}>
              💰 Reembolso procesado: {refundAmount}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: "13px", margin: 0 }}>
              {refundIsFullAmount
                ? "Recibirás el importe completo en 5–10 días hábiles en tu método de pago original."
                : "Recibirás el importe parcial según la política de cancelación del espacio."}
            </Text>
          </Section>
        )}

        {!refundAmount && (
          <Section style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
          }}>
            <Text style={{ color: colors.warning, fontSize: "14px", margin: 0 }}>
              ⚠️ Según la política de cancelación del espacio, no corresponde reembolso en este caso.
            </Text>
          </Section>
        )}

        <EmailButton href={`${appUrl}/search`} color={colors.primary}>
          Buscar otro espacio →
        </EmailButton>

        <EmailDivider />
        <EmailText muted size="sm">
          Si tienes alguna duda sobre el reembolso o la cancelación, contáctanos en hola@fiestalo.es
        </EmailText>
      </EmailBody>
    </EmailLayout>
  );
}

export default BookingCancellationEmail;
