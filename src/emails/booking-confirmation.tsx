import { Section, Text, Link } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout, EmailHero, EmailBody, EmailButton,
  EmailText, EmailInfoRow, EmailInfoTable,
  EmailDivider, colors,
} from "./layout";

interface BookingConfirmationEmailProps {
  tenantName:   string;
  venueTitle:   string;
  venueAddress: string;
  venueCity:    string;
  date:         string; // formatted: "lunes 29 de abril de 2026"
  startTime:    string;
  endTime:      string;
  durationHours: number;
  guestCount:   number;
  subtotal:     string;
  cleaningFee:  string;
  platformFee:  string;
  total:        string;
  bookingRef:   string;
  receiptUrl?:  string;
  appUrl:       string;
  bookingId:    string;
}

export function BookingConfirmationEmail({
  tenantName, venueTitle, venueAddress, venueCity,
  date, startTime, endTime, durationHours, guestCount,
  subtotal, cleaningFee, platformFee, total,
  bookingRef, receiptUrl, appUrl, bookingId,
}: BookingConfirmationEmailProps) {
  return (
    <EmailLayout preview={`✅ Reserva confirmada en ${venueTitle}`}>
      <EmailHero
        title="¡Reserva confirmada! ✅"
        subtitle={venueTitle}
        color={colors.success}
      />
      <EmailBody>
        <EmailText>Hola <strong>{tenantName}</strong>,</EmailText>
        <EmailText>
          Tu reserva ha sido confirmada y el pago procesado correctamente.
          Aquí tienes todos los detalles:
        </EmailText>

        {/* Booking details */}
        <Section style={{
          backgroundColor: "#f0fdf4",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
          border: "1px solid #bbf7d0",
        }}>
          <Text style={{ color: colors.success, fontWeight: "700", fontSize: "16px", margin: "0 0 16px" }}>
            📍 {venueTitle}
          </Text>
          <EmailInfoTable>
            <EmailInfoRow label="📅 Fecha"   value={date} />
            <EmailInfoRow label="🕐 Horario" value={`${startTime} – ${endTime} (${durationHours}h)`} />
            <EmailInfoRow label="👥 Personas" value={`${guestCount} persona${guestCount !== 1 ? "s" : ""}`} />
            <EmailInfoRow label="📍 Dirección" value={`${venueAddress}, ${venueCity}`} />
            <EmailInfoRow label="🔖 Referencia" value={bookingRef} />
          </EmailInfoTable>
        </Section>

        {/* Price breakdown */}
        <Text style={{ fontWeight: "600", fontSize: "14px", color: colors.text, marginBottom: "12px" }}>
          Desglose del pago
        </Text>
        <EmailInfoTable>
          <EmailInfoRow label="Subtotal"        value={subtotal} />
          {Number(cleaningFee.replace(/[^0-9,]/g, "").replace(",", ".")) > 0 && (
            <EmailInfoRow label="Tarifa de limpieza" value={cleaningFee} />
          )}
          <EmailInfoRow label="Tarifa de servicio" value={platformFee} />
          <tr>
            <td style={{ padding: "12px 0 0", fontWeight: "700", fontSize: "16px", color: colors.text }}>
              Total pagado
            </td>
            <td style={{ padding: "12px 0 0", fontWeight: "700", fontSize: "16px", color: colors.success, textAlign: "right" }}>
              {total}
            </td>
          </tr>
        </EmailInfoTable>

        <EmailButton href={`${appUrl}/tenant/bookings/${bookingId}`}>
          Ver mi reserva →
        </EmailButton>

        {receiptUrl && (
          <Text style={{ textAlign: "center", fontSize: "13px", color: colors.textMuted, margin: "8px 0 0" }}>
            <Link href={receiptUrl} style={{ color: colors.primary }}>
              Descargar comprobante de pago
            </Link>
          </Text>
        )}

        <EmailDivider />

        {/* Trust block */}
        <Section style={{ backgroundColor: colors.bg, borderRadius: "10px", padding: "16px 20px" }}>
          <Text style={{ color: colors.textMuted, fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
            🛡️ <strong>Pago seguro</strong> · Si tienes algún problema con tu reserva, contacta con nosotros en{" "}
            <Link href="mailto:hola@fiestalo.es" style={{ color: colors.primary }}>hola@fiestalo.es</Link>
          </Text>
        </Section>
      </EmailBody>
    </EmailLayout>
  );
}

export default BookingConfirmationEmail;
