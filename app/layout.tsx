import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StepMania Server",
  description: "StepMania song queue management service",
  icons: {
    icon: "/step-arrow.svg",
  },
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
