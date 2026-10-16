import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { ServiceWorker } from "@/components/pwa/service-worker";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Casa", template: "%s · Casa" },
  description: "Finanças e tarefas da casa, em um lugar só.",
  applicationName: "Casa",
  appleWebApp: { capable: true, title: "Casa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#101826" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${onest.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NuqsAdapter>
            <TooltipProvider>{children}</TooltipProvider>
          </NuqsAdapter>
          <Toaster position="top-center" />
        </ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
