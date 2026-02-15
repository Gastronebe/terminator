import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Domácí správa závazků",
  description: "Evidence aut, nemovitostí, předplatných a dokladů",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon.png',
    apple: '/icon.png', // Assuming icon.png is also good for apple touch icon for now, or use specific if available
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Domácnost",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
