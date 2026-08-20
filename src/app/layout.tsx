import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
