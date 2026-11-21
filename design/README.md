# VivaVoz — Repaginação da UI & UX (v2)

Proposta de interface para o VivaVoz desenhada primeiro no FigCraft, com foco em tornar a **escuta de conteúdos** (voz neural offline, estúdio de ambiência, ritmo e acompanhamento palavra a palavra) e o **suporte com Chat de IA** (simbiose automática com o áudio, respostas narradas inline, fontes clicáveis, quiz e entrada multimodal por voz/imagem) naturais e sem atrito.

**Abra [`vivavoz-repaginada.figcraft`](vivavoz-repaginada.figcraft) no FigCraft** e aperte `Shift+Espaço` para navegar pelo protótipo clicável. Há dois fluxos interativos: **Jornada do leitor** (desktop 1440 px) e **Jornada no celular** (375 px).

As imagens exportadas de cada tela estão em [`jornada/`](jornada).

## Princípio central: Escuta Viva, Conversa Ancorada

1. **Simbiose Áudio ↔ IA:** Ao perguntar ou gravar voz para a IA, a narração pausa automaticamente no parágrafo exato e oferece retomada em 1 toque (`▶ Retomar em ¶1`).
2. **Respostas ouvintes & com fontes:** Toda resposta da IA pode ser ouvida na hora via mini-player âmbar inline (`▶ Ouvir explicação`) e traz pílulas clicáveis para saltar ao trecho exato (`¶1`).
3. **Estúdio de escuta direto do player:** Troque vozes neurais locais (Kokoro 82M / Piper ONNX), velocidade (`0,8×` a `2,0×`), mixagem de som ambiente e timer sem sair da leitura.
4. **Modos de estudo multimodais:** Alterne entre *Conversar*, *Explicar simples*, *Quiz de fixação* e *Resumo*, enviando texto, pergunta por voz ou foto de anotações.

## A jornada (12 telas)

| Tela | O que resolve |
| --- | --- |
| `00 · Capa` | Princípios da repaginação v2 e mapa clicável de todas as etapas. |
| `01 · Início` | Promessa clara, prévia viva (leitura + destaque de palavra + resposta com áudio) e 3 passos. |
| `02 · Biblioteca` | Card *Continuar ouvindo* com retomada de voz e de chat, origens rápidas, sync Drive aderente às regras (textos recentes offline + áudios/chave na nuvem) e estante com contagem de conversas. |
| `03 · Adicionar` | Modal único para arquivo, link ou texto colado com progresso de OCR e seleção de voz offline (Dora · Kokoro 82M) e assistente (Gemma 4 E4B). |
| `04 · Leitor` | Coluna em Source Serif 4, frase ativa em âmbar com destaque na palavra narrada, sumário com duração por capítulo, ponte lateral *Escuta → IA* e dock unificado. |
| `05 · Estúdio de voz` | Popover flutuante de voz neural (Dora, Faber, Alex, Cadu), ritmo com economia de tempo, mixer de som ambiente (Chuva, Ondas, Lareira, Foco), timer e pausa automática ao perguntar. |
| `06 · Leitor + IA` | Banner de áudio pausado com retomada rápida, menu flutuante de seleção sem colidir com o texto, abas de modo, resposta com mini-player âmbar, fontes clicáveis e **Mini-Card A2UI** sugerindo Quiz interativo. |
| `07 · Quiz A2UI` | Superfície declarativa **A2UI (Agent-to-User Interface)**: trilha de progresso (`dataModel`), `QuizQuestionCard` com áudio da pergunta, `ChoiceGroup`, `ConfidenceBar` de metacognição, `ExplanationCard` com áudio inline, destaque bidirecional de evidência no texto (`¶2`) e controle híbrido por voz (`userAction`). |
| `08 · Modo foco` | Noturno imersivo com frase e palavra acesas em âmbar, dock minimalista centralizado com acesso direto à IA e anel de progresso do capítulo. |
| `09 · Celular · Leitor` | Tela de 375 px (≥ 370 px) com atalho flutuante *Explicar esta frase*, player na zona do polegar, alvos ≥ 44 px e safe-area inferior. |
| `10 · Celular · Assistente` | Bottom sheet com faixa de retomada de áudio, modos do tutor, diálogo fluído, mini-player inline, widget **Quiz A2UI** compacto e composer multimodal. |
| `11 · Sistema visual` | Sistema *Papel, Tinta, Âmbar & Índigo* (v2), tipografia, badges dos motores reais, estados de áudio/IA e regras de acessibilidade. |

## Sistema visual em uma linha

Papel quente (`#F5F0E6`) para leitura longa, **índigo** (`#4B44D6`) para ação e IA, **âmbar** (`#E9A23B`) exclusivo para a voz e **esmeralda** (`#2E8B57`) para status offline/sync. `Source Serif 4` no texto e `Inter` na interface.

## Estrutura dos scripts e regeneração

Os scripts geradores em [`scripts/`](scripts) estão modularizados por responsabilidade:

- [`scripts/tokens.mjs`](scripts/tokens.mjs) — Paleta, tipografia, sombras e dados do livro/vozes/estante.
- [`scripts/primitives.mjs`](scripts/primitives.mjs) — Primitivas FigCraft, ícones vetoriais, `text.style` inline e componentes (`dock`, `inlineVoiceReply`, `currentSentence`, etc.).
- [`scripts/screens-journey.mjs`](scripts/screens-journey.mjs) — Telas `00` a `03`.
- [`scripts/screens-listening-ai.mjs`](scripts/screens-listening-ai.mjs) — Telas `04` a `06` e helpers compartilhados do assistente.
- [`scripts/screen-quiz-a2ui.mjs`](scripts/screen-quiz-a2ui.mjs) — Tela `07` (Superfície de Quiz Interativo com protocolo A2UI).
- [`scripts/screen-focus.mjs`](scripts/screen-focus.mjs) — Tela `08` (Modo foco noturno).
- [`scripts/screens-mobile-system.mjs`](scripts/screens-mobile-system.mjs) — Telas `09` a `11`.
- [`scripts/gerar-jornada.mjs`](scripts/gerar-jornada.mjs) — Orquestrador, ligações de protótipo e saída JSON.

Para alterar textos, cores ou telas, edite o módulo correspondente e rode:

```powershell
node design/scripts/gerar-jornada.mjs
D:\dev\figcraft\FigCraft\figcraft-cli.exe run design/build/jornada.json --out design/vivavoz-repaginada.figcraft
D:\dev\figcraft\FigCraft\figcraft-cli.exe export design/vivavoz-repaginada.figcraft -o design/jornada --format png
```
