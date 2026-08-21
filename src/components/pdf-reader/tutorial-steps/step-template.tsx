"use client";

import { Check } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import type { ReaderTemplateId } from "@/context/reader-settings-context";
import { TEMPLATE_CHOICES } from "./tutorial-constants";
import { cn } from "@/lib/utils";

interface StepTemplateProps {
  selectedTemplate: ReaderTemplateId;
  onSelectTemplate: (id: ReaderTemplateId) => void;
}

export function StepTemplate({
  selectedTemplate,
  onSelectTemplate,
}: StepTemplateProps) {
  return (
    <div className="space-y-4">
      <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
        Escolha o layout que melhor se adapta à sua rotina. Você poderá alternar entre eles a qualquer momento no leitor.
      </DialogDescription>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
        {TEMPLATE_CHOICES.map((t) => {
          const Icon = t.icon;
          const isSelected = selectedTemplate === t.id;
          return (
            <div
              key={t.id}
              data-cy={`template-option-${t.id}`}
              data-testid={`template-option-${t.id}`}
              onClick={() => onSelectTemplate(t.id)}
              className={cn(
                "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                isSelected
                  ? "border-accent bg-accent/5 shadow-md shadow-accent/10 ring-1 ring-accent"
                  : "border-border/70 bg-card/60 hover:border-border hover:bg-secondary/40"
              )}
            >
              <div className="space-y-2 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex size-8 sm:size-9 items-center justify-center rounded-xl transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      isSelected
                        ? "bg-accent/20 text-accent border-accent/40"
                        : "bg-secondary text-muted-foreground border-border/50"
                    )}
                  >
                    {t.badge}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                    {t.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-border/40">
                  {t.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <Check className="size-3 text-accent shrink-0" aria-hidden="true" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 sm:mt-4 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                <span className={isSelected ? "text-accent" : "text-muted-foreground"}>
                  {isSelected ? "Selecionado" : "Selecionar"}
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
