import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
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
        width: 1200,
        height: 630,
        alt: "Archon Student Support Desk Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
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
      className={`${outfit.variable} ${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
