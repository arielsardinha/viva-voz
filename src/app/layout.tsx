import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { GeminiApiKeyProvider } from "@/hooks/use-gemini-api-key";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';
import Clarity from "@/components/clarity";
import { ROOT_FONT_VARIABLE_CLASSES } from "./fonts";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "VivaVoz — Leitor de Texto em Áudio & Narração Inteligente",
  applicationName: "VivaVoz",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VivaVoz",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  description:
    "Envie seus PDFs e documentos, acompanhe o texto em tempo real e ouça narrações fluidas com IA, velocidade ajustável e modos de leitura imersivos.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "VivaVoz — Leitor de Texto em Áudio",
    description:
      "Transcreva PDFs e documentos e ouça a narração com o trecho atual destacado na tela em português com IA.",
    type: "website",
    siteName: "VivaVoz",
  },
  twitter: {
    card: "summary_large_image",
    title: "VivaVoz — Leitor de Texto em Áudio",
  },
};

const themeInitScript = `
  try {
    var raw = localStorage.getItem('vivavoz-reader-settings');
    var theme = 'light';
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.theme) theme = parsed.theme;
    }
    document.documentElement.setAttribute('data-reading-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={ROOT_FONT_VARIABLE_CLASSES}
      suppressHydrationWarning
    >
      <body className="antialiased bg-background text-foreground transition-colors" suppressHydrationWarning>
        <script
          id="vivavoz-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />

        <ReaderSettingsProvider>
          <GeminiApiKeyProvider>
            <PwaRegister />
            {children}
            <Clarity />
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </GeminiApiKeyProvider>
        </ReaderSettingsProvider>
      </body>
    </html>
  );
}

