import {
  getOrCreateFirebaseApp,
  createHybridGenerativeModel,
  streamHybridPrompt,
  checkOnDeviceAvailability,
  InferenceMode,
} from "./firebase-ai";
import { getApps } from "firebase/app";

describe("firebase-ai service", () => {
  it("deve criar e reutilizar instância de FirebaseApp com base na chave", () => {
    const app1 = getOrCreateFirebaseApp("test-api-key-12345");
    const app2 = getOrCreateFirebaseApp("test-api-key-12345");

    expect(app1).toBe(app2);
    expect(app1.name).toContain("vivavoz-ai-test-api");
    expect(getApps()).toContain(app1);
  });

  it("deve instanciar modelo híbrido com parâmetros inCloud e onDevice", () => {
    const model = createHybridGenerativeModel({
      apiKey: "fake-test-key",
      mode: InferenceMode.PREFER_ON_DEVICE,
      systemInstruction: "Instruções customizadas de teste",
      inCloudModel: "gemini-2.5-flash",
    });

    expect(model).toBeDefined();
    expect(typeof model.generateContentStream).toBe("function");
  });

  it("deve executar streaming progressivo via streamHybridPrompt", async () => {
    const mockModel = {
      generateContentStream: jest.fn().mockResolvedValue({
        stream: (async function* () {
          yield { text: () => "Olá! " };
          yield { text: () => "Esta é uma resposta de teste." };
        })(),
        response: Promise.resolve({
          inferenceSource: "ON_DEVICE",
        }),
      }),
    };

    const chunks: string[] = [];
    for await (const chunk of streamHybridPrompt({
      model: mockModel as any,
      prompt: "Qual o resumo?",
      context: "Contexto do documento",
      fileName: "teste.pdf",
    })) {
      chunks.push(chunk.text);
    }

    expect(chunks).toEqual(["Olá! ", "Esta é uma resposta de teste."]);
    expect(mockModel.generateContentStream).toHaveBeenCalled();
  });

  it("deve interromper o streaming se o sinal for abortado", async () => {
    const controller = new AbortController();
    controller.abort();

    const mockModel = {
      generateContentStream: jest.fn(),
    };

    await expect(async () => {
      for await (const _ of streamHybridPrompt({
        model: mockModel as any,
        prompt: "Teste",
        signal: controller.signal,
      })) {
        // no-op
      }
    }).rejects.toThrow("Operação cancelada pelo usuário.");
  });

  describe("checkOnDeviceAvailability", () => {
    afterEach(() => {
      delete (window as any).ai;
      delete (window as any).model;
    });

    it("deve retornar 'available' quando window.ai.languageModel.availability retorna 'available'", async () => {
      (window as any).ai = {
        languageModel: {
          availability: jest.fn().mockResolvedValue("available"),
        },
      };

      const result = await checkOnDeviceAvailability();
      expect(result).toBe("available");
    });

    it("deve retornar 'downloadable' quando window.ai.languageModel.availability retorna 'downloadable'", async () => {
      (window as any).ai = {
        languageModel: {
          availability: jest.fn().mockResolvedValue("downloadable"),
        },
      };

      const result = await checkOnDeviceAvailability();
      expect(result).toBe("downloadable");
    });

    it("deve retornar 'unavailable' quando window.ai não está presente", async () => {
      delete (window as any).ai;
      delete (window as any).model;

      const result = await checkOnDeviceAvailability();
      expect(result).toBe("unavailable");
    });
  });
});
