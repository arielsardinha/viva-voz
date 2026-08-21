/**
 * Utilitário seguro e universal para leitura de File/Blob em navegadores e ambientes de teste (Node/JSDOM).
 */
export async function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    try {
      return await file.arrayBuffer();
    } catch {
      // Fallback para FileReader caso ocorra erro no mock/browser
    }
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error("Falha ao converter arquivo para ArrayBuffer"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  // Fallback em Node.js com Buffer
  if (typeof Buffer !== "undefined") {
    const text = await readFileAsText(file);
    const buf = Buffer.from(text, "utf-8");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  throw new Error("Ambiente incompatível para leitura de ArrayBuffer");
}

export async function readFileAsText(file: File | Blob): Promise<string> {
  if (typeof file.text === "function") {
    try {
      return await file.text();
    } catch {
      // Fallback para FileReader
    }
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Falha ao converter arquivo para texto"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  const buffer = await readFileAsArrayBuffer(file);
  return new TextDecoder("utf-8").decode(buffer);
}
