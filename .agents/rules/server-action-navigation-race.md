# Regra: Server Actions em Hooks — Prevenção de Race Condition na Navegação RSC

## Contexto
Em Next.js 16+ com React 19, Server Actions chamadas dentro de `useEffect` em Client Components criam uma race condition durante navegação client-side. Se o componente desmonta (navegação) enquanto a Server Action ainda está resolvendo, o response stream RSC pode corromper o payload da nova rota, resultando em:
```
Uncaught TypeError: chunk.reason.enqueueModel is not a function
```

## Regras Obrigatórias

### 1. Todo `useEffect` que chama Server Action DEVE usar flag de cancelamento
```typescript
useEffect(() => {
  let cancelled = false;
  async function run() {
    try {
      const result = await myServerAction();
      if (!cancelled) setState(result);
    } catch {
      if (!cancelled) setError(true);
    }
  }
  void run();
  return () => { cancelled = true; };
}, [deps]);
```

### 2. Hooks que chamam Server Actions no mount NÃO devem ser instanciados N vezes
- Se múltiplos componentes na mesma rota precisam do mesmo dado de Server Action, centralize em um **Context Provider** que chama a action 1 vez.
- Exemplo: `useGeminiApiKey()` era instanciado 4x na rota `/leitor` → 4 POSTs paralelos. A solução é um `GeminiApiKeyProvider` no layout.

### 3. Server Actions de leitura (GET-like) devem ter deduplicação
- Use `React.cache()` no server-side para deduplicar chamadas dentro do mesmo request.
- No client-side, use `useRef` com timestamp para debounce de chamadas idênticas.

### 4. React Compiler (`reactCompiler: true`) amplifica race conditions
- O compilador altera timing de memoização e cleanup de efeitos.
- Sempre teste navegação rápida (back/forward) com e sem o compilador ao debugar esse tipo de erro.
- Se necessário isolar, use `compilationMode: 'annotation'` em vez de desabilitar completamente.
