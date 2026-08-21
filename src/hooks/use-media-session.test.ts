import { renderHook } from "@testing-library/react";
import { useMediaSession } from "./use-media-session";

describe("useMediaSession", () => {
  const mockSetActionHandler = jest.fn();
  const mockMetadataConstructor = jest.fn();

  beforeAll(() => {
    // Mock MediaMetadata
    (global as any).MediaMetadata = jest.fn().mockImplementation((init) => {
      mockMetadataConstructor(init);
      return init;
    });

    // Mock navigator.mediaSession
    Object.defineProperty(navigator, "mediaSession", {
      value: {
        setActionHandler: mockSetActionHandler,
        metadata: null,
        playbackState: "none",
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve definir metadata na Media Session", () => {
    renderHook(() =>
      useMediaSession({
        title: "Capítulo 1 - Introdução",
        subtitle: "Trecho 1 de 20",
        isPlaying: true,
      })
    );

    expect(mockMetadataConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Capítulo 1 - Introdução",
        artist: "VivaVoz",
        album: "Trecho 1 de 20",
      })
    );
  });

  it("deve registrar os handlers de ação de mídia (play, pause, nexttrack, previoustrack)", () => {
    const onPlay = jest.fn();
    const onPause = jest.fn();
    const onNext = jest.fn();
    const onPrevious = jest.fn();

    renderHook(() =>
      useMediaSession({
        title: "Teste",
        isPlaying: false,
        onPlay,
        onPause,
        onNext,
        onPrevious,
      })
    );

    expect(mockSetActionHandler).toHaveBeenCalledWith("play", expect.any(Function));
    expect(mockSetActionHandler).toHaveBeenCalledWith("pause", expect.any(Function));
    expect(mockSetActionHandler).toHaveBeenCalledWith("nexttrack", expect.any(Function));
    expect(mockSetActionHandler).toHaveBeenCalledWith("previoustrack", expect.any(Function));
  });

  it("deve atualizar playbackState conforme o isPlaying", () => {
    const { rerender } = renderHook(
      ({ isPlaying }) =>
        useMediaSession({
          title: "Teste",
          isPlaying,
        }),
      { initialProps: { isPlaying: false } }
    );

    expect(navigator.mediaSession.playbackState).toBe("paused");

    rerender({ isPlaying: true });
    expect(navigator.mediaSession.playbackState).toBe("playing");
  });
});
