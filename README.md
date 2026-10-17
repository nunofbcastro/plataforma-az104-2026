# AZ-104 2026

Plataforma de estudo em React, Vite e Tailwind CSS 4, publicada em `https://nunofbcastro.github.io/plataforma-az104-2026/` pela branch `gh-pages`.

## Executar localmente

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Para gerar a versão de produção: `npm run build` (inclui `npm run check:questions`, que verifica se nenhum termo técnico foi traduzido). Cada push para `main` publica automaticamente no GitHub Pages.

## Questões

O conteúdo está em português do Brasil, o idioma em que o exame AZ-104 é aplicado em português, com a versão original em inglês disponível em cada questão.

- `public/data/questions.json`: as 657 questões importadas da pasta de origem. As imagens de cada simulado ficam em `public/assets/form_N/`, para que arquivos com o mesmo nome em simulados diferentes não se sobreponham.
- `src/data/authored-questions.json` e `src/data/authored/*.json`: 126 questões autorais (80 por domínio e 40 de leitura de código: ARM/Bicep, JSON de Policy e RBAC, Azure CLI/PowerShell, KQL e JSON de armazenamento), com dificuldade, tema, explicação de cada opção e link para a documentação do Microsoft Learn. Qualquer novo arquivo JSON em `src/data/authored/` é carregado automaticamente.

Em outubro de 2026 todo o banco foi revisado contra a documentação atual do Microsoft Learn e o [guia de estudo oficial do AZ-104](https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-104): gabaritos, explicações, termos técnicos traduzidos por engano, nomes atuais dos serviços (por exemplo, Microsoft Entra ID) e recursos desativados (Basic Load Balancer, IP público Basic, contas BlobStorage e GPv1, NSG flow logs, Docker Content Trust, ASE v1/v2, Application Gateway v1, entre outros). Questões cuja resposta depende de um recurso desativado e não podem ser reescritas sem contradizer a imagem ficam marcadas com `"obsoleta": true` e não aparecem na plataforma.

As referências à documentação não significam que questões de terceiros tenham sido copiadas. O banco de questões preexistente foi mantido como conteúdo fornecido pelo usuário.
