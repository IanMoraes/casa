-- Esquema inicial: casa, membros, finanças e tarefas.
--
-- Modelo de acesso: tudo pertence a uma casa (household). Os membros da casa
-- leem e editam tudo dela; o "por pessoa" é um filtro pelo dono, não uma
-- restrição de acesso. Cada usuário pertence a no máximo uma casa.

-- ---------------------------------------------------------------------------
-- Casa e membros
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nossa casa' check (char_length(name) between 1 and 80),
  invite_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  color text not null default '#1F4FA3' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  avatar_url text,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

-- Funções internas ficam num schema não exposto pela API.
create schema if not exists private;
grant usage on schema private to authenticated;

-- Casa do usuário logado. SECURITY DEFINER para ler household_members sem
-- recursão de RLS; só devolve a casa de auth.uid().
create function private.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.household_id
  from public.household_members m
  where m.user_id = (select auth.uid())
$$;

revoke all on function private.my_household_id() from public, anon;
grant execute on function private.my_household_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Finanças
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  owner_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  bank text,
  kind text not null default 'corrente'
    check (kind in ('corrente', 'poupanca', 'cofrinho', 'carteira', 'investimento')),
  initial_balance numeric(14, 2) not null default 0,
  goal_amount numeric(14, 2) check (goal_amount is null or goal_amount > 0),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (household_id, owner_id)
    references public.household_members (household_id, user_id) on delete cascade
);

create index accounts_household_idx on public.accounts (household_id);
create index accounts_owner_idx on public.accounts (household_id, owner_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('entrada', 'saida')),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Palavras usadas para sugerir a categoria na importação de extratos.
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (household_id, kind, name)
);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 80),
  kind text not null default 'saida' check (kind in ('entrada', 'saida')),
  amount numeric(14, 2) not null check (amount > 0),
  due_day smallint not null check (due_day between 1 and 31),
  owner_id uuid not null,
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  -- Sempre o primeiro dia do mês.
  start_month date not null check (extract(day from start_month) = 1),
  end_month date check (end_month is null or (extract(day from end_month) = 1 and end_month >= start_month)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (household_id, owner_id)
    references public.household_members (household_id, user_id) on delete cascade
);

create index recurring_bills_household_idx on public.recurring_bills (household_id);
create index recurring_bills_account_idx on public.recurring_bills (account_id);
create index recurring_bills_category_idx on public.recurring_bills (category_id);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  source text not null,
  file_name text not null,
  row_count integer not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index import_batches_household_idx on public.import_batches (household_id);
create index import_batches_account_idx on public.import_batches (account_id);

-- Valor com sinal: positivo aumenta o saldo da conta, negativo diminui.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null check (kind in ('entrada', 'saida', 'transferencia', 'ajuste')),
  amount numeric(14, 2) not null check (amount <> 0),
  occurred_on date not null,
  description text not null check (char_length(description) between 1 and 200),
  category_id uuid references public.categories (id) on delete set null,
  recurring_bill_id uuid references public.recurring_bills (id) on delete set null,
  reference_month date check (reference_month is null or extract(day from reference_month) = 1),
  import_batch_id uuid references public.import_batches (id) on delete cascade,
  external_id text,
  transfer_group uuid,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'entrada' and amount > 0)
    or (kind = 'saida' and amount < 0)
    or kind in ('transferencia', 'ajuste')
  ),
  check ((recurring_bill_id is null) = (reference_month is null)),
  -- Uma conta fixa só pode ser paga uma vez por mês.
  unique (recurring_bill_id, reference_month),
  -- A mesma linha de extrato não entra duas vezes na mesma conta.
  unique (account_id, external_id)
);

create index transactions_household_date_idx on public.transactions (household_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_import_batch_idx on public.transactions (import_batch_id);
create index transactions_transfer_group_idx on public.transactions (transfer_group);

-- Saldo de cada conta. security_invoker para respeitar a RLS de quem consulta.
create view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.household_id,
  a.owner_id,
  a.initial_balance + coalesce(sum(t.amount), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- ---------------------------------------------------------------------------
-- Tarefas
-- ---------------------------------------------------------------------------

create table public.lanes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  position double precision not null,
  created_at timestamptz not null default now()
);

create index lanes_household_idx on public.lanes (household_id, position);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  lane_id uuid not null references public.lanes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  position double precision not null,
  assignee_id uuid references auth.users (id) on delete set null,
  due_on date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_household_idx on public.tasks (household_id);
create index tasks_lane_idx on public.tasks (lane_id, position);
create index tasks_assignee_idx on public.tasks (assignee_id);

-- ---------------------------------------------------------------------------
-- RLS: membros da casa leem e editam tudo da própria casa.
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.import_batches enable row level security;
alter table public.transactions enable row level security;
alter table public.lanes enable row level security;
alter table public.tasks enable row level security;

create policy "membros veem a casa" on public.households
  for select to authenticated
  using (id = (select private.my_household_id()));

create policy "membros editam a casa" on public.households
  for update to authenticated
  using (id = (select private.my_household_id()))
  with check (id = (select private.my_household_id()));

create policy "membros veem os membros" on public.household_members
  for select to authenticated
  using (household_id = (select private.my_household_id()));

create policy "membros editam os membros" on public.household_members
  for update to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

-- Mesma política para todas as tabelas de conteúdo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'recurring_bills', 'import_batches',
    'transactions', 'lanes', 'tasks'
  ] loop
    execute format(
      'create policy "membros da casa" on public.%I
         for all to authenticated
         using (household_id = (select private.my_household_id()))
         with check (household_id = (select private.my_household_id()))',
      t
    );
  end loop;
