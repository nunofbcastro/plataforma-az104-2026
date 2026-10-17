# AZ-104 2026

Plataforma de estudo em React, Vite e Tailwind CSS 4, publicada em `https://nunofbcastro.github.io/plataforma-az104-2026/` através da branch `gh-pages`.

## Executar localmente

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Para criar a versão de produção: `npm run build`. Para publicar a versão compilada na branch `gh-pages`: `npm run deploy` (requer acesso de escrita ao repositório GitHub).

## Perguntas

O banco importado contém as 657 perguntas existentes na pasta de origem e os respetivos recursos de imagem utilizados. Foram acrescentadas 86 perguntas autorais (6 em `src/data/authored-questions.json` e 80 em `src/data/authored/*.json`, uma por domínio), com dificuldade, tema, explicação de cada opção e referência à documentação pública da Microsoft Learn. Qualquer novo ficheiro JSON colocado em `src/data/authored/` é carregado automaticamente. As perguntas novas são baseadas nos objetivos publicados no [guia oficial AZ-104](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104), atualizado para competências medidas desde 17 de abril de 2026.

Em outubro de 2026 todo o banco foi revisto contra a documentação atual da Microsoft Learn: chaves de resposta, explicações, termos técnicos traduzidos por engano (nomes de recursos, funções, SKUs, propriedades JSON/Bicep) e funcionalidades descontinuadas (por exemplo, Basic Load Balancer e IP público Basic). As imagens de cada simulado ficam em `public/assets/form_N/`, para que ficheiros com o mesmo nome em simulados diferentes não se sobreponham.

As referências a documentação e outros materiais não significam que perguntas de terceiros tenham sido copiadas ou importadas. O banco de perguntas preexistente foi mantido como conteúdo fornecido pelo utilizador.
