import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-custom",
  subsets: ["latin"],
  weight: ["400"],
});

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D9488",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://archon.axonenjin.com"),
  title: "Archon Student Desk",
  description: "Archon is an autonomous, agentic AI service desk resolving student inquiries across university departments (Registrar, Bursar, Financial Aid) instantly.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Archon",
  },
  openGraph: {
    type: "website",
    siteName: "Archon",
    title: "Archon Student Desk — Agentic AI Service Desk",
    description: "Resolve registrar holds, check tuition balances, and sync academic deadlines instantly.",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "Archon Student Support Desk Banner",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Archon Student Desk",
    description: "Autonomous, agentic AI service desk for higher education.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
