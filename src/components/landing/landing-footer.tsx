import Link from "next/link";
import { AudioLines, Github, Heart, Shield, Sparkles, Bot, FileCode } from "lucide-react";
import { GithubIcon } from "@/components/ui/github-icon";

export function LandingFooter() {
  return (
    <footer
      role="contentinfo"
      aria-label="Rodapé institucional"
      className="border-t border-border/80 bg-secondary/30 backdrop-blur-md pt-12 pb-8 sm:pt-16 sm:pb-12 text-muted-foreground text-xs"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Coluna 1: Branding & Missão */}
          <div className="space-y-3 sm:col-span-2">
            <Link
              href="/"
              aria-label="VivaVoz - Início"
              className="flex items-center gap-2 group w-fit"
            >
              <div className="flex size-8 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm shadow-accent/20">
                <AudioLines className="size-4" aria-hidden="true" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-foreground">
                VivaVoz
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Plataforma aberta de alta performance para leitura imersiva por áudio neural, sincronismo
              de sentenças e assistência contextual com IA.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span className="flex size-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground/80">
                100% Client-Side & BYOK Seguro
              </span>
            </div>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Navegação
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#hero" className="hover:text-foreground transition-colors">
                  Início (Hero)
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Recursos & Bento Grid
                </Link>
              </li>
              <li>
                <Link href="/leitor" className="hover:text-foreground transition-colors">
                  Leitor de Documentos
                </Link>
              </li>
              <li>
                <Link href="/leituras" className="hover:text-foreground transition-colors">
                  Biblioteca Local
                </Link>
              </li>
              <li>
                <Link href="/apoiar" className="hover:text-rose-400 transition-colors">
                  Apoio Voluntário (Pix)
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Agentes de IA & WebMCP */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Agent-Ready & Docs
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/llms.txt"
                  target="_blank"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  <FileCode className="size-3 text-accent" />
                  <span>/llms.txt</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/llms-full.txt"
                  target="_blank"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  <Bot className="size-3 text-indigo-400" />
                  <span>/llms-full.txt</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior com Direitos e Safe-Area */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <p>© {new Date().getFullYear()} VivaVoz. Software Livre & Código Aberto.</p>
          <p className="text-muted-foreground flex items-center gap-1">
            <span>Desenvolvido com</span>
            <Heart className="size-3 fill-rose-500 text-rose-500" aria-hidden="true" />
            <span>para acessibilidade e foco.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
