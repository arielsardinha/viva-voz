import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Leitor de PDF em áudio | Ouça seus documentos",
  description:
    "Envie um PDF, acompanhe a transcrição na tela e ouça o conteúdo narrado com controles de play, pause, voltar e avançar.",
  openGraph: {
    title: "Leitor de PDF em áudio",
    description:
      "Transcreva PDFs e ouça a narração com o trecho atual destacado na tela, em português.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased bg-background text-foreground transition-colors">
        <ReaderSettingsProvider>
          {children}
          <Toaster />
        </ReaderSettingsProvider>
      </body>
    </html>
  );
}

