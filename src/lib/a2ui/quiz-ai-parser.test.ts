import type { Sentence } from "@/lib/pdf-text";
import {
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  extractJsonObject,
  parseAndNormalizeAiQuizQuestions,
} from "./quiz-ai-parser";

const SAMPLE_SENTENCES: Sentence[] = [
  {
    index: 0,
    page: 1,
    text: "A arquitetura orientada a eventos desacopla produtores e consumidores de mensagens.",
  },
  {
    index: 1,
    page: 2,
    text: "O uso de filas persistentes evita perda de dados em picos de tráfego.",
  },
  {
    index: 2,
    page: 3,
    text: "A idempotência garante que o reprocessamento não gere efeitos colaterais duplicados.",
  },
];

describe("quiz-ai-parser", () => {
  it("monta prompts de sistema e usuário em pt-BR refletindo dificuldade, orçamento e cobertura", () => {
    const sysNormal = buildQuizSystemPrompt("normal");
    const sysHard = buildQuizSystemPrompt("hard");
    expect(sysNormal).toContain("Português do Brasil");
    expect(sysHard).toContain("inferência");

    const userPrompt = buildQuizUserPrompt({
      title: "Sistemas Distribuídos",
      questionCount: 6,
      difficulty: "hard",
      formattedContext: "[¶1 p.1] Texto de exemplo.",
      wasBudgetLimited: true,
      coveragePercent: 42,
    });

    expect(userPrompt).toContain("Sistemas Distribuídos");
    expect(userPrompt).toContain("6");
    expect(userPrompt).toContain("42%");
    expect(userPrompt).toContain("[¶1 p.1]");
  });

  it("extrai objeto JSON de texto puro ou envolvido em markdown fences", () => {
    const wrapped =
      "Aqui está o quiz solicitado:\n```json\n{\"questions\": [{\"prompt\": \"Pergunta?\"}]}\n```\nBons estudos!";
    const extracted = extractJsonObject(wrapped);
    expect(extracted).toBe('{"questions": [{"prompt": "Pergunta?"}]}');
    expect(extractJsonObject("texto sem json")).toBeNull();
  });

  it("parseia JSON válido com 4 alternativas, resolve sentenceIndex real e aplica XP do modo", () => {
    const raw = JSON.stringify({
      questions: [
        {
          topic: "Desacoplamento",
          sentenceIndex: 0,
          prompt: "Qual é o principal benefício da arquitetura orientada a eventos?",
          evidenceQuote: "desacopla produtores e consumidores",
          explanation: "O texto na pág. 1 destaca o desacoplamento entre produtores e consumidores.",
          hint: "Veja o primeiro parágrafo da página 1.",
          options: [
            { id: "A", label: "Eliminar a necessidade de rede.", isCorrect: false },
            { id: "B", label: "Desacoplar produtores e consumidores.", isCorrect: true },
            { id: "C", label: "Substituir bancos relacionais.", isCorrect: false },
            { id: "D", label: "Aumentar acoplamento síncrono.", isCorrect: false },
          ],
        },
        {
          topic: "Resiliência",
          sentenceIndex: 1,
          prompt: "Por que utilizar filas persistentes segundo o material?",
          evidenceQuote: "evita perda de dados em picos de tráfego",
          explanation: "Na pág. 2, filas persistentes protegem dados durante picos.",
          hint: "Observe o segundo trecho.",
          options: [
            { id: "A", label: "Evitar perda de dados em picos.", isCorrect: true },
            { id: "B", label: "Reduzir segurança TLS.", isCorrect: false },
            { id: "C", label: "Apagar logs antigos.", isCorrect: false },
            { id: "D", label: "Desativar cache.", isCorrect: false },
          ],
        },
      ],
    });

    const questions = parseAndNormalizeAiQuizQuestions(raw, SAMPLE_SENTENCES, {
      maxQuestions: 5,
      difficulty: "hard",
    });

    expect(questions).toHaveLength(2);
    expect(questions[0].id).toBe("q-1");
    expect(questions[0].xpReward).toBe(90);
    expect(questions[0].paragraphRef).toBe(1);
    expect(questions[0].page).toBe(1);
    expect(questions[0].options.map((o) => o.id)).toEqual(["A", "B", "C", "D"]);
    expect(questions[1].paragraphRef).toBe(2);
    expect(questions[1].page).toBe(2);
  });

  it("corrige sentenceIndex fora de faixa casando evidenceQuote e balanceia letras repetidas", () => {
    const raw = `\`\`\`json
    {
      "questions": [
        {
          "topic": "Idempotência",
          "sentenceIndex": 999,
          "prompt": "O que a idempotência garante no reprocessamento?",
          "evidenceQuote": "reprocessamento não gere efeitos colaterais duplicados",
          "options": [
            { "label": "Evita efeitos colaterais duplicados.", "isCorrect": true },
            { "label": "Duplica mensagens propositalmente.", "isCorrect": false },
            { "label": "Bloqueia consumidores.", "isCorrect": false },
            { "label": "Remove cabeçalhos HTTP.", "isCorrect": false }
          ]
        },
        {
          "topic": "Filas",
          "sentenceIndex": 1,
          "prompt": "Qual papel das filas persistentes no sistema?",
          "evidenceQuote": "evita perda de dados",
          "options": [
            { "label": "Proteger dados em picos.", "isCorrect": true },
            { "label": "Gerar latência infinita.", "isCorrect": false },
            { "label": "Descartar pacotes.", "isCorrect": false },
            { "label": "Ignorar falhas.", "isCorrect": false }
          ]
        }
      ]
    }
    \`\`\``;

    const questions = parseAndNormalizeAiQuizQuestions(raw, SAMPLE_SENTENCES, {
      maxQuestions: 4,
      difficulty: "normal",
    });

    expect(questions).toHaveLength(2);
    // Encontrou a sentença index=2 pela citação
    expect(questions[0].sentenceIndex).toBe(2);
    expect(questions[0].paragraphRef).toBe(3);
    expect(questions[0].page).toBe(3);
    // Ambas vieram com correta em A -> balanceou para não concentrar tudo em A
    const correctIds = questions.map((q) => q.options.find((o) => o.isCorrect)?.id);
    expect(new Set(correctIds).size).toBeGreaterThan(1);
  });

  it("rejeita JSON corrompido ou payload sem nenhuma questão com alternativa única correta", () => {
    expect(() =>
      parseAndNormalizeAiQuizQuestions("{invalido", SAMPLE_SENTENCES, {
        maxQuestions: 3,
        difficulty: "normal",
      }),
    ).toThrow();

    const invalidCorrectCount = JSON.stringify({
      questions: [
        {
          prompt: "Pergunta sem alternativa correta marcada?",
          options: [
            { label: "Opção 1", isCorrect: false },
            { label: "Opção 2", isCorrect: false },
            { label: "Opção 3", isCorrect: false },
          ],
        },
      ],
    });

    expect(() =>
      parseAndNormalizeAiQuizQuestions(invalidCorrectCount, SAMPLE_SENTENCES, {
        maxQuestions: 3,
        difficulty: "normal",
      }),
    ).toThrow("Nenhuma questão válida retornada pela IA.");
  });

  it("aproveita as questões completas de um JSON truncado pelo teto de tokens", () => {
    const q = (n: number) => ({
      topic: `Tema ${n}`,
      sentenceIndex: 0,
      prompt: `Pergunta numero ${n} sobre o texto?`,
      options: [
        { label: `Certa ${n}`, isCorrect: true },
        { label: `Errada A ${n}`, isCorrect: false },
        { label: `Errada B ${n}`, isCorrect: false },
        { label: `Errada C ${n}`, isCorrect: false },
      ],
    });
    const full = JSON.stringify({ questions: [q(1), q(2), q(3)] });
    // Corta no meio da terceira questão, como o Gemma local faz ao bater 1024 tokens.
    const truncated = full.slice(0, full.indexOf('"Pergunta numero 3') + 10);

    const questions = parseAndNormalizeAiQuizQuestions(truncated, SAMPLE_SENTENCES, {
      maxQuestions: 3,
      difficulty: "normal",
    });
    expect(questions.map((item) => item.topic)).toEqual(["Tema 1", "Tema 2"]);
  });

  it("descarta só a questão fora do schema, mantendo as demais", () => {
    const payload = JSON.stringify({
      questions: [
        { prompt: "curta", options: [] },
        {
          prompt: "Qual ideia central aparece no trecho?",
          options: [
            { label: "Ideia certa", isCorrect: true },
            { label: "Ideia errada 1", isCorrect: false },
            { label: "Ideia errada 2", isCorrect: false },
          ],
        },
      ],
    });
    const questions = parseAndNormalizeAiQuizQuestions(payload, SAMPLE_SENTENCES, {
      maxQuestions: 3,
      difficulty: "normal",
    });
    expect(questions).toHaveLength(1);
  });
});
