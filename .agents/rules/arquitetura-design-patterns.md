# Diretrizes Arquiteturais: MVVM, SOLID & Design Patterns (Gang of Four - GoF)

## 1. Padrão Arquitetural MVVM (Model-View-ViewModel)
- **Model (`src/lib/types/`, `src/lib/domain/`):** Entidades puras e imutáveis (`ParsedDocument`, `DocumentChapter`, `DocumentMetadata`). Zero dependência de React ou DOM.
- **ViewModel (`src/hooks/`):** Custom Hooks que encapsulam o estado da UI, lógica de apresentação e chamadas a UseCases/Services (ex: `useDocumentReaderViewModel`, `useDocumentUploaderViewModel`, `useLibraryViewModel`).
- **View (`src/components/`):** Componentes React puros e desacoplados focados na renderização visual, acessibilidade (WebMCP) e captura de eventos de usuário, sem regras de negócio embutidas.

---

## 2. Padrões de Projeto do Gang of Four (GoF)

Sempre que houver necessidade técnica para garantir desacoplamento, extensibilidade e clareza, utilize os **Padrões de Projeto do Gang of Four (GoF)** em suas três categorias:

### A. Padrões Criacionais (Creational Patterns)
- **Builder:** Construção estruturada e fluente de objetos complexos (ex: `ParsedDocumentBuilder` para instanciar `ParsedDocument` validando invariantes).
- **Factory Method / Abstract Factory:** Criação e registro dinâmico de instâncias especializadas (ex: `AdapterRegistry` / `DocumentParserFactory`).
- **Singleton:** Instâncias únicas de serviços de infraestrutura e gateways de cache/banco de dados.
- **Prototype:** Clonagem e transformação imutável de estados e configurações.

### B. Padrões Estruturais (Structural Patterns)
- **Facade:** Interface simplificada e de alto nível para subsistemas complexos (ex: `DocumentProcessingFacade` orquestrando o pipeline de múltiplos extratores, sanitizadores e persistência).
- **Adapter:** Padronização de interfaces heterogêneas sob um contrato comum (`IDocumentParserAdapter` implementado por `PdfAdapter`, `EpubAdapter`, `DocxAdapter`, `TxtAdapter`, `MdAdapter`, `WebArticleAdapter`, `OcrAdapter`).
- **Composite:** Estruturas hierárquicas de documentos (ex: árvore de seções, capítulos e subcapítulos).
- **Decorator:** Enriquecimento de parsers e streams com logging, métricas de performance e cache sem alterar a classe base.
- **Proxy:** Interceptação para controle de acesso, cache ou lazy-loading de arquivos volumosos.

### C. Padrões Comportamentais (Behavioral Patterns)
- **Strategy:** Algoritmos intercambiáveis em tempo de execução (ex: `IOcrEngineStrategy` para Tesseract vs. Gemini Vision; `ITtsEngineStrategy` para Web Speech vs. ElevenLabs).
- **Observer / Pub-Sub:** Notificação reativa de progresso e eventos de streaming de áudio/leitura.
- **Chain of Responsibility:** Encadeamento de sanitizadores de texto, filtros de pré-processamento de imagem e middlewares.
- **Command:** Encapsulamento de ações do leitor (Play, Pause, SkipSentence, JumpChapter) permitindo histórico e atalhos de teclado.
- **State / Memento:** Gestão de estados do player (Idle, Loading, Playing, Paused, Error) e restauração do ponto de leitura do usuário.

---

## 3. Princípios SOLID Aplicados
1. **S (Single Responsibility):** Cada adapter/classe trata exclusivamente de uma única responsabilidade de domínio ou I/O.
2. **O (Open/Closed):** O sistema é aberto para extensão (novos formatos via novos Adapters/Strategies) e fechado para modificação de código já testado.
3. **L (Liskov Substitution):** Qualquer implementação de interface (ex: `IDocumentParserAdapter`) pode substituir outra sem quebrar o comportamento do consumidor.
4. **I (Interface Segregation):** Interfaces pequenas, focadas e coesas.
5. **D (Dependency Inversion):** Módulos de alto nível (ViewModels, Facades, UseCases) dependem de abstrações/interfaces, nunca de implementações concretas.
