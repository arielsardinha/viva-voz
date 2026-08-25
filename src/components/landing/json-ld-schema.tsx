export function JsonLdSchema() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://www.viva-voz.com/#software',
        name: 'VivaVoz',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any / Web PWA',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL',
        },
        description:
          'Leitor de texto em áudio neural sincronizado em tempo real com suporte a múltiplos formatos (PDF, EPUB, DOCX, Web) e assistente de IA Gemini.',
        url: 'https://www.viva-voz.com',
      },
      {
        '@type': 'Organization',
        '@id': 'https://www.viva-voz.com/#organization',
        name: 'VivaVoz Open Source',
        url: 'https://www.viva-voz.com',
        logo: 'https://www.viva-voz.com/icon.svg',
        sameAs: ['https://github.com/arielsardinha/viva-voz'],
      },
      {
        '@type': 'WebPage',
        '@id': 'https://www.viva-voz.com/#webpage',
        url: 'https://www.viva-voz.com',
        name: 'VivaVoz — Leitor de Texto em Áudio & Narração Inteligente',
        inLanguage: 'pt-BR',
        description:
          'Landing page oficial do VivaVoz: transforme documentos e livros em áudio fluido com inteligência contextual e sincronismo de sentenças.',
        isPartOf: {
          '@id': 'https://www.viva-voz.com/#software',
        },
        audio: [
          {
            '@type': 'AudioObject',
            '@id': 'https://www.viva-voz.com/#demo-audio-1',
            name: 'Demonstração Interativa VivaVoz - Parte 1',
            contentUrl: 'https://www.viva-voz.com/audio/01.mp3',
            encodingFormat: 'audio/mpeg',
            description:
              'Apresentação da plataforma aberta para audição inteligente de documentos e livros digitais.',
            transcript:
              'VivaVoz é uma plataforma aberta para audição inteligente de documentos e livros digitais.',
          },
          {
            '@type': 'AudioObject',
            '@id': 'https://www.viva-voz.com/#demo-audio-2',
            name: 'Demonstração Interativa VivaVoz - Parte 2',
            contentUrl: 'https://www.viva-voz.com/audio/02.mp3',
            encodingFormat: 'audio/mpeg',
            description:
              'Sincronização visual em tempo real com voz neural de alta fidelidade.',
            transcript:
              'Cada frase é sincronizada visualmente na tela enquanto a voz neural pronuncia cada termo com clareza.',
          },
          {
            '@type': 'AudioObject',
            '@id': 'https://www.viva-voz.com/#demo-audio-3',
            name: 'Demonstração Interativa VivaVoz - Parte 3',
            contentUrl: 'https://www.viva-voz.com/audio/03.mp3',
            encodingFormat: 'audio/mpeg',
            description:
              'Ajustes de velocidade, alternância de temas e integração com o assistente Gemini.',
            transcript:
              'Você pode ajustar a velocidade de reprodução, alternar entre temas tipográficos e tirar dúvidas com o Gemini.',
          },
          {
            '@type': 'AudioObject',
            '@id': 'https://www.viva-voz.com/#demo-audio-4',
            name: 'Demonstração Interativa VivaVoz - Parte 4',
            contentUrl: 'https://www.viva-voz.com/audio/04.mp3',
            encodingFormat: 'audio/mpeg',
            description:
              'Privacidade local no navegador e persistência segura no Google Drive.',
            transcript:
              'Tudo funciona com privacidade absoluta: seus dados são seus e armazenados com segurança no navegador e no Google Drive.',
          },
        ],
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
