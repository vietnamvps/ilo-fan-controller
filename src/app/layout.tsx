declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}

import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HPE DL380 Gen9 - iLO 4 Fan Controller & Thermal Monitor",
  description: "Trình quản trị và điều khiển quạt chuyên nghiệp cho máy chủ HP ProLiant DL380 Gen9 với iLO 4 Patched Firmware",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="antialiased min-h-screen bg-[#080c14] text-gray-100">
        {children}
      </body>
    </html>
  );
}
