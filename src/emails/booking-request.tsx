import { Section, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout, EmailHero, EmailBody, EmailButton,
  EmailText, EmailInfoRow, EmailInfoTable,
  EmailDivider, colors,
} from "./layout";

interface BookingRequestEmailProps {
  ownerName:     string;
  tenantName:    string;
  tenantEmail:   string;
  venueTitle:    string;
  date:          string;
  startTime:     string;
  endTime:       string;
  durationHours: number;
  guestCount:    number;
  total:         string;
  specialRequests?: string;
  bookingId:     string;
  appUrl:        string;
}

export function BookingRequestEmail({
  ownerName, tenantName, tenantEmail, venueTitle,
  date, startTime, endTime, durationHours, guestCount,
  total, specialRequests, bookingId, appUrl,
}: BookingRequestEmailProps) {
  return (
    <EmailLayout preview={`Nueva solicitud de reserva en ${venueTitle}`}>
      <EmailHero
        title="Nueva solicitud de reserva 📩"
        subtitle={`${tenantName} quiere reservar ${venueTitle}`}
        color="#7c3aed"
      />
      <EmailBody>
        <EmailText>Hola <strong>{ownerName}</strong>,</EmailText>
        <EmailText>
          Has recibido una nueva solicitud de reserva. Tienes que aceptarla o rechazarla
          para que el cliente pueda proceder al pago.
        </EmailText>

        <Section style={{
          backgroundColor: "#faf5ff",
          border: "1px solid #e9d5ff",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}>
          <EmailInfoTable>
            <EmailInfoRow label="👤 Cliente"   value={`${tenantName} (${tenantEmail})`} />
            <EmailInfoRow label="📅 Fecha"     value={date} />
            <EmailInfoRow label="🕐 Horario"   value={`${startTime} – ${endTime} (${durationHours}h)`} />
            <EmailInfoRow label="👥 Personas"  value={`${guestCount}`} />
            <EmailInfoRow label="💰 Importe"   value={total} />
          </EmailInfoTable>

          {specialRequests && (
            <Section style={{
              backgroundColor: colors.white,
              borderRadius: "8px",
              padding: "12px 16px",
              marginTop: "12px",
              border: `1px solid ${colors.border}`,
            }}>
              <Text style={{ color: colors.textMuted, fontSize: "12px", margin: "0 0 4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Solicitudes especiales
              </Text>
              <Text style={{ color: colors.text, fontSize: "14px", margin: 0 }}>
                {specialRequests}
              </Text>
            </Section>
          )}
        </Section>

        <EmailButton href={`${appUrl}/owner/bookings/${bookingId}`} color="#7c3aed">
          Revisar solicitud →
        </EmailButton>

        <EmailDivider />
        <EmailText muted size="sm">
          Recuerda responder cuanto antes — el cliente está esperando tu confirmación.
          Si no respondes en 48h, la solicitud caducará automáticamente.
        </EmailText>
      </EmailBody>
    </EmailLayout>
  );
}

export default BookingRequestEmail;
