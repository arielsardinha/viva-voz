import { renderHook, act } from "@testing-library/react";
import { useDocumentNotes } from "./use-document-notes";

describe("useDocumentNotes", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("deve iniciar com lista vazia quando não há notas", () => {
    const { result } = renderHook(() => useDocumentNotes("doc-123"));

    expect(result.current.notes).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });

  it("deve adicionar uma nova nota e persistir no localStorage", () => {
    const { result } = renderHook(() => useDocumentNotes("doc-123"));

    act(() => {
      result.current.addNote({
        sentenceIndex: 2,
        selectedText: "Trecho importante",
        content: "Minha reflexão pessoal sobre este trecho.",
        title: "Ideia Principal",
        color: "emerald",
        page: 1,
      });
    });

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].title).toBe("Ideia Principal");
    expect(result.current.notes[0].content).toBe("Minha reflexão pessoal sobre este trecho.");
    expect(result.current.notes[0].color).toBe("emerald");

    const saved = JSON.parse(localStorage.getItem("vivavoz_notes_doc-123") || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe("Ideia Principal");
  });

  it("deve recuperar notas indexadas por sentença", () => {
    const { result } = renderHook(() => useDocumentNotes("doc-123"));

    act(() => {
      result.current.addNote({
        sentenceIndex: 5,
        selectedText: "Frase 5",
        content: "Nota 1 da frase 5",
      });
      result.current.addNote({
        sentenceIndex: 10,
        selectedText: "Frase 10",
        content: "Nota da frase 10",
      });
    });

    expect(result.current.getNotesForSentence(5)).toHaveLength(1);
    expect(result.current.getNotesForSentence(10)).toHaveLength(1);
    expect(result.current.getNotesForSentence(0)).toHaveLength(0);
  });

  it("deve atualizar e deletar uma nota", () => {
    const { result } = renderHook(() => useDocumentNotes("doc-123"));

    let createdId = "";
    act(() => {
      const note = result.current.addNote({
        sentenceIndex: 1,
        selectedText: "Texto original",
        content: "Conteúdo inicial",
      });
      createdId = note.id;
    });

    expect(result.current.notes).toHaveLength(1);

    act(() => {
      result.current.updateNote(createdId, { content: "Conteúdo atualizado" });
    });

    expect(result.current.notes[0].content).toBe("Conteúdo atualizado");

    act(() => {
      result.current.deleteNote(createdId);
    });

    expect(result.current.notes).toHaveLength(0);
    expect(localStorage.getItem("vivavoz_notes_doc-123")).toBeNull();
  });
});
