import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dance Queue",
  description: "StepMania song queue management service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
