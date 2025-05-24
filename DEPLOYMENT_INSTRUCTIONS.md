# Instruções de Implantação

## Implantando Seu Aplicativo Vite/React

Aqui estão os passos para implantar seu aplicativo Vite/React:

1.  **Construa o Aplicativo**:
    Execute o comando `npm run build` para criar uma versão de produção otimizada do seu aplicativo. Isso irá gerar uma pasta `dist` contendo os artefatos de construção.

2.  **Escolha um Provedor de Hospedagem**:
    Selecione uma plataforma de hospedagem. Algumas opções populares incluem:
    *   **Netlify**: Fácil de usar com implantações automáticas de repositórios Git.
    *   **Vercel**: Otimizado para Next.js, mas funciona bem com qualquer aplicativo web moderno.
    *   **GitHub Pages**: Hospedagem gratuita diretamente do seu repositório GitHub.

3.  **Implante a Construção**:

    ### Implantando no Netlify:

    1.  Inscreva-se para uma conta Netlify em [https://www.netlify.com/](https://www.netlify.com/).
    2.  Instale o Netlify CLI: `npm install -g netlify-cli`
    3.  Faça login no Netlify: `netlify login`
    4.  Implante sua pasta `dist`: `netlify deploy --prod`

    ### Implantando no Vercel:

    1.  Inscreva-se para uma conta Vercel em [https://vercel.com/](https://vercel.com/).
    2.  Instale o Vercel CLI: `npm install -g vercel`
    3.  Faça login no Vercel: `vercel login`
    4.  Implante sua pasta `dist`: `vercel deploy --prod`

    ### Implantando no GitHub Pages:

    1.  Certifique-se de que seu projeto está em um repositório GitHub.
    2.  Instale o pacote `gh-pages`: `npm install gh-pages --save-dev`
    3.  Adicione um script de implantação ao seu `package.json`:
        ```json
        "scripts": {
          "deploy": "gh-pages -d dist"
        }
        ```
    4.  Implante no GitHub Pages: `npm run deploy`

## Pós-Implantação

*   **Netlify e Vercel**: Seu site estará online imediatamente após a implantação.
*   **GitHub Pages**: Pode levar alguns minutos para seu site ficar online. Verifique as configurações do seu repositório em "Pages" para encontrar o URL.
