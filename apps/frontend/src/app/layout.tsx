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
    <html lang="id" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
