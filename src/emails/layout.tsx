import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";

// ── Brand tokens ──────────────────────────────────────────────────

export const colors = {
  primary:    "#ea6a00",
  primaryDark:"#c2570a",
  success:    "#059669",
  warning:    "#d97706",
  danger:     "#dc2626",
  text:       "#111827",
  textMuted:  "#6b7280",
  border:     "#e5e7eb",
  bg:         "#f9fafb",
  white:      "#ffffff",
  card:       "#ffffff",
};

export const font = {
  family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size:   { sm: "13px", base: "15px", lg: "18px", xl: "24px", "2xl": "30px" },
  weight: { normal: "400", medium: "500", semibold: "600", bold: "700" },
};

// ── Shared components ─────────────────────────────────────────────

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font.family, margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "580px", margin: "0 auto", padding: "40px 20px" }}>

          {/* Logo header */}
          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tr>
                <td align="center">
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      backgroundColor: colors.primary,
                      borderRadius: "10px",
                      display: "inline-block",
                      textAlign: "center",
                      lineHeight: "36px",
                      fontSize: "18px",
                    }}>🎉</div>
                    <span style={{
                      fontSize: "22px",
                      fontWeight: font.weight.bold,
                      color: colors.text,
                      verticalAlign: "middle",
                    }}>Fiestalo</span>
                  </div>
                </td>
              </tr>
            </table>
          </Section>

          {/* Card */}
          <Section style={{
            backgroundColor: colors.card,
            borderRadius: "16px",
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: "center", marginTop: "32px" }}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, margin: "0 0 8px" }}>
              Fiestalo · El marketplace de salas de fiestas en España
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, margin: 0 }}>
              <Link href="https://fiestalo.es/terms" style={{ color: colors.textMuted }}>Términos</Link>
              {" · "}
              <Link href="https://fiestalo.es/privacy" style={{ color: colors.textMuted }}>Privacidad</Link>
              {" · "}
              <Link href="https://fiestalo.es" style={{ color: colors.textMuted }}>fiestalo.es</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ── Reusable building blocks ──────────────────────────────────────

export function EmailHero({
  title,
  subtitle,
  color = colors.primary,
}: {
  title: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <Section style={{ backgroundColor: color, padding: "36px 40px 28px", textAlign: "center" }}>
      <Text style={{
        color: colors.white,
        fontSize: font.size["2xl"],
        fontWeight: font.weight.bold,
        margin: "0 0 8px",
        lineHeight: "1.2",
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: font.size.base, margin: 0 }}>
          {subtitle}
        </Text>
      )}
    </Section>
  );
}

export function EmailBody({ children }: { children: React.ReactNode }) {
  return (
    <Section style={{ padding: "32px 40px" }}>
      {children}
    </Section>
  );
}

export function EmailButton({ href, children, color = colors.primary }: {
  href: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
      <Link
        href={href}
        style={{
          backgroundColor: color,
          color: colors.white,
          padding: "14px 32px",
          borderRadius: "10px",
          fontSize: font.size.base,
          fontWeight: font.weight.semibold,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function EmailInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{
        padding: "10px 0",
        borderBottom: `1px solid ${colors.border}`,
        color: colors.textMuted,
        fontSize: font.size.sm,
        width: "40%",
        verticalAlign: "top",
      }}>
        {label}
      </td>
      <td style={{
        padding: "10px 0",
        borderBottom: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: font.size.sm,
        fontWeight: font.weight.medium,
        textAlign: "right",
        verticalAlign: "top",
      }}>
        {value}
      </td>
    </tr>
  );
}

export function EmailInfoTable({ children }: { children: React.ReactNode }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: "24px" }}>
      <tbody>{children}</tbody>
    </table>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: colors.border, margin: "24px 0" }} />;
}

export function EmailText({ children, muted = false, size = "base" }: {
  children: React.ReactNode;
  muted?: boolean;
  size?: "sm" | "base" | "lg";
}) {
  return (
    <Text style={{
      color: muted ? colors.textMuted : colors.text,
      fontSize: font.size[size],
      margin: "0 0 16px",
      lineHeight: "1.6",
    }}>
      {children}
    </Text>
  );
}

export function EmailBadge({ children, color = colors.primary }: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span style={{
      backgroundColor: `${color}15`,
      color,
      border: `1px solid ${color}30`,
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: font.size.sm,
      fontWeight: font.weight.medium,
    }}>
      {children}
    </span>
  );
}
