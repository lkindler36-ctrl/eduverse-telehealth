import type { Metadata } from "next";
import { AppSessionProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduVerse TeleHealth",
  description:
    "Visit documentation for Von & Bick Healthcare Associates remote clinical staff. Zoom Healthcare is video only — the chart lives here.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#1f4a46" />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
