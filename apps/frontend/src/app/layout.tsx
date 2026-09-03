import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

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
    <html lang="id" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased min-h-screen bg-brand-bg text-brand-dark selection:bg-brand-primary selection:text-white font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
