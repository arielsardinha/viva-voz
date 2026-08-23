import type { Metadata, Viewport } from "next";
import { Inter, Merriweather, Lora, Roboto, Literata } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import { GeminiApiKeyProvider } from "@/hooks/use-gemini-api-key";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-literata",
  display: "swap",
});

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
      className={`${inter.variable} ${merriweather.variable} ${lora.variable} ${roboto.variable} ${literata.variable}`}
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
            <Toaster />
          </GeminiApiKeyProvider>
        </ReaderSettingsProvider>
      </body>
    </html>
  );
}

