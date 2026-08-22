# Documentação de Especificação e Design de Software (SDD) — VivaVoz

Este diretório contém os **Software Design Documents (SDDs)** para a evolução do leitor de documentos do VivaVoz em direção ao suporte completo a múltiplos formatos de texto, web e imagens.

---

## 🏛️ Padrões e Práticas Arquiteturais Adotadas

Todas as especificações e implementações seguem rigorosamente:
1. **Padrão Arquitetural:** **MVVM (Model-View-ViewModel)**.
2. **Padrões de Projeto:** Catálogo Completo do **Gang of Four (GoF)** (Criacionais, Estruturais e Comportamentais — como Builder, Factory, Facade, Adapter, Composite, Decorator, Strategy, Observer, Command, State, Chain of Responsibility).
3. **Princípios de Engenharia:** **SOLID**, Clean Architecture e desacoplamento com TypeScript estrito.

---

## 📑 Índice dos Documentos

| Arquivo | Título | Foco & Formatos | Status |
| :--- | :--- | :--- | :--- |
| [00-overview-multi-document-architecture.md](file:///d:/project/viva-voz-text/docs/sdd/00-overview-multi-document-architecture.md) | **Arquitetura Unificada de Múltiplos Documentos** | Visão Geral, Pipeline Universal, Catálogo GoF, Modelos de Domínio e Roadmap. | Aprovado |
| [01-tier-1-essential-documents.md](file:///d:/project/viva-voz-text/docs/sdd/01-tier-1-essential-documents.md) | **Tier 1: Documentos Essenciais** | `.txt`, `.md`, `.docx`, `.epub`, Quick Paste e Upload em Lote. | Aprovado |
| [02-tier-2-web-and-slides.md](file:///d:/project/viva-voz-text/docs/sdd/02-tier-2-web-and-slides.md) | **Tier 2: Web Reader e Apresentações** | Leitor de Artigos por URL (Readability), `.pptx` (PowerPoint) e `.odt`. | Proposto |
| [03-tier-3-multimodal-ocr.md](file:///d:/project/viva-voz-text/docs/sdd/03-tier-3-multimodal-ocr.md) | **Tier 3: Multimodal e OCR** | Imagens (`.png`, `.jpg`, `.webp`), PDFs Escaneados (Tesseract / Gemini Vision). | Proposto |
| [04-google-drive-appdata-sync.md](file:///d:/project/viva-voz-text/docs/sdd/04-google-drive-appdata-sync.md) | **Cloud Sync & Backup via BFF** | Sincronização Google Drive `appDataFolder`, Criptografia Zero-Knowledge, Cookies Seguros e Áudios TTS. | Aprovado |

---

## 🎯 Guia de Implementação Gradual (Tier 1)

1. Criar o modelo `src/lib/domain/document.types.ts` e `ParsedDocumentBuilder`.
2. Implementar `SentenceSplitterService` e `ReadingMetricsService`.
3. Implementar a interface `IDocumentParserAdapter` e os adapters (`TxtDocumentAdapter`, `MdDocumentAdapter`, `DocxDocumentAdapter`, `EpubDocumentAdapter`).
4. Implementar a `DocumentProcessingFacade` e o `AdapterRegistry`.
5. Implementar os ViewModels (`useDocumentUploaderViewModel`, `useDocumentReaderViewModel`).
6. Atualizar a View [PdfDropzone](file:///d:/project/viva-voz-text/src/components/pdf-reader/pdf-dropzone.tsx) e a [Biblioteca](file:///d:/project/viva-voz-text/src/components/pdf-reader/library.tsx).
7. Escrever as suites de testes unitários (Jest) e E2E (Cypress).
