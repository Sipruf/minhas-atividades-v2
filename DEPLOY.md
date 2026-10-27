# Publicação no GitHub Pages

Guia para publicar o **Minhas atividades** no GitHub Pages usando uma **conta pessoal** do GitHub.

A publicação é automática: a cada envio (push) para a branch `main`, o workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) instala as dependências, **roda os
testes**, gera o build e publica a pasta `dist`. Se algum teste falhar, nada é publicado.

---

## Antes de começar

- **Node.js 20.19 ou mais novo** instalado (confira com `node -v`).
- **Git** instalado (confira com `git --version`).
- Uma **conta pessoal** no GitHub.

> **Atenção**
>
> - **No plano gratuito, o GitHub Pages só funciona em repositório público.** Tudo o que for
>   enviado ficará visível. A pasta `referencia/` já está no `.gitignore` e não é enviada; para
>   deixar mais algo de fora, acrescente ao `.gitignore` antes do primeiro commit.
> - **Os dados não vão junto.** Eles ficam no navegador, separados por endereço. O que foi
>   registrado em `localhost` não aparece no site publicado. Para levar os dados, use
>   **Dados → Exportar backup** no ambiente local e **Dados → Importar backup** no site.

---

## Primeira publicação

Substitua `SEU_USUARIO`, `SEU NOME` e `SEU_ID` pelos dados da sua conta pessoal.

### 1. Criar o repositório

Logado na **conta pessoal**, crie um repositório **público e vazio** (sem README, sem
`.gitignore`), por exemplo `minhas-atividades-v2`.

### 2. Ativar o Pages

No repositório: **Settings → Pages → Build and deployment → Source** e escolha
**"GitHub Actions"**.

### 3. Conferir localmente

Na pasta do projeto:

```
npm install
npm test
npm run build
```

Os três precisam terminar sem erro. O `npm install` também acerta o `package-lock.json` com a
versão atual do `package.json`.

### 4. Preparar o git com a identidade pessoal

Use `git config` **sem `--global`**: a configuração vale só para esta pasta e evita que os commits
saiam com o e-mail de outra conta (por exemplo, a da empresa).

O e-mail `noreply` aparece em **Settings → Emails** da conta pessoal, no formato
`SEU_ID+SEU_USUARIO@users.noreply.github.com`.

```
git init -b main
git config user.name "SEU NOME"
git config user.email "SEU_ID+SEU_USUARIO@users.noreply.github.com"
git add .
git commit -m "Minhas atividades v2.1.0"
```

### 5. Enviar para a conta pessoal

O usuário no início do endereço (`SEU_USUARIO@github.com`) faz o Windows pedir login **dessa**
conta, em vez de reaproveitar outra já salva.

```
git remote add origin https://SEU_USUARIO@github.com/SEU_USUARIO/minhas-atividades-v2.git
git push -u origin main
```

Se abrir o navegador para autorizar, confira que está logado na **conta pessoal** antes de
aceitar.

### 6. Acompanhar e acessar

A publicação aparece na aba **Actions** do repositório. Quando terminar (ícone verde), o app fica
em:

```
https://SEU_USUARIO.github.io/minhas-atividades-v2/
```

---

## Próximas publicações

Depois de alterar o projeto:

```
npm test
git add .
git commit -m "Descrição da mudança"
git push
```

O push dispara a publicação automaticamente. Para publicar sem alterar nada, use
**Actions → Deploy no GitHub Pages → Run workflow**.

Ao lançar uma nova versão, atualize o campo `"version"` no `package.json`. É ele que aparece ao
lado do título no app.

---

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Falha na etapa **"Configurar o Pages"** | O Pages não está ativado. Faça o passo 2 e use **Run workflow** na aba Actions. |
| Falha na etapa **"Rodar os testes"** | Rode `npm test` localmente, corrija e envie de novo. Nada foi publicado. |
| Falha na etapa **"Instalar dependências"** (`npm ci`) | O `package-lock.json` está desatualizado. Rode `npm install`, faça commit do `package-lock.json` e envie de novo. |
| O push foi para a conta errada ou deu "permission denied" | Abra o **Gerenciador de Credenciais do Windows → Credenciais do Windows**, remova as entradas `git:https://github.com` e repita o passo 5. Confira também o endereço com `git remote -v`. |
| Os commits aparecem com o e-mail errado | Confira com `git config user.email` dentro da pasta do projeto e repita o passo 4. |
| O site abre, mas sem os dados | É esperado: os dados ficam no navegador. Use **Exportar backup** e **Importar backup** (veja "Antes de começar"). |
| A versão nova não aparece | Recarregue a página com **Ctrl+F5** para ignorar o cache. |
