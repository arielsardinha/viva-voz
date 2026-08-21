import { render } from "@testing-library/react";
import { WaveformVisualizer } from "./waveform-visualizer";

describe("WaveformVisualizer", () => {
  it("renders correct number of bars without crashing", () => {
    const { container } = render(
      <WaveformVisualizer isPlaying={false} barCount={12} />
    );
    const bars = container.querySelectorAll("span");
    expect(bars.length).toBe(12);
  });

  it("applies playing animation properties when isPlaying is true", () => {
    const { container, rerender } = render(
      <WaveformVisualizer isPlaying={false} barCount={6} />
    );
    let bar = container.querySelector("span");
    expect(bar?.style.animationName).toBe("none");

    rerender(<WaveformVisualizer isPlaying={true} barCount={6} />);
    bar = container.querySelector("span");
    expect(bar?.style.animationName).toBe("soundWave");
    expect(bar?.style.animationIterationCount).toBe("infinite");
  });

  it("applies buffering styles when isBuffering is true", () => {
    const { container } = render(
      <WaveformVisualizer isPlaying={true} isBuffering={true} barCount={6} />
    );
    const bar = container.querySelector("span");
    expect(bar?.className).toContain("animate-pulse");
  });
});
