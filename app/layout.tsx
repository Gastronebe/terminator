import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { Poppins, Montserrat } from 'next/font/google';
import Sidebar from "@/components/Sidebar";
import BottomNavigation from "@/components/BottomNavigation";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins'
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-montserrat'
});

export const metadata: Metadata = {
  title: "Terminátor3000",
  description: "Evidence aut, nemovitostí, předplatných a dokladů",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Terminátor3000",
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
    <html lang="cs" className={`${poppins.variable} ${montserrat.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <AuthGuard>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <main style={{ flex: 1, paddingBottom: 100 }}> {/* Padding for BottomNav on mobile */}
                  {children}
                </main>
                <div className="md:hidden"> {/* Hide BottomNav on desktop */}
                  <BottomNavigation />
                </div>
              </div>
            </div>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
