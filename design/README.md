# VivaVoz — repaginação da UI

Proposta de nova interface para o VivaVoz, feita no FigCraft. **Abra
[`vivavoz-repaginada.figcraft`](vivavoz-repaginada.figcraft) no FigCraft** e aperte
`Shift+Espaço` para navegar pelo protótipo clicável. Há dois fluxos: **Jornada
do leitor** (desktop) e **Jornada no celular**.

As imagens de cada tela estão em [`jornada/`](jornada).

## A jornada

| Tela | O que muda |
| --- | --- |
| 00 · Capa | Princípios da repaginação e o mapa da jornada. Cada etapa é clicável. |
| 01 · Início | A promessa em uma frase ("Ouça qualquer texto. Converse com ele."), uma prévia do produto (leitura, IA e player) e os três passos. |
| 02 · Biblioteca | "Continuar ouvindo" em destaque, as três formas de adicionar sempre à vista e uma estante com capas por formato e progresso. |
| 03 · Adicionar | Um modal só para arquivo, link ou texto colado, com progresso do OCR e a escolha de voz e de IA antes de abrir. |
| 04 · Leitor | Coluna de ~68 caracteres em serifa, a frase narrada marcada em âmbar, sumário à esquerda, notas na margem e o player flutuante. |
| 05 · Leitor + IA | Painel do assistente ao lado do texto: menu de seleção ("Explicar", "Ouvir daqui"…), respostas com **fontes clicáveis** (¶1), ações (ouvir, copiar, salvar como nota), sugestões e o motor de IA visível (local/offline, Gemini, Chrome). |
| 06 · Modo foco | Noturno, só a frase atual acesa, controles mínimos, som ambiente e o progresso do capítulo. |
| 07–08 · Celular | Leitor com player na zona do polegar e assistente como folha inferior. |
| 09 · Sistema visual | Paleta "Papel & Tinta", tipografia, componentes e regras de uso. |

## Sistema visual em uma linha

Papel quente (`#F5F0E6`) para leitura longa, **índigo** (`#4B44D6`) para ação e
IA, **âmbar** (`#E9A23B`) só para a voz. Source Serif 4 no texto e Inter na
interface.

## Gerar de novo

O arquivo é gerado por [`scripts/gerar-jornada.mjs`](scripts/gerar-jornada.mjs).
Para mudar textos, cores ou telas, edite o script e rode:

```powershell
node design/scripts/gerar-jornada.mjs
D:\dev\figcraft\FigCraft\figcraft-cli.exe run design/build/jornada.json --out design/vivavoz-repaginada.figcraft
D:\dev\figcraft\FigCraft\figcraft-cli.exe export design/vivavoz-repaginada.figcraft -o design/jornada --format png
```

Editar direto no FigCraft também funciona, mas uma nova geração sobrescreve o arquivo.
