/**
 * @file tts-engines.test.ts
 * @description Testes unitários para o sistema determinístico de seleção de voz PT-BR.
 * Cobre todos os 5 tiers de prioridade, normalização de strings, e comportamento
 * do fallback em cenários extremos.
 */

import {
  getVoiceTier,
  selectBestPtBrVoice,
  listSystemVoices,
  VOICE_TIER,
} from "./tts-engines";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVoice(
  overrides: Partial<SpeechSynthesisVoice> & { name: string; lang: string }
): SpeechSynthesisVoice {
  return {
    voiceURI: overrides.voiceURI ?? `uri:${overrides.name}`,
    localService: false,
    default: false,
    ...overrides,
  } as unknown as SpeechSynthesisVoice;
}

// ---------------------------------------------------------------------------
// getVoiceTier
// ---------------------------------------------------------------------------

describe("getVoiceTier", () => {
  // Tier 1 — PT-BR Neural/Natural sem Multilingual
  describe("Tier 1 — PT-BR Neural/Natural (sem Multilingual)", () => {
    it("deve retornar Tier 1 para 'Microsoft Antonio Online (Natural) - Portuguese (Brazil)'", () => {
      const voice = makeVoice({
        name: "Microsoft Antonio Online (Natural) - Portuguese (Brazil)",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL);
    });

    it("deve retornar Tier 1 para 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)'", () => {
      const voice = makeVoice({
        name: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL);
    });

    it("deve retornar Tier 1 para voz com tag 'Neural' no nome", () => {
      const voice = makeVoice({
        name: "Some Neural Voice - Portuguese (Brazil)",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL);
    });

    it("deve retornar Tier 1 com lang pt_BR (underscore) e nome Natural", () => {
      const voice = makeVoice({
        name: "Antonio Online (Natural) - Portuguese (Brazil)",
        lang: "pt_BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL);
    });

    it("deve retornar Tier 1 com lang em lowercase pt-br", () => {
      const voice = makeVoice({
        name: "Francisca Natural PT-BR",
        lang: "pt-br",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL);
    });

    it("deve retornar Tier 1 com marcador NATURAL em maiúsculas (case-insensitive)", () => {
      const voice = makeVoice({
        name: "Microsoft Antonio NATURAL Portuguese Brazil",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL);
    });
  });

  // Tier 2 — PT-BR Neural/Natural com Multilingual
  describe("Tier 2 — PT-BR Neural/Natural + Multilingual", () => {
    it("deve retornar Tier 2 para 'Microsoft ThalitaMultilingual Online (Natural) - Portuguese (Brazil)'", () => {
      const voice = makeVoice({
        name: "Microsoft ThalitaMultilingual Online (Natural) - Portuguese (Brazil)",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL_MULTI);
    });

    it("deve retornar Tier 2 para voz Natural + Multilingual com lang pt-BR", () => {
      const voice = makeVoice({
        name: "Some Multilingual Natural Brazilian Voice",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL_MULTI);
    });

    it("deve retornar Tier 2 para voz Neural + Multilingual", () => {
      const voice = makeVoice({
        name: "NeuralMultilingual Voice Brazil",
        lang: "pt-BR",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_NEURAL_MULTI);
    });
  });

  // Tier 3 — PT-BR Convencional
  describe("Tier 3 — PT-BR convencional (sistema/browser)", () => {
    it("deve retornar Tier 3 para 'Luciana (pt-BR)'", () => {
      const voice = makeVoice({ name: "Luciana", lang: "pt-BR" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_CONVENTIONAL);
    });

    it("deve retornar Tier 3 para 'Google português do Brasil' com lang pt-BR", () => {
      const voice = makeVoice({ name: "Google português do Brasil", lang: "pt-BR" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_CONVENTIONAL);
    });

    it("deve retornar Tier 3 para voz com lang pt-BR sem marcadores neural/natural", () => {
      const voice = makeVoice({ name: "Daniel", lang: "pt-BR" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_CONVENTIONAL);
    });

    it("deve retornar Tier 3 para voz cujo nome menciona Brazil (mesmo sem lang pt-BR)", () => {
      const voice = makeVoice({
        name: "Some Voice - Portuguese (Brazil)",
        lang: "en-US",
      });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_CONVENTIONAL);
    });

    it("deve retornar Tier 3 para voz com 'brasil' no nome (lowercase)", () => {
      const voice = makeVoice({ name: "Voz brasil sistema", lang: "pt-PT" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_BR_CONVENTIONAL);
    });
  });

  // Tier 4 — Português Genérico (qualquer variante pt-*)
  describe("Tier 4 — Português genérico (pt-PT, pt-BR genérico, etc.)", () => {
    it("deve retornar Tier 4 para voz com lang pt-PT", () => {
      const voice = makeVoice({ name: "Joana", lang: "pt-PT" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_GENERIC);
    });

    it("deve retornar Tier 4 para voz com lang pt (sem subtag)", () => {
      const voice = makeVoice({ name: "PortugueseVoice", lang: "pt" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_GENERIC);
    });

    it("deve retornar Tier 4 para voz com lang PT-PT em uppercase (case-insensitive)", () => {
      const voice = makeVoice({ name: "VoiceAny", lang: "PT-PT" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.PT_GENERIC);
    });
  });

  // Tier 5 — Fallback do sistema
  describe("Tier 5 — Fallback do sistema (nenhuma voz PT)", () => {
    it("deve retornar Tier 5 para voz em inglês", () => {
      const voice = makeVoice({ name: "David", lang: "en-US" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.SYSTEM_FALLBACK);
    });

    it("deve retornar Tier 5 para voz em espanhol", () => {
      const voice = makeVoice({ name: "Helena", lang: "es-ES" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.SYSTEM_FALLBACK);
    });

    it("deve retornar Tier 5 para voz em francês", () => {
      const voice = makeVoice({ name: "Thomas", lang: "fr-FR" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.SYSTEM_FALLBACK);
    });

    it("deve retornar Tier 5 para voz com lang vazio", () => {
      const voice = makeVoice({ name: "Unknown", lang: "" });
      expect(getVoiceTier(voice)).toBe(VOICE_TIER.SYSTEM_FALLBACK);
    });
  });
});

// ---------------------------------------------------------------------------
// selectBestPtBrVoice
// ---------------------------------------------------------------------------

describe("selectBestPtBrVoice", () => {
  it("deve retornar string vazia para array vazio", () => {
    expect(selectBestPtBrVoice([])).toBe("");
  });

  it("deve selecionar Tier 1 quando disponível entre múltiplas vozes", () => {
    const tier1 = makeVoice({
      name: "Microsoft Antonio Online (Natural) - Portuguese (Brazil)",
      lang: "pt-BR",
      voiceURI: "uri:antonio-natural",
    });
    const tier3 = makeVoice({ name: "Luciana", lang: "pt-BR", voiceURI: "uri:luciana" });
    const tier5 = makeVoice({ name: "David", lang: "en-US", voiceURI: "uri:david" });

    expect(selectBestPtBrVoice([tier5, tier3, tier1])).toBe("uri:antonio-natural");
  });

  it("deve selecionar Tier 2 quando não há Tier 1 disponível", () => {
    const tier2 = makeVoice({
      name: "Microsoft ThalitaMultilingual Online (Natural) - Portuguese (Brazil)",
      lang: "pt-BR",
      voiceURI: "uri:thalita-multi",
    });
    const tier3 = makeVoice({ name: "Luciana", lang: "pt-BR", voiceURI: "uri:luciana" });

    expect(selectBestPtBrVoice([tier3, tier2])).toBe("uri:thalita-multi");
  });

  it("deve selecionar Tier 3 quando não há Tier 1 nem Tier 2", () => {
    const tier3 = makeVoice({
      name: "Google português do Brasil",
      lang: "pt-BR",
      voiceURI: "uri:google-pt-br",
    });
    const tier4 = makeVoice({ name: "Joana", lang: "pt-PT", voiceURI: "uri:joana" });

    expect(selectBestPtBrVoice([tier4, tier3])).toBe("uri:google-pt-br");
  });

  it("deve selecionar Tier 4 quando não há vozes PT-BR explícitas", () => {
    const tier4 = makeVoice({ name: "Joana", lang: "pt-PT", voiceURI: "uri:joana" });
    const tier5 = makeVoice({ name: "David", lang: "en-US", voiceURI: "uri:david" });

    expect(selectBestPtBrVoice([tier5, tier4])).toBe("uri:joana");
  });

  it("deve selecionar a voz `default` do sistema no Tier 5 quando nenhuma PT existe", () => {
    const nonDefault = makeVoice({
      name: "Alice",
      lang: "en-US",
      default: false,
      voiceURI: "uri:alice",
    });
    const systemDefault = makeVoice({
      name: "David",
      lang: "en-US",
      default: true,
      voiceURI: "uri:david-default",
    });

    expect(selectBestPtBrVoice([nonDefault, systemDefault])).toBe("uri:david-default");
  });

  it("deve selecionar a primeira voz quando nenhuma PT existe e nenhuma é `default`", () => {
    const first = makeVoice({ name: "Alice", lang: "en-US", voiceURI: "uri:alice" });
    const second = makeVoice({ name: "Bob", lang: "en-US", voiceURI: "uri:bob" });

    expect(selectBestPtBrVoice([first, second])).toBe("uri:alice");
  });

  it("deve selecionar Tier 1 mesmo que apareca no final do array", () => {
    const tier5a = makeVoice({ name: "Alice", lang: "en-US", voiceURI: "uri:alice" });
    const tier3 = makeVoice({ name: "Luciana", lang: "pt-BR", voiceURI: "uri:luciana" });
    const tier1 = makeVoice({
      name: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)",
      lang: "pt-BR",
      voiceURI: "uri:francisca-natural",
    });

    expect(selectBestPtBrVoice([tier5a, tier3, tier1])).toBe("uri:francisca-natural");
  });

  it("deve selecionar a única voz disponível mesmo que seja Tier 5", () => {
    const only = makeVoice({ name: "Alice", lang: "en-US", voiceURI: "uri:alice" });
    expect(selectBestPtBrVoice([only])).toBe("uri:alice");
  });

  it("deve ignorar Tier 1 multilingual e preferir Tier 1 puro quando ambos estão disponíveis", () => {
    const tier1Pure = makeVoice({
      name: "Microsoft Antonio Online (Natural) - Portuguese (Brazil)",
      lang: "pt-BR",
      voiceURI: "uri:antonio",
    });
    const tier2Multi = makeVoice({
      name: "Microsoft ThalitaMultilingual Online (Natural) - Portuguese (Brazil)",
      lang: "pt-BR",
      voiceURI: "uri:thalita",
    });

    expect(selectBestPtBrVoice([tier2Multi, tier1Pure])).toBe("uri:antonio");
  });

  it("deve tratar lang pt_BR (underscore) como PT-BR (Tier 3 convencional)", () => {
    const ptBrUnderscore = makeVoice({
      name: "VoiceUnderscoreLang",
      lang: "pt_BR",
      voiceURI: "uri:pt-br-underscore",
    });
    const enVoice = makeVoice({ name: "Alice", lang: "en-US", voiceURI: "uri:alice" });

    expect(selectBestPtBrVoice([enVoice, ptBrUnderscore])).toBe("uri:pt-br-underscore");
  });

  it("deve retornar voiceURI vazio quando o array tem vozes mas todas têm voiceURI vazio", () => {
    const voice = makeVoice({ name: "Alice", lang: "en-US", voiceURI: "" });
    // O retorno é o voiceURI da voz, que neste caso é vazio — comportamento esperado
    expect(selectBestPtBrVoice([voice])).toBe("");
  });
});

// ---------------------------------------------------------------------------
// listSystemVoices
// ---------------------------------------------------------------------------

describe("listSystemVoices", () => {
  let getVoicesSpy: jest.SpyInstance;

  beforeEach(() => {
    if (!window.speechSynthesis) {
      (window as unknown as { speechSynthesis: Partial<SpeechSynthesis> }).speechSynthesis = {
        getVoices: () => [],
      };
    }
    getVoicesSpy = jest.spyOn(window.speechSynthesis, "getVoices").mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve retornar array vazio em ambiente sem window (SSR)", () => {
    expect(listSystemVoices(null)).toEqual([]);
  });

  it("deve retornar array vazio quando speechSynthesis não está disponível", () => {
    const fakeWindowWithoutTts = {} as Window;
    expect(listSystemVoices(fakeWindowWithoutTts)).toEqual([]);
  });

  it("deve retornar vozes ordenadas com Tier 1 primeiro", () => {
    const tier3 = makeVoice({ name: "Luciana", lang: "pt-BR", voiceURI: "uri:luciana" });
    const tier1 = makeVoice({
      name: "Microsoft Antonio Online (Natural) - Portuguese (Brazil)",
      lang: "pt-BR",
      voiceURI: "uri:antonio",
    });
    const tier5 = makeVoice({ name: "David", lang: "en-US", voiceURI: "uri:david" });

    getVoicesSpy.mockReturnValue([tier5, tier3, tier1]);

    const result = listSystemVoices();
    expect(result[0].id).toBe("uri:antonio");
  });

  it("deve mapear vozes para VoiceOption com id=voiceURI e label contendo nome e lang", () => {
    const voice = makeVoice({ name: "Luciana", lang: "pt-BR", voiceURI: "uri:luciana" });
    getVoicesSpy.mockReturnValue([voice]);

    const result = listSystemVoices();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "uri:luciana", label: "Luciana (pt-BR)" });
  });

  it("deve ordenar vozes do mesmo tier alfabeticamente pelo nome", () => {
    const voiceB = makeVoice({ name: "Francisca", lang: "pt-BR", voiceURI: "uri:francisca" });
    const voiceA = makeVoice({ name: "Antonio", lang: "pt-BR", voiceURI: "uri:antonio" });

    getVoicesSpy.mockReturnValue([voiceB, voiceA]);

    const result = listSystemVoices();
    expect(result[0].label).toContain("Antonio");
    expect(result[1].label).toContain("Francisca");
  });

  it("deve listar vozes PT-BR convencionais antes de inglesas", () => {
    const en = makeVoice({ name: "David", lang: "en-US", voiceURI: "uri:david" });
    const ptBr = makeVoice({ name: "Luciana", lang: "pt-BR", voiceURI: "uri:luciana" });

    getVoicesSpy.mockReturnValue([en, ptBr]);

    const result = listSystemVoices();
    expect(result[0].id).toBe("uri:luciana");
    expect(result[1].id).toBe("uri:david");
  });
});