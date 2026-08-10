import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tsugi",
  description: "Share an anime or manga recommendation in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
