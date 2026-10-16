# Casa

App web para organizar a casa de um casal: contas bancárias, movimentações,
contas fixas do mês, importação de extrato e um quadro de tarefas. Funciona
no celular, no tablet e no PC, e pode ser instalado na tela inicial (PWA).

## O que tem

- **Início**: as contas fixas do mês como ladrilhos (toque para marcar como
  pago), entradas e saídas dos últimos 6 meses, gastos por categoria,
  evolução do saldo, saldo de cada pessoa e próximas tarefas. Filtro
  `Casa | pessoa` e navegação por mês.
- **Finanças**
  - Contas e cofrinhos de cada pessoa, com saldo, meta e "Ajustar saldo"
    (a diferença entra como ajuste e não conta como gasto).
  - Movimentações do mês, com as contas fixas ainda não pagas no meio da lista.
  - Contas fixas: valor, dia de vencimento, primeiro e último mês.
  - Importar extrato do Mercado Pago (CSV ou Excel), com revisão linha a
    linha, sugestão de categoria, proteção contra duplicadas e "Desfazer".
  - Categorias com palavras-chave para a sugestão automática.
- **Tarefas**: listas e tarefas com adicionar, editar, apagar e mover
  (arrastando pela alça ou pelo menu "Mover para").
- **Configurações**: tema claro/escuro, nome e cor de cada pessoa, convite.
- **/componentes**: vitrine com todos os componentes, nos dois temas.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui (Radix) ·
Supabase (Postgres, Auth com e-mail e senha, RLS) · Recharts (via shadcn Chart) ·
TanStack Table · Dice UI Kanban (dnd-kit) · Vitest.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # e preencha os valores
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (saldos, contas fixas, importação, posições) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:push` | Aplica as migrações em `supabase/migrations` |
| `npm run db:types` | Regenera `lib/database.types.ts` a partir do banco |

## Configuração (uma vez)

### 1. Supabase

1. Em **Project Settings → API Keys**, copie a URL do projeto e a
   **publishable key** para `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Aplique as migrações (se ainda não aplicou):
   `npx supabase db push --db-url "postgresql://postgres.<ref>:<senha>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"`

### 2. Login com e-mail e senha

O login por e-mail já vem ligado no Supabase. Falta decidir sobre a
confirmação de e-mail:

- **Recomendado para uso a dois: desligar a confirmação.** Em
  **Authentication → Sign In / Providers → Email**, desmarque **Confirm email**.
  O cadastro já entra direto no app. O serviço de e-mail embutido do plano
  gratuito só entrega para membros da equipe do projeto e tem limite de poucos
  e-mails por hora, então a confirmação costuma travar o cadastro de quem não é
  da equipe.
- **Se quiser manter a confirmação** (e o "Esqueci minha senha" funcionando para
  qualquer e-mail), configure um SMTP próprio em
  **Authentication → Emails → SMTP Settings** (ex.: Resend, que tem plano gratuito).

Os links enviados por e-mail (confirmação e nova senha) voltam para o app. Em
**Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (depois, o endereço da Vercel)
- Redirect URLs: `http://localhost:3000/auth/callback` e, depois,
  `https://casa-xyz.vercel.app/auth/callback`

### 3. Vercel

1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A senha do banco não vai para a Vercel.

### 4. Primeiro uso

1. Uma pessoa cria a conta (aba **Criar conta**) e escolhe **Criar a casa**.
2. Em **Configurações**, copia o código de convite.
3. A outra pessoa cria a própria conta, escolhe **Tenho um convite** e digita o código.

Esqueceu a senha? **Esqueci minha senha** na tela de login manda um link por
e-mail. Para trocar a senha estando logado, use **Trocar senha** no menu do usuário.

No Android, abra o app no Chrome e use **Instalar app** (ou "Adicionar à tela inicial").

## Como funciona

- **Acesso**: tudo pertence a uma casa. A RLS do banco deixa cada membro ler e
  editar só a própria casa; o filtro por pessoa é só visual. Usuários sem
  login (`anon`) não têm permissão em nenhuma tabela.
- **Contas fixas** não viram lançamentos com antecedência: cada mês é calculado
  juntando as contas fixas ativas com os pagamentos daquele mês
  (`lib/finance/recurring.ts`). Um índice único impede pagar duas vezes no mês.
- **Saldo** = saldo inicial + todos os lançamentos (view `account_balances`).
  Transferências e ajustes mudam o saldo, mas não contam como ganho ou gasto.
- **Importação**: o arquivo é lido no navegador; só as linhas confirmadas vão
  para o banco. Cada linha guarda o ID da operação do Mercado Pago
  (`external_id`), então importar o mesmo extrato de novo não duplica nada.
  Outros bancos entram como um novo parser em `lib/import/`.

## Estrutura

```
app/(app)/            telas logadas (Início, finanças, tarefas, configurações, componentes)
app/login, bem-vindo  login e criação/entrada na casa
components/ui/        componentes do shadcn e do Dice UI (gerados; não editar à mão)
components/…          componentes do app (finanças, formulários, shell, marca)
lib/actions/          Server Actions (gravam no Supabase)
lib/data/             leituras no servidor
lib/finance, import   regras puras, cobertas por testes
lib/nav.ts            itens do menu lateral (um módulo novo = uma entrada)
supabase/migrations/  esquema, RLS e permissões
```

## Tema

As cores ficam em `app/globals.css` (tokens do shadcn). O visual é de app de
banco: fundo cinza-azulado, cartões brancos bem arredondados, faixa azul-celeste
no topo do Início com o saldo (e o olho para esconder os valores), atalhos
redondos coloridos e categorias com ícone e cor próprios (editáveis em
Categorias). No celular a navegação é pela barra inferior, com o botão + para
adicionar qualquer coisa; no PC, pelo menu lateral. Os azuis com texto branco
passam no contraste AA, e as cores dos gráficos foram validadas para daltonismo
nos dois temas.
