import { Section, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout, EmailHero, EmailBody, EmailButton,
  EmailText, EmailInfoRow, EmailInfoTable,
  EmailDivider, colors,
} from "./layout";

interface BookingReminderEmailProps {
  tenantName:   string;
  venueTitle:   string;
  venueAddress: string;
  venueCity:    string;
  date:         string;
  startTime:    string;
  endTime:      string;
  guestCount:   number;
  bookingRef:   string;
  hoursUntil:   number; // 24 or 2
  bookingId:    string;
  appUrl:       string;
}

export function BookingReminderEmail({
  tenantName, venueTitle, venueAddress, venueCity,
  date, startTime, endTime, guestCount, bookingRef,
  hoursUntil, bookingId, appUrl,
}: BookingReminderEmailProps) {
  const is24h = hoursUntil >= 20;

  return (
    <EmailLayout preview={`${is24h ? "Mañana" : "En 2 horas"} — ${venueTitle}`}>
      <EmailHero
        title={is24h ? "Tu reserva es mañana ⏰" : "¡Tu reserva es en 2 horas! 🚀"}
        subtitle={venueTitle}
        color={is24h ? "#0891b2" : colors.warning}
      />
      <EmailBody>
        <EmailText>Hola <strong>{tenantName}</strong>,</EmailText>
        <EmailText>
          {is24h
            ? "Te recordamos que mañana tienes una reserva en Fiestalo. ¡Prepárate!"
            : "Tu reserva empieza muy pronto. Aquí tienes los datos para llegar a tiempo."}
        </EmailText>

        <Section style={{
          backgroundColor: is24h ? "#ecfeff" : "#fffbeb",
          border: `1px solid ${is24h ? "#a5f3fc" : "#fde68a"}`,
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}>
          <Text style={{
            fontWeight: "700",
            fontSize: "15px",
            color: colors.text,
            margin: "0 0 16px",
          }}>
            📍 {venueTitle}
          </Text>
          <EmailInfoTable>
            <EmailInfoRow label="📅 Fecha"     value={date} />
            <EmailInfoRow label="🕐 Horario"   value={`${startTime} – ${endTime}`} />
            <EmailInfoRow label="👥 Personas"  value={`${guestCount}`} />
            <EmailInfoRow label="📍 Dirección" value={`${venueAddress}, ${venueCity}`} />
            <EmailInfoRow label="🔖 Referencia" value={bookingRef} />
          </EmailInfoTable>
        </Section>

        {/* Map link */}
        <Section style={{ textAlign: "center", marginBottom: "8px" }}>
          <Text style={{ fontSize: "13px", color: colors.textMuted, margin: "0 0 4px" }}>
            ¿Necesitas llegar?
          </Text>
        </Section>

        <EmailButton
          href={`https://maps.google.com?q=${encodeURIComponent(`${venueAddress}, ${venueCity}`)}`}
          color="#0891b2"
        >
          Abrir en Google Maps →
        </EmailButton>

        <EmailButton href={`${appUrl}/tenant/bookings/${bookingId}`} color={colors.primary}>
          Ver detalles de la reserva
        </EmailButton>

        <EmailDivider />
        <EmailText muted size="sm">
          Si necesitas cancelar, hazlo desde tu panel de reservas. Recuerda que la política
          de cancelación del espacio puede aplicar según la antelación.
        </EmailText>
      </EmailBody>
    </EmailLayout>
  );
}

export default BookingReminderEmail;
