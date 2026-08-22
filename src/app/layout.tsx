import type { Metadata, Viewport } from "next";
import "./globals.css";
import Teaser from "@/components/Teaser";

export const metadata: Metadata = {
  title: "Wiki Kho Vận MIAvn",
  description: "Wiki nội bộ cho bộ phận kho MIA",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Teaser />
        {children}
      </body>
    </html>
  );
}
