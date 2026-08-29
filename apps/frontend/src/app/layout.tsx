import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "MBG SPPG - Sistem Logistik & Keuangan Program Makan Bergizi Gratis",
  description: "Platform Enterprise Manajemen Logistik, FEFO Bahan Makanan, Perhitungan COGS Dinamis, dan Rekonsiliasi Keuangan SPPG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-brand-bg text-brand-dark selection:bg-brand-primary selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
