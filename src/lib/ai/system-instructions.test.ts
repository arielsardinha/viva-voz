import {
  SYSTEM_INSTRUCTION_PT_BR,
  buildDocumentSystemPrompt,
} from "./system-instructions";

describe("system-instructions (pt-BR)", () => {
  it("deve conter regras fundamentais em Português do Brasil", () => {
    expect(SYSTEM_INSTRUCTION_PT_BR).toContain("Português do Brasil (pt-BR)");
    expect(SYSTEM_INSTRUCTION_PT_BR).toContain("FIDELIDADE AO CONTEXTO");
    expect(SYSTEM_INSTRUCTION_PT_BR).toContain("FORMATAÇÃO ESCANEÁVEL");
    expect(SYSTEM_INSTRUCTION_PT_BR).toContain("VivaVoz");
  });

  it("deve montar prompt de sistema com nome do documento e contexto", () => {
    const prompt = buildDocumentSystemPrompt({
      fileName: "apostila_estudos.pdf",
      context: "Capítulo 1: Introdução à Inteligência Artificial.",
    });

    expect(prompt).toContain('Documento atual em análise: "apostila_estudos.pdf"');
    expect(prompt).toContain("Capítulo 1: Introdução à Inteligência Artificial.");
    expect(prompt).toContain(SYSTEM_INSTRUCTION_PT_BR);
  });

  it("deve truncar contexto quando exceder maxContextChars", () => {
    const longText = "A".repeat(500);
    const prompt = buildDocumentSystemPrompt({
      context: longText,
      maxContextChars: 100,
    });

    expect(prompt).toContain("...[conteúdo restante omitido para respeitar o limite de contexto]");
    expect(prompt.length).toBeLessThan(longText.length + SYSTEM_INSTRUCTION_PT_BR.length);
  });

  it("deve lidar com contexto vazio ou nulo graciosamente", () => {
    const prompt = buildDocumentSystemPrompt({
      context: "",
      fileName: null,
    });

    expect(prompt).toContain("(Nenhum texto extraído no momento)");
    expect(prompt).not.toContain("Documento atual em análise");
  });
});
