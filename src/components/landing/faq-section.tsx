import { HelpCircle, ChevronDown } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-mobile",
    question: "O Viva-Voz funciona no celular?",
    answer:
      "Sim! O Viva-Voz foi desenvolvido com arquitetura PWA (Progressive Web App) e design Mobile-First rigorosamente adaptado para qualquer tela a partir de 370px. Você pode usá-lo diretamente no navegador móvel (Chrome, Safari, Firefox) ou instalá-lo como aplicativo nativo na tela inicial, contando com suporte à Web Media Session API para controlar o áudio pela tela de bloqueio e fones de ouvido.",
  },
  {
    id: "faq-security",
    question: "Meus arquivos ficam seguros?",
    answer:
      "Absolutamente. A extração e o processamento de texto de PDFs, EPUBs e documentos operam de forma 100% Client-Side no seu próprio navegador, sem envio de conteúdo para servidores de terceiros. Os dados locais são salvos no IndexedDB do dispositivo e o backup na nuvem é armazenado exclusivamente na pasta restrita appDataFolder do seu próprio Google Drive, protegida pela infraestrutura de segurança do Google e cookies seguros HttpOnly.",
  },
  {
    id: "faq-gemini",
    question: "O que a IA Gemini faz durante a leitura?",
    answer:
      "O assistente atua como um tutor acadêmico em tempo real integrado à interface. Ao selecionar qualquer trecho ou capítulo, a IA analisa o contexto do documento para gerar sínteses estruturadas, desmistificar termos complexos, responder a dúvidas pontuais, sugerir perguntas de fixação e traduzir conteúdos, permitindo um aprendizado profundo e contínuo sem que você precise alternar de tela.",
  },
  {
    id: "faq-pricing",
    question: "Preciso pagar para testar?",
    answer:
      "Não. O Viva-Voz é uma plataforma de código aberto e 100% gratuita para uso direto no navegador, sem cadastro, mensalidades ou necessidade de cartão de crédito. Para narrações neurais ultra-realistas e recursos avançados de IA, utilizamos a arquitetura BYOK (Bring Your Own Key), permitindo que você conecte sua própria chave de API gratuita do Google Gemini para uso direto e sem intermediários.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative py-16 sm:py-24 overflow-hidden border-t border-border/60"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            <span>Tire Suas Dúvidas</span>
          </div>

          <h2
            id="faq-heading"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Perguntas Frequentes (FAQ)
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Respostas diretas e transparentes sobre privacidade, compatibilidade e recursos da plataforma.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.id}
              data-cy={`faq-item-${item.id}`}
              className="group rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-xl transition-all duration-200 hover:border-accent/40 open:border-accent/50 open:bg-card/90"
            >
              <summary className="flex cursor-pointer items-center justify-between font-bold text-foreground text-sm sm:text-base select-none list-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2.5">
                  {item.question}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-hover:text-foreground" />
              </summary>
              <div className="mt-3.5 pt-3 border-t border-border/60 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <p className="flex items-start gap-2">
                  {item.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
