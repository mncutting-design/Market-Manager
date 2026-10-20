import type { Metadata, Viewport } from "next";
import { Inter, Anek_Bangla } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const anekBangla = Anek_Bangla({
  variable: "--font-anek-bangla",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#101726" },
  ],
};

export const metadata: Metadata = {
  title: "Market Manager | মার্কেট ম্যানেজার",
  description: "Bilingual rental market, shops, tenant rent collection, dues, and maintenance expense management",
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
    <html
      lang="bn"
      className={`dark ${inter.variable} ${anekBangla.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#101726] text-slate-900 dark:text-white">
        <I18nProvider initialLocale="bn">
          {children}
          <Toaster richColors position="top-right" />
        </I18nProvider>
      </body>
    </html>
  );
}
