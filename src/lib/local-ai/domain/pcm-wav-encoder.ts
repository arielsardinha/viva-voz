/**
 * Codificador puro de amostras PCM float32 mono para container RIFF/WAVE (16-bit PCM).
 */

function writeAsciiString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function encodeFloat32PcmToWavBuffer(
  samples: Float32Array,
  sampleRateHz: number,
): ArrayBuffer {
  const safeRate =
    Number.isFinite(sampleRateHz) && sampleRateHz > 0
      ? Math.round(sampleRateHz)
      : 24000;
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAsciiString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAsciiString(view, 8, "WAVE");
  writeAsciiString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, safeRate, true);
  view.setUint32(28, safeRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAsciiString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return buffer;
}

export function encodeFloat32PcmToWavBlob(
  samples: Float32Array,
  sampleRateHz: number,
): Blob {
  const wavBuffer = encodeFloat32PcmToWavBuffer(samples, sampleRateHz);
  return new Blob([wavBuffer], { type: "audio/wav" });
}
