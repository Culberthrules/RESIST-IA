import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESIST-IA — Antimicrobial Resistance Surveillance",
  description: "Laboratory-scoped antimicrobial resistance surveillance platform with AI-powered analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 text-surface-100 antialiased">
        {children}
      </body>
    </html>
  );
}
