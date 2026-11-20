import { render, screen } from "@testing-library/react";
import { TtsModelIndicator } from "./tts-model-indicator";
import type { ActiveTtsModelInfo } from "@/lib/tts-models";

const primaryModel: ActiveTtsModelInfo = {
  id: "gemini-3.8-flash-tts",
  label: "Gemini 3.8 Flash TTS",
  shortLabel: "3.8 Flash",
  isFallback: false,
};

const fallbackModel: ActiveTtsModelInfo = {
  id: "gemini-3.8-flash-lite-tts",
  label: "Gemini 3.8 Flash-Lite TTS",
  shortLabel: "3.8 Lite",
  isFallback: true,
};

describe("TtsModelIndicator", () => {
  it("não deve renderizar nada quando o motor for 'system' ou activeModel for null", () => {
    const { container: c1 } = render(
      <TtsModelIndicator engine="system" activeModel={primaryModel} />,
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <TtsModelIndicator engine="google" activeModel={null} />,
    );
    expect(c2.firstChild).toBeNull();
  });

  it("deve renderizar o indicador primário discreto quando engine='google' e isFallback=false", () => {
    render(<TtsModelIndicator engine="google" activeModel={primaryModel} />);

    const badge = screen.getByTestId("tts-model-indicator");
    expect(badge).toHaveAttribute("data-tts-model", "gemini-3.8-flash-tts");
    expect(badge).toHaveAttribute("data-tts-fallback", "false");
    expect(badge).toHaveAttribute("aria-label", "Narração IA ativa: Gemini 3.8 Flash TTS");
    expect(badge).toHaveTextContent("3.8 Flash");
    expect(badge).not.toHaveTextContent("Alternativo");
  });

  it("deve destacar o modo alternativo de forma acessível e acolhedora sem códigos HTTP", () => {
    render(<TtsModelIndicator engine="google" activeModel={fallbackModel} />);

    const badge = screen.getByTestId("tts-model-indicator");
    expect(badge).toHaveAttribute("data-tts-model", "gemini-3.8-flash-lite-tts");
    expect(badge).toHaveAttribute("data-tts-fallback", "true");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute("aria-live", "polite");
    expect(badge).toHaveTextContent("Alternativo · 3.8 Lite");
    expect(badge.textContent).not.toMatch(/429|403|500|env/i);
  });

  it("deve renderizar apenas o shortLabel no modo compact para telas móveis pequenas", () => {
    render(<TtsModelIndicator engine="google" activeModel={fallbackModel} compact />);

    const badge = screen.getByTestId("tts-model-indicator");
    expect(badge).toHaveTextContent("3.8 Lite");
    expect(badge).not.toHaveTextContent("Alternativo");
  });
});
