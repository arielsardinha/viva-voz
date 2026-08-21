"use client";

import { Check } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import type { ReadingTheme } from "@/context/reader-settings-context";
import { THEME_CHOICES } from "./tutorial-constants";
import { cn } from "@/lib/utils";

interface StepThemeProps {
  selectedTheme: ReadingTheme;
  onSelectTheme: (theme: ReadingTheme) => void;
}

export function StepTheme({ selectedTheme, onSelectTheme }: StepThemeProps) {
  return (
    <div className="space-y-4">
      <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
        Escolha o esquema de cores para sua leitura. O tema será aplicado na hora para você testar.
      </DialogDescription>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
        {THEME_CHOICES.map((th) => {
          const Icon = th.icon;
          const isSelected = selectedTheme === th.id;
          return (
            <div
              key={th.id}
              data-cy={`theme-option-${th.id}`}
              data-testid={`theme-option-${th.id}`}
              onClick={() => onSelectTheme(th.id)}
              className={cn(
                "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                isSelected
                  ? "border-accent bg-accent/5 shadow-md ring-1 ring-accent"
                  : "border-border/70 bg-card/60 hover:border-border hover:bg-secondary/40"
              )}
            >
              <div className="space-y-2.5 sm:space-y-3">
                {/* Mini preview visual do tema */}
                <div
                  className={cn(
                    "h-16 sm:h-20 w-full rounded-xl border p-2.5 flex flex-col justify-between shadow-xs transition-transform group-hover:scale-[1.02]",
                    th.bgPreview
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="size-4 text-accent" aria-hidden="true" />
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-accent/60" />
                      <span className="size-1.5 rounded-full bg-accent/40" />
                    </div>
                  </div>
                  <div className={cn("text-[11px] font-semibold", th.textPreview)}>
                    Exemplo de texto do leitor...
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{th.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
                    {th.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                <span className={isSelected ? "text-accent" : "text-muted-foreground"}>
                  {isSelected ? "Ativo agora" : "Escolher"}
                </span>
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center transition-colors",
                    isSelected
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border"
                  )}
                >
                  {isSelected && <Check className="size-2.5 stroke-[3]" aria-hidden="true" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
