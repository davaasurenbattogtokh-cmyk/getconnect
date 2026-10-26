import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://getconnect.business"),
  title: "GET CONNECTED EXPO 2026 — Better Connections. Bigger Opportunities.",
  description: "2026.11.20–22 · Мишээл Экспо. 102 Бизнес · 1 Сүлжээ · Төгс Түншлэл. Талбайгаа сонгож, бизнесийн шинэ боломжтой холбогдоорой.",
  openGraph: {
    title: "GET CONNECTED EXPO 2026 · BNI NEXUS",
    description: "2026.11.20–22 · Мишээл Экспо · 102 Бизнес · 1 Сүлжээ · Төгс Түншлэл.",
    siteName: "GET CONNECTED EXPO",
    locale: "mn_MN",
    type: "website",
    images: [{url: "/assets/hero-exterior.webp", alt: "GET CONNECTED EXPO 2026"}],
  },
  icons: {
    icon: "/assets/mark.webp",
    shortcut: "/assets/mark.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body className="antialiased">{children}</body>
    </html>
  );
}
