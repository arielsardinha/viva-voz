"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/pwa-utils";

export function PwaRegister() {
  useEffect(() => {
    // Registrar o Service Worker apenas em navegadores que suportam
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Aguardar o carregamento completo para não competir por largura de banda crítica
      window.addEventListener("load", () => {
        registerServiceWorker();
      });
    }
  }, []);

  return null;
}
