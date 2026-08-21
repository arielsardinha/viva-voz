# Diretrizes de UI/UX: Uso Semântico e Estrito de Ícones de IA

## 1. Princípio Fundamental
O uso de iconografia associada à Inteligência Artificial (ex: `Sparkles`, `Bot`, `Brain`, `Cpu`, `Wand2`, `Aperture`) deve ser **estritamente reservado para funcionalidades reais de IA**.

---

## 2. Onde o uso de ícones de IA é PERMITIDO:
- **Assistente de Estudos e Chat Gemini:** Botões de envio para o modelo de linguagem, prompts e sugestões de estudo.
- **Chrome AI (Gemini Nano):** Badges de status da IA local no navegador, detecção de disponibilidade e modelo embarcado.
- **Síntese de Fala Neural (TTS Studio / Wavenet):** Opções que utilizam redes neurais profundas de síntese de voz.
- **Extração / Sumarização Inteligente:** Recursos de resumo e perguntas sobre o PDF com LLM.

---

## 3. Onde o uso de ícones de IA é ESTRITAMENTE PROIBIDO:
- **Pagamentos e Doações (Pix, Cartão, Chave EVP, QR Code):** Utilizar ícones semânticos financeiros/transacionais (`QrCode`, `KeyRound`, `Heart`, `Copy`, `ShieldCheck`, `Coffee`, `BadgeCheck`). Nunca usar `Sparkles` ou `Wand`.
- **Alternadores de Tema / Modo de Leitura:** Utilizar ícones astronômicos ou de leitura (`Sun`, `Moon`, `BookOpen`, `Eye`).
- **Configurações Gerais e Tutoriais:** Utilizar `Settings`, `Sliders`, `HelpCircle`, `GraduationCap`.
- **Botões e Links de Navegação Comuns:** Utilizar `ArrowLeft`, `Home`, `Folder`, `Mic`.

---

## 4. Checklist de Validação Visual
- [ ] O componente realiza chamada a um modelo de IA (Gemini, Nano, TTS Neural)? Se não, substitua qualquer ícone de IA por um ícone funcional correspondente.
- [ ] A metáfora visual é compreensível para usuários e agentes de acessibilidade sem gerar falsa expectativa de automação por IA?
