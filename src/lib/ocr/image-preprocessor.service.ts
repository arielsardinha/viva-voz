/**
 * Serviço de pré-processamento de imagem em HTML Canvas para otimização de OCR.
 * Executa conversão para escala de cinza, binarização (Otsu thresholding) e redimensionamento proporcional.
 * Padrão: Service / Single Responsibility.
 */

export interface PreprocessOptions {
  maxDimension?: number;
  threshold?: number;
  autoThreshold?: boolean;
}

export class ImagePreprocessorService {
  /**
   * Calcula dimensões redimensionadas mantendo o aspect ratio.
   */
  public scaleDimensions(
    width: number,
    height: number,
    maxDimension: number = 2000
  ): { width: number; height: number } {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    const scale = Math.min(maxDimension / width, maxDimension / height);
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }

  /**
   * Converte os pixels de ImageData para escala de cinza usando luminosidade perceptual.
   */
  public toGrayscale(imageData: ImageData): ImageData {
    const data = imageData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminância ITU-R BT.601
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    return imageData;
  }

  /**
   * Calcula o limiar de Otsu ótimo para binarização de histograma.
   */
  public calculateOtsuThreshold(imageData: ImageData): number {
    const data = imageData.data;
    const totalPixels = data.length / 4;
    if (totalPixels === 0) return 128;

    const histogram = new Array<number>(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++;
    }

    let sum = 0;
    for (let t = 0; t < 256; t++) {
      sum += t * histogram[t];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let optimalThreshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      // Variância entre classes: wB * wF * (mB - mF)^2
      const betweenVariance = wB * wF * (mB - mF) * (mB - mF);
      if (betweenVariance > maxVariance) {
        maxVariance = betweenVariance;
        optimalThreshold = t;
      }
    }

    return optimalThreshold;
  }

  /**
   * Aplica binarização (preto/branco) nos pixels do ImageData.
   */
  public applyThreshold(imageData: ImageData, threshold: number = 128): ImageData {
    const data = imageData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const gray = data[i];
      const val = gray >= threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    return imageData;
  }

  /**
   * Pré-processa um Blob de imagem no Canvas e retorna um novo Blob otimizado.
   */
  public async preprocessBlob(blob: Blob, options: PreprocessOptions = {}): Promise<Blob> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return blob;
    }

    const { maxDimension = 2000, autoThreshold = true } = options;

    return new Promise<Blob>((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        // Fallback seguro caso Image.onload demore ou não dispare em ambiente de teste
        timeoutId = setTimeout(() => {
          resolve(blob);
        }, 500);

        const url = URL.createObjectURL ? URL.createObjectURL(blob) : "";
        if (!url) {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(blob);
          return;
        }

        const img = new Image();

        img.onload = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (URL.revokeObjectURL) URL.revokeObjectURL(url);

          const { width, height } = this.scaleDimensions(
            img.naturalWidth || img.width || 800,
            img.naturalHeight || img.height || 600,
            maxDimension
          );
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(blob);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          try {
            const imageData = ctx.getImageData(0, 0, width, height);
            this.toGrayscale(imageData);

            const threshold = autoThreshold
              ? this.calculateOtsuThreshold(imageData)
              : options.threshold ?? 128;

            this.applyThreshold(imageData, threshold);
            ctx.putImageData(imageData, 0, 0);

            if (canvas.toBlob) {
              canvas.toBlob((processedBlob) => {
                resolve(processedBlob || blob);
              }, "image/png");
            } else {
              resolve(blob);
            }
          } catch {
            resolve(blob);
          }
        };

        img.onerror = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (URL.revokeObjectURL) URL.revokeObjectURL(url);
          resolve(blob);
        };

        img.src = url;
      } catch {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(blob);
      }
    });
  }
}
