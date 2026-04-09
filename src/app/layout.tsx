import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/shared/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://fiestalo.es'),
  title: {
    default: "Fiestalo – Salas de fiestas para celebrar",
    template: "%s | Fiestalo",
  },
  description:
    "Encuentra y reserva espacios únicos para eventos, reuniones, fotografía, música y mucho más. El marketplace de salas de fiestas más completo.",
  keywords: ["salas de fiestas infantiles", "alquiler sala fiestas", "cumpleaños infantil", "salón celebraciones", "fiestas temáticas"],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Fiestalo – Salas de fiestas",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
