# Diretrizes de IA Híbrida: Firebase AI Logic (On-Device Gemini Nano & Cloud BYOK)

## 1. Princípios Inegociáveis

1. **SDK Oficial Padronizado:**
   - Utilize exclusivamente o pacote oficial `firebase/ai` (`getAI`, `getGenerativeModel`, `InferenceMode`, `GoogleAIBackend`, `VertexAIBackend`) para orquestração híbrida de IA no cliente.
2. **Modo Híbrido Dinâmico:**
   - Quando online e com chave de API do usuário (BYOK): utilizar `InferenceMode.PREFER_IN_CLOUD` ou `InferenceMode.PREFER_ON_DEVICE`.
   - Quando offline: o SDK recorre nativamente ao Gemini Nano On-Device (Chrome Built-in AI) sem erros ou dependência de rede.
3. **BYOK (Bring Your Own Key) Isolado:**
   - A inicialização do app Firebase com a chave da API do usuário ocorre exclusivamente no lado do cliente com instâncias nomeadas e isoladas (`initializeApp({ apiKey, ... }, appName)`).
4. **Idioma Mandatório PT-BR:**
   - As instruções de sistema (`systemInstruction`) em `inCloudParams` e `onDeviceParams` devem obrigar respostas estritamente em Português do Brasil de forma fluida, polida e gramaticalmente correta.
5. **Responsividade & Acessibilidade:**
   - Toda interface relacionada à IA (badges, modais de onboarding e atalhos de flags) deve ser 100% acessível para humanos e agentes, adaptando-se a telas a partir de 370px.
