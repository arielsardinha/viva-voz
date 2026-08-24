import { GraduationCap, Briefcase, Sparkles, Target } from "lucide-react";

interface UseCaseItem {
  id: string;
  title: string;
  description: string;
  icon: typeof GraduationCap;
  badge: string;
  color: string;
}

const USE_CASES: UseCaseItem[] = [
  {
    id: "use-case-students",
    title: "Estudantes & Concurseiros",
    description:
      "Devore apostilas e legislações densas em menos tempo combinando reforço visual e auditivo.",
    icon: GraduationCap,
    badge: "Alta Retenção",
    color: "from-blue-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  {
    id: "use-case-professionals",
    title: "Pesquisadores & Profissionais",
    description:
      "Converta artigos e relatórios técnicos em áudio para absorver conhecimento enquanto se desloca.",
    icon: Briefcase,
    badge: "Produtividade",
    color: "from-cyan-500/20 to-teal-500/20 text-cyan-400 border-cyan-500/30",
  },
  {
    id: "use-case-accessibility",
    title: "Foco & Acessibilidade (TDAH e Dislexia)",
    description:
      "Reduza o cansaço visual e a dispersão mental com a condução palavra por palavra.",
    icon: Target,
    badge: "Acessibilidade",
    color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
  },
];

export function UseCasesSection() {
  return (
    <section
      id="casos-de-uso"
      aria-labelledby="use-cases-heading"
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Feito para o Seu Ritmo</span>
          </div>

          <h2
            id="use-cases-heading"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Casos de Uso & Público
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Descubra como o VivaVoz se adapta às suas necessidades de aprendizagem, trabalho e foco.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {USE_CASES.map((item) => {
            const IconComponent = item.icon;
            return (
              <article
                key={item.id}
                data-cy={`use-case-${item.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:border-accent/40 hover:bg-card/90 hover:-translate-y-1 shadow-md hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div
                      className={`flex size-11 items-center justify-center rounded-2xl border bg-gradient-to-br transition-transform group-hover:scale-110 ${item.color}`}
                    >
                      <IconComponent className="size-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1 mb-2.5 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
