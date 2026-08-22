---
trigger: always_on
---

# Diretrizes de Armazenamento de Dados: IndexedDB (Local) e Google Drive (Cloud)

## 1. Princípios Inegociáveis de Armazenamento Local (IndexedDB)

1. **Áudios TTS NUNCA são armazenados no IndexedDB:**
   - A tabela do IndexedDB é limitada em tamanho. Blobs de áudio sintetizado (TTS) são volumosos e NUNCA devem ser persistidos localmente.
   - Áudios são armazenados exclusivamente na nuvem (Google Drive `appDataFolder`), disponíveis apenas quando o usuário está conectado.
   - Se o usuário não estiver conectado à nuvem, áudios são gerados sob demanda e descartados após o uso.

2. **Documentos Recentes no IndexedDB (Offline-First):**
   - Os documentos processados (texto extraído, metadados, capítulos) devem ser persistidos no IndexedDB para garantir acesso offline.
   - Apenas os documentos **mais recentes** são mantidos, seguindo uma política de eviction LRU (Least Recently Used).
   - Isso garante que, em caso de perda de conexão, os documentos mais recentes estarão disponíveis para leitura.

3. **Eviction Automática por Capacidade (LRU):**
   - Quando o IndexedDB atingir seu limite de armazenamento (ou um threshold configurável), o documento **mais antigo** (por data de último acesso) deve ser removido automaticamente para abrir espaço para o mais recente.
   - A remoção deve ser transparente para o usuário, sem dialogs de confirmação.
   - Documentos removidos do cache local permanecem acessíveis na nuvem (se sincronizados).

4. **Aplicabilidade Universal (Todos os Formatos e Origens):**
   - As regras acima se aplicam a TODOS os formatos suportados: `.pdf`, `.txt`, `.md`, `.docx`, `.epub`, `.odt`, `.pptx`, web articles (URL), quick paste (copy-paste).
   - Não há exceção por tipo de adapter ou origem do documento.

---

## 2. Sincronização Paralela Local + Cloud

1. **Dual-Write (IndexedDB + Google Drive):**
   - Ao salvar um documento, ele deve ser persistido no IndexedDB (para offline) E enviado para o Google Drive (para backup/sync) em paralelo, caso o usuário esteja conectado à nuvem.
   - A operação local (IndexedDB) tem prioridade e não deve bloquear aguardando a resposta da nuvem.
   - Falhas na sincronização com a nuvem devem ser tratadas silenciosamente (retry em background), sem impactar a experiência offline.

2. **Cloud-Only para Áudios:**
   - Áudios TTS são sincronizados exclusivamente via Google Drive (upload resumível).
   - Não há cache local de áudio — se o usuário estiver offline, a funcionalidade TTS fica indisponível para documentos cujo áudio não foi pré-gerado na sessão atual.

---

## 3. Sincronização da API Key (BYOK) com Google Drive

1. **API Key Incluída no Manifesto de Sync:**
   - A `userApiKey` (chave de IA do usuário) DEVE ser incluída no manifesto de sincronização (`vivavoz_manifest.json`) em toda operação de backup com a nuvem.
   - Quando o usuário insere ou atualiza a API Key, ela deve ser enviada para o Google Drive na próxima sincronização.

2. **Remoção Sincronizada:**
   - Quando o usuário remove a API Key localmente, a remoção DEVE ser propagada para o Google Drive (campo removido ou zerado no manifesto).

3. **Restauração Cross-Device via Cookie Server-Side:**
   - Ao restaurar dados do Google Drive em um novo dispositivo, se o manifesto contiver uma `userApiKey`, ela deve ser restaurada utilizando o fluxo existente de cookie server-side (mesmo mecanismo usado quando o usuário insere a chave manualmente).
   - A API Key é transmitida do BFF para o cookie `HttpOnly` seguro, nunca exposta diretamente no client-side JavaScript.

4. **Obrigatoriedade em Toda Sincronização:**
   - Toda operação de sync (backup/restore) DEVE garantir que o estado atual da API Key (presente ou ausente) seja refletido no manifesto enviado/recebido.
