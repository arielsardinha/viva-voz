# Diretrizes de Tratamento de Erros e Observabilidade: BFF vs Client

## 1. Princípios Inegociáveis

1. **Zero Exposição de Erros Técnicos na UI:**
   - É estritamente proibido exibir mensagens de erro brutas (raw errors), JSONs de provedores externos, códigos HTTP crus (403, 500), URLs de endpoints internos ou stack traces para o usuário final.
   - A interface do usuário deve sempre exibir mensagens sanitizadas, em Português do Brasil, com tom acolhedor e instrutivo.

2. **Logging Estruturado no Servidor (BFF / Route Handlers):**
   - Todos os erros ocorridos em Route Handlers (`/api/*`), Server Actions e camadas de integração com APIs externas (Google Cloud, Gemini, Firebase, Google Drive) DEVEM registrar `console.error(...)` no servidor com detalhes suficientes para diagnóstico (endpoint, timestamp, código de erro upstream e mensagem original).

3. **Tratamento de Erros Conhecidos vs Desconhecidos no Client:**
   - **Erros Conhecidos (Mapeados):** Fornecer feedback orientado à ação do usuário (ex: "Chave do Gemini inválida ou não configurada", "Arquivo não suportado", "Limite de requisições atingido. Tente novamente em alguns instantes").
   - **Erros Desconhecidos (Não Mapeados / 500 Genérico):** Retornar mensagem padrão amigável:
     > *"Não foi possível processar sua solicitação no momento. Já registramos este evento para análise e correção. Por favor, tente novamente em instantes."*

4. **Sanitização Obrigatória em Hooks de IA e Streaming:**
   - Hooks de comunicação de IA (`useFirebaseAI`, handlers de chat) devem encapsular blocos `try/catch` garantindo que falhas de streaming ou inicialização de modelos não injetem mensagens do SDK bruto na lista de mensagens do chat.
