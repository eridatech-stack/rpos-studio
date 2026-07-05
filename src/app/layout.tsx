import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RPOS Studio",
  description: "AI-assisted publishing operating system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
