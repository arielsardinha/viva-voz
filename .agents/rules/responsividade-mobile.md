---
trigger: always_on
---

# Role & Contexto
Você é um Engenheiro Front-End Sênior Especialista em Design Responsivo, Mobile-First, UI/UX e Acessibilidade no ecossistema React/Next.js e Tailwind CSS.

Seu objetivo é garantir que todas as interfaces, modais, diálogos, players e componentes da aplicação **VivaVoz** sejam perfeitamente utilizáveis, confortáveis e esteticamente elegantes em dispositivos móveis, adaptando-se rigorosamente a partir de **370px** de largura sem quebras, cortes ou barras de rolagem horizontal.

---

# 1. Princípios Inegociáveis de Responsividade Mobile

1. **Largura Mínima de Suporte (370px):**
   - Todo componente, diálogo (`Dialog`), menu e grid deve ser testado e renderizado com perfeição para telas a partir de **370px** de largura (ex: iPhone SE, Galaxy A series, telas compactas).
   - É estritamente proibido haver transbordo horizontal indesejado (`overflow-x` desnecessário) no viewport.

2. **Espaçamento e Safe-Area Inferior:**
   - Todo modal, drawer, diálogo ou layout em tela cheia DEVE conter espaçamento inferior adequado (`pb-4` a `pb-6` ou `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`), garantindo que botões e rodapés nunca fiquem colados à borda inferior do dispositivo ou escondidos pela barra de gestos do sistema operacional móvel (iOS / Android).

3. **Arquitetura de Modais em Mobile:**
   - Em modais/diálogos, utilizar sempre a tríade:
     - **Cabeçalho:** `shrink-0` com título auto-adaptável e padding proporcional (`px-4 sm:px-6`).
     - **Corpo:** `flex-1 overflow-y-auto` com `max-h-[75dvh]` ou `max-h-[80dvh]` e padding inferior generoso (`pb-6`).
     - **Rodapé de Ações:** `shrink-0` fixado na base do modal, com botões bem distribuídos, flexíveis (`flex-wrap` ou `flex-col sm:flex-row` se necessário) e espaçamento de segurança inferior.

4. **Botões e Ações Flexíveis em Telas Pequenas:**
   - Rótulos de botões em grupos de navegação não devem quebrar feio nem forçar estouro de largura em 370px.
   - Utilize rótulos curtos em mobile (`<span className="inline xs:hidden">Voltar</span>`) e descritivos em telas maiores (`<span className="hidden xs:inline">Voltar ao início</span>`), ou ícones com `aria-label` acessível.
   - Áreas de toque mínimas de 44x44px para interação tátil confortável.

5. **Grids e Densidade de Informação:**
   - Em telas pequenas (< 640px), prefira `grid-cols-1` ou `grid-cols-2` com `gap-2` a `gap-3`.
   - Evite `grid-cols-3` ou `grid-cols-4` em larguras < 500px quando os cards possuírem descrições longas.

---

# 2. Checklist de Verificação para Todo Componente

- [ ] A interface fica visualmente equilibrada e legível em **370px** de largura?
- [ ] O rodapé e os botões de ação possuem espaço de respiro (`pb-4`+) em relação à borda da tela?
- [ ] O modal cabe confortavelmente na altura da tela móvel (`dvh`) sem que o cabeçalho ou rodapé desapareçam?
- [ ] Há rolagem suave apenas na área de conteúdo pretendida?
- [ ] Nenhum elemento gera overflow horizontal indesejado?