end
$$;

-- Tabelas novas não são expostas à API automaticamente: liberar só para
-- usuários logados. Nada é liberado para anon.
grant select, update on public.households to authenticated;
grant select, update (display_name, color, avatar_url) on public.household_members to authenticated;
grant select, insert, update, delete on
  public.accounts, public.categories, public.recurring_bills,
  public.import_batches, public.transactions, public.lanes, public.tasks
  to authenticated;
grant select on public.account_balances to authenticated;

-- ---------------------------------------------------------------------------
-- Criar a casa e entrar nela
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER porque quem chama ainda não é membro (a RLS bloquearia).
-- Ambas exigem usuário logado e só agem sobre auth.uid().

create function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_household uuid;
begin
  if v_user is null then
    raise exception 'Faça login para criar a casa.';
  end if;
  if exists (select 1 from public.household_members where user_id = v_user) then
    raise exception 'Você já faz parte de uma casa.';
  end if;

  insert into public.households (name) values (coalesce(nullif(trim(p_name), ''), 'Nossa casa'))
  returning id into v_household;

  insert into public.household_members (household_id, user_id, display_name, color)
  values (v_household, v_user, trim(p_display_name), '#1F4FA3');

  insert into public.categories (household_id, name, kind, keywords) values
    (v_household, 'Salário', 'entrada', '{salario,salário,pagamento recebido,folha}'),
    (v_household, 'Pix recebido', 'entrada', '{pix recebid,transferência recebida,transferencia recebida}'),
    (v_household, 'Rendimentos', 'entrada', '{rendimento,rendimentos,juros}'),
    (v_household, 'Outras entradas', 'entrada', '{}'),
    (v_household, 'Moradia', 'saida', '{aluguel,condominio,condomínio,iptu}'),
    (v_household, 'Contas da casa', 'saida', '{luz,energia,enel,cemig,agua,água,sabesp,gas,gás,internet,vivo,claro,tim}'),
    (v_household, 'Mercado', 'saida', '{mercado,supermercado,atacad,assai,carrefour,pao de acucar}'),
    (v_household, 'Restaurantes e delivery', 'saida', '{ifood,restaurante,lanchonete,padaria,rappi}'),
    (v_household, 'Transporte', 'saida', '{uber,99,posto,combustivel,combustível,estacionamento}'),
    (v_household, 'Saúde', 'saida', '{farmacia,farmácia,drogaria,drogasil,raia,hospital,clinica}'),
    (v_household, 'Lazer', 'saida', '{netflix,spotify,cinema,ingresso}'),
    (v_household, 'Compras', 'saida', '{mercado livre,amazon,shopee,magalu}'),
    (v_household, 'Pix enviado', 'saida', '{pix enviad,transferência enviada,transferencia enviada}'),
    (v_household, 'Outras saídas', 'saida', '{}');

  insert into public.lanes (household_id, name, position) values
    (v_household, 'Recados', 1),
    (v_household, 'Compras', 2),
    (v_household, 'Cozinha', 3),
    (v_household, 'Projetos pessoais', 4);

  return v_household;
end
$$;

create function public.join_household(p_invite_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_household uuid;
begin
  if v_user is null then
    raise exception 'Faça login para entrar na casa.';
  end if;
  if exists (select 1 from public.household_members where user_id = v_user) then
    raise exception 'Você já faz parte de uma casa.';
  end if;

  select id into v_household
  from public.households
  where invite_code = upper(trim(p_invite_code));

  if v_household is null then
    raise exception 'Código de convite não encontrado. Confira as 8 letras e números.';
  end if;

  insert into public.household_members (household_id, user_id, display_name, color)
  values (v_household, v_user, trim(p_display_name), '#C2611B');

  return v_household;
end
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- Transferência entre contas da casa: dois lançamentos ligados, numa transação só.
-- SECURITY INVOKER: a RLS de quem chama vale para os inserts.
create function public.create_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount numeric,
  p_occurred_on date,
  p_description text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_group uuid := gen_random_uuid();
begin
  if p_amount <= 0 then
    raise exception 'O valor da transferência precisa ser maior que zero.';
  end if;
  if p_from_account = p_to_account then
    raise exception 'Escolha contas diferentes para origem e destino.';
  end if;

  insert into public.transactions (account_id, kind, amount, occurred_on, description, transfer_group)
  values
    (p_from_account, 'transferencia', -p_amount, p_occurred_on, p_description, v_group),
    (p_to_account, 'transferencia', p_amount, p_occurred_on, p_description, v_group);

  return v_group;
end
$$;

revoke all on function public.create_transfer(uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.create_transfer(uuid, uuid, numeric, date, text) to authenticated;
