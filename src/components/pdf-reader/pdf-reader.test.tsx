import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock de módulos ESM incompatíveis com Jest
jest.mock("ai", () => ({
  DefaultChatTransport: jest.fn().mockImplementation(() => ({
    sendMessages: jest.fn(),
  })),
}));

jest.mock("@/lib/client/hybrid-chat-transport", () => ({
  HybridChatTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: jest.fn(),
    status: "ready",
  }),
}));

import { PdfReader } from "./pdf-reader";
import { ReaderSettingsProvider } from "@/context/reader-settings-context";
import type { DocumentNote } from "@/lib/domain/document-note.types";

// Mock das dependências externas
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (param: string) => (param === "doc" ? "doc-123" : null),
  }),
  usePathname: () => "/leitor",
}));

jest.mock("@/hooks/use-google-drive-sync", () => ({
  useGoogleDriveSync: () => ({
    status: { isConnected: false },
    isLoading: false,
    isSyncing: false,
    syncPhase: "idle",
    progress: 0,
    errorMessage: null,
    showPermissionModal: false,
    setShowPermissionModal: jest.fn(),
    checkStatus: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    backupNow: jest.fn(),
    restoreNow: jest.fn(),
    syncBidirectional: jest.fn(),
  }),
}));

jest.mock("@/hooks/use-chrome-ai", () => ({
  useChromeAi: () => ({ status: "unavailable" }),
}));

jest.mock("@/hooks/use-pwa-install", () => ({
  usePwaInstall: () => ({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    promptInstall: jest.fn(),
  }),
}));

jest.mock("@/hooks/use-gemini-api-key", () => ({
  useGeminiApiKey: () => ({
    apiKey: null,
    hasApiKey: false,
    maskedKey: null,
    isChecking: false,
    updateApiKey: jest.fn().mockResolvedValue(true),
    syncKey: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockSeekTo = jest.fn();
const mockJumpTo = jest.fn();
const mockPause = jest.fn();
const mockPlay = jest.fn();

jest.mock("@/hooks/use-tts-player", () => ({
  useTtsPlayer: () => ({
    currentIndex: 0,
    isPlaying: false,
    isBuffering: false,
    play: mockPlay,
    pause: mockPause,
    toggle: jest.fn(),
    previous: jest.fn(),
    next: jest.fn(),
    restart: jest.fn(),
    jumpTo: mockJumpTo,
    seekTo: mockSeekTo,
  }),
}));

const mockNotesList: DocumentNote[] = [
  {
    id: "note-1",
    sentenceIndex: 3,
    selectedText: "Frase de teste com anotação importante.",
    title: "Minha Anotação",
    content: "Comentário sobre o trecho lido.",
    color: "amber",
    page: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

jest.mock("@/hooks/use-document-notes", () => ({
  useDocumentNotes: () => ({
    notes: mockNotesList,
    getNotesForSentence: () => [],
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  }),
}));

jest.mock("@/hooks/use-document-highlights", () => ({
  useDocumentHighlights: () => ({
    highlights: [],
    getHighlightsForSentence: () => [],
    applyHighlight: jest.fn(),
    removeHighlightsForSelection: jest.fn(),
  }),
}));

const mockDocument = {
  id: "doc-123",
  metadata: {
    title: "Documento de Teste",
    format: "pdf",
    pageCount: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    size: 1024,
  },
  sentences: [
    { index: 0, text: "Primeira frase do documento.", page: 1 },
    { index: 1, text: "Segunda frase informativa.", page: 1 },
    { index: 2, text: "Terceira frase explicativa.", page: 1 },
    { index: 3, text: "Frase de teste com anotação importante.", page: 1 },
    { index: 4, text: "Quinta frase finalizando a página.", page: 1 },
  ],
  chapters: [],
  lastSentenceIndex: 0,
};

jest.mock("@/lib/facade/document-processing.facade", () => ({
  DocumentProcessingFacade: {
    getInstance: () => ({
      getRepository: () => ({
        getById: jest.fn().mockResolvedValue(mockDocument),
      }),
      saveReadingProgress: jest.fn().mockResolvedValue(undefined),
      renameDocument: jest.fn().mockResolvedValue(undefined),
      getSupportedExtensions: () => [".pdf", ".epub", ".docx", ".odt", ".txt", ".md"],
      getAcceptAttribute: () => ".pdf,.epub,.docx,.odt,.txt,.md",
    }),
  },
}));

describe("PdfReader - Bloco de Notas e Navegação para o trecho", () => {
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    localStorage.clear();
    localStorage.setItem(
      "vivavoz-reader-settings",
      JSON.stringify({
        template: "modern",
        hasCompletedOnboarding: true,
      })
    );
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("deve navegar até o trecho da nota com seekTo e sem disparar áudio ao clicar em 'Ir para o trecho'", async () => {
    render(
      <ReaderSettingsProvider>
        <PdfReader />
      </ReaderSettingsProvider>
    );

    // Aguarda carregar o documento mockado
    await waitFor(() => {
      expect(screen.getAllByText("Documento de Teste")[0]).toBeInTheDocument();
    });

    // Abre o Drawer de Bloco de Notas através do botão no TemplateSwitcher
    const notesButton = screen.getByRole("button", { name: /Bloco de Notas/i });
    fireEvent.click(notesButton);

    // Verifica se o Drawer abriu exibindo a anotação
    expect(screen.getByText("Minha Anotação")).toBeInTheDocument();
    expect(screen.getByText("Frase de teste com anotação importante.")).toBeInTheDocument();

    // Clica no botão "Ir para o trecho"
    const jumpToSnippetButton = screen.getByRole("button", { name: /Ir para o trecho/i });
    fireEvent.click(jumpToSnippetButton);

    // Deve chamar seekTo com o índice 3 da nota
    expect(mockSeekTo).toHaveBeenCalledWith(3);

    // NÃO deve chamar jumpTo (que iniciaria o áudio)
    expect(mockJumpTo).not.toHaveBeenCalled();

    // NÃO deve chamar play
    expect(mockPlay).not.toHaveBeenCalled();

    // Avança os timers para o scroll suave disparar
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });
});
