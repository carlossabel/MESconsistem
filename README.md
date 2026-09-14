# Levantamento Inicial – Indústria 4.0 Consistem

Questionário guiado (formato entrevista técnica, em etapas) para o levantamento
inicial de projetos de Indústria 4.0. Tem **perguntas condicionais**, campos de
seleção e múltipla escolha, e ao final **gera automaticamente** o
*Diagnóstico Inicial – Indústria 4.0 Consistem*, com a classificação preliminar
de complexidade (Baixa / Média / Alta).

- Questionário público: `/`
- Painel com os diagnósticos: `/admin` (usuário e senha)
- Exportar tudo em CSV: `/admin/export.csv`

O cliente, ao finalizar, vê um **resumo dos dados informados**. A classificação
de complexidade e os *pontos técnicos a validar* aparecem **somente no painel
`/admin`**, para uso da equipe Consistem.

---

## 1. Editar o questionário

Todas as etapas, perguntas, condicionais e a lógica do diagnóstico estão em
**`questionnaire.js`** — o único arquivo que você precisa mexer. Ele roda tanto
no navegador quanto no servidor, então o formulário, o diagnóstico e o CSV ficam
sempre em sincronia. As instruções de como montar cada pergunta estão comentadas
no topo do arquivo.

Para adicionar uma pergunta condicional, use `showIf`:

```js
{ id: "clp_fabricante", label: "Fabricante do CLP", type: "text",
  showIf: (r) => r.clp === "Sim" || r.clp === "Algumas" }
```

---

## 2. Subir no GitHub

```bash
git init
git add .
git commit -m "Levantamento Indústria 4.0"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

O `.gitignore` já evita subir `node_modules` e o `.env`.

---

## 3. Publicar no Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
   e escolha o repositório.
2. No projeto: **New → Database → Add PostgreSQL**. Isso cria a variável
   `DATABASE_URL` automaticamente.
3. No serviço do app → aba **Variables**, adicione:
   - `ADMIN_USER` (ex.: `admin`)
   - `ADMIN_PASSWORD` (uma senha forte — sem ela o `/admin` não abre)
4. Em **Settings → Networking → Generate Domain**, gere a URL pública.
5. Pronto: envie a URL ao cliente e acesse `SUA-URL/admin` para ver os
   diagnósticos.

A tabela do banco é criada sozinha no primeiro acesso.

---

## 3.1. Notificação por e-mail (Arthur e Carlos)

Quando um cliente envia o levantamento, o app manda um e-mail com assunto
**“MES Consistem – [nome do cliente]”** e o diagnóstico no corpo, com link direto
para o painel. Os destinatários padrão já são
`arthur.diefenthaler@consistem.com.br` e `carlos@consistem.com.br`.

Para ligar isso, defina as variáveis SMTP no serviço do app. Usando o Google
Workspace da Consistem:

1. Em uma conta de envio (ex.: `notificacoes@consistem.com.br`), com verificação
   em duas etapas ativada, gere uma **senha de app** em
   *Conta Google → Segurança → Senhas de app*.
2. No Railway, no serviço do app → **Variables**, defina:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_SECURE` = `false`
   - `SMTP_USER` = a conta de envio
   - `SMTP_PASS` = a senha de app gerada
   - `MAIL_FROM` = a conta de envio
   - `MAIL_TO` = (opcional) para mudar/adicionar destinatários
3. Redeploy.

## 3.2. Fotos e vídeos das máquinas

A última etapa do questionário deixa o cliente enviar fotos e vídeos das
máquinas, painéis e etiquetas (arrastar-e-soltar ou tocar para escolher). Os
arquivos ficam guardados no próprio PostgreSQL (nada de serviço externo), com
preview e download no painel, e são anexados ao e-mail de notificação (até
~18 MB por e-mail; o restante fica sempre disponível no painel).

Limites: até **25 MB por arquivo** e **12 arquivos** por envio. Para vídeos
grandes, há um campo opcional de **links** (Google Drive, YouTube, etc.).

---

## 4. Rodar localmente (opcional)

Precisa de um PostgreSQL local.

```bash
npm install
cp .env.example .env    # edite os valores
node server.js
```

Acesse `http://localhost:3000`.

---

## Variáveis de ambiente

| Variável         | Para que serve                                          |
|------------------|---------------------------------------------------------|
| `DATABASE_URL`   | Conexão com o Postgres (criada pelo Railway).           |
| `ADMIN_USER`     | Usuário do painel `/admin` (padrão: `admin`).           |
| `ADMIN_PASSWORD` | Senha do painel `/admin` (**obrigatória**).             |
| `PGSSL`          | `true` só se usar a URL pública/externa do Postgres.    |
| `PORT`           | Porta do servidor (o Railway define automaticamente).   |
| `SMTP_HOST`      | Servidor SMTP de envio (ex.: `smtp.gmail.com`).         |
| `SMTP_PORT`      | Porta SMTP (`587` STARTTLS ou `465` SSL).               |
| `SMTP_SECURE`    | `true` apenas na porta 465.                             |
| `SMTP_USER`      | Conta de envio.                                         |
| `SMTP_PASS`      | Senha de app da conta de envio.                         |
| `MAIL_FROM`      | Remetente exibido (padrão: `SMTP_USER`).                |
| `MAIL_TO`        | Destinatários (padrão: Arthur e Carlos).                |

---

## Como as respostas são guardadas

Cada envio vira uma linha na tabela `levantamentos`, com todas as respostas num
campo `JSONB` e o nível de complexidade calculado. O diagnóstico completo é
remontado a partir dessas respostas quando você abre o levantamento no `/admin`,
então adicionar ou remover perguntas em `questionnaire.js` nunca quebra o banco.
