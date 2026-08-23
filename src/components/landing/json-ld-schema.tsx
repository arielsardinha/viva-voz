export function JsonLdSchema() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://vivavoz.com/#software",
        "name": "VivaVoz",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Any / Web PWA",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "BRL",
        },
        "description":
          "Leitor de texto em áudio neural sincronizado em tempo real com suporte a múltiplos formatos (PDF, EPUB, DOCX, Web) e assistente de IA Gemini.",
        "url": "https://vivavoz.com",
      },
      {
        "@type": "Organization",
        "@id": "https://vivavoz.com/#organization",
        "name": "VivaVoz Open Source",
        "url": "https://vivavoz.com",
        "logo": "https://vivavoz.com/icon.svg",
        "sameAs": ["https://github.com/arielsardinha/viva-voz"],
      },
      {
        "@type": "WebPage",
        "@id": "https://vivavoz.com/#webpage",
        "url": "https://vivavoz.com",
        "name": "VivaVoz — Leitor de Texto em Áudio & Narração Inteligente",
        "inLanguage": "pt-BR",
        "description":
          "Landing page oficial do VivaVoz: transforme documentos e livros em áudio fluido com inteligência contextual e sincronismo de sentenças.",
        "isPartOf": {
          "@id": "https://vivavoz.com/#software",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
