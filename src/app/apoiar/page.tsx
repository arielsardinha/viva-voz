import type { Metadata } from "next";
import { SupportView } from "@/components/support/support-view";

export const metadata: Metadata = {
  title: "Apoie o VivaVoz — Contribuição Voluntária",
  description:
    "Contribua voluntariamente para o desenvolvimento e manutenção dos servidores do VivaVoz com Pix rápido e seguro.",
};

export default function ApoiarPage() {
  return <SupportView />;
}
