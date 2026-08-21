import { copyToClipboard } from "./clipboard";

describe("Clipboard Utility", () => {
  const originalClipboard = { ...navigator.clipboard };

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
    jest.restoreAllMocks();
  });

  it("deve usar navigator.clipboard.writeText quando disponível", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const result = await copyToClipboard("texto-teste");
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("texto-teste");
  });

  it("deve usar fallback com document.execCommand quando navigator.clipboard for undefined", async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = jest.fn().mockReturnValue(true);

    const result = await copyToClipboard("chave-pix-fallback");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("deve suportar container customizado dentro de modais", async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = jest.fn().mockReturnValue(true);

    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    document.body.appendChild(modal);

    const result = await copyToClipboard("chave-modal", modal);
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");

    document.body.removeChild(modal);
  });

  it("deve retornar false quando o texto for vazio", async () => {
    const result = await copyToClipboard("");
    expect(result).toBe(false);
  });
});
