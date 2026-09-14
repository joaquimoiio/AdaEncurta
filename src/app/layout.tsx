import type { Metadata, Viewport } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ADA Encurta", template: "%s · ADA Encurta" },
  description: "Encurtador de links da ADA Nutracêuticos com rastreamento, campanhas e relatórios.",
  icons: { icon: "/brand/favicon.png", apple: "/brand/ada-mark.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ed6931",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
