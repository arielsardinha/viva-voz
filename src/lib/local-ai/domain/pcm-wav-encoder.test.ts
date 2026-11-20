import {
  encodeFloat32PcmToWavBlob,
  encodeFloat32PcmToWavBuffer,
} from "./pcm-wav-encoder";

describe("pcm-wav-encoder", () => {
  it("deve gerar um ArrayBuffer RIFF/WAVE PCM 16-bit mono válido de 44 + 2*N bytes", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1.5, -1.5]);
    const buffer = encodeFloat32PcmToWavBuffer(samples, 24000);

    expect(buffer.byteLength).toBe(44 + samples.length * 2);

    const view = new DataView(buffer);
    const readAscii = (offset: number, length: number) =>
      String.fromCharCode(
        ...Array.from({ length }, (_, idx) => view.getUint8(offset + idx)),
      );

    expect(readAscii(0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + samples.length * 2);
    expect(readAscii(8, 4)).toBe("WAVE");
    expect(readAscii(12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // Mono
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint32(28, true)).toBe(48000); // byteRate = sampleRate * 2
    expect(view.getUint16(32, true)).toBe(2); // blockAlign
    expect(view.getUint16(34, true)).toBe(16); // bitsPerSample
    expect(readAscii(36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(samples.length * 2);

    // Amostras convertidas com clamp em [-1, 1]
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBeGreaterThan(16000);
    expect(view.getInt16(48, true)).toBeLessThan(-16000);
    expect(view.getInt16(50, true)).toBe(32767);
    expect(view.getInt16(52, true)).toBe(-32768);
  });

  it("deve gerar um Blob com MIME type audio/wav", () => {
    const blob = encodeFloat32PcmToWavBlob(new Float32Array([0.1, -0.1]), 24000);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(48);
  });
});
