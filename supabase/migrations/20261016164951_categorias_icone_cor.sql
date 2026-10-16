-- Cada categoria ganha um ícone (nome de um ícone do app) e uma cor, usados
-- nas listas de movimentações e nos gráficos. As listas também ganham cores.

alter table public.categories
  add column icon text not null default 'circle' check (char_length(icon) between 1 and 40);

-- Casas criadas a partir de agora já vêm com ícones e cores.
create or replace function public.create_household(p_name text, p_display_name text)
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
  values (v_household, v_user, trim(p_display_name), '#0078C8');

  insert into public.categories (household_id, name, kind, icon, color, keywords) values
    (v_household, 'Salário', 'entrada', 'briefcase', '#2B8A3E', '{salario,salário,pagamento recebido,folha}'),
    (v_household, 'Pix recebido', 'entrada', 'arrow-down-left', '#0CA678', '{pix recebid,transferência recebida,transferencia recebida}'),
    (v_household, 'Rendimentos', 'entrada', 'trending-up', '#1C7ED6', '{rendimento,rendimentos,juros}'),
    (v_household, 'Outras entradas', 'entrada', 'plus', '#868E96', '{}'),
    (v_household, 'Moradia', 'saida', 'house', '#4C6EF5', '{aluguel,condominio,condomínio,iptu}'),
    (v_household, 'Contas da casa', 'saida', 'zap', '#F59F00', '{luz,energia,enel,cemig,agua,água,sabesp,gas,gás,internet,vivo,claro,tim}'),
    (v_household, 'Mercado', 'saida', 'shopping-cart', '#37B24D', '{mercado,supermercado,atacad,assai,carrefour,pao de acucar}'),
    (v_household, 'Restaurantes e delivery', 'saida', 'utensils', '#F76707', '{ifood,restaurante,lanchonete,padaria,rappi}'),
    (v_household, 'Transporte', 'saida', 'car', '#1098AD', '{uber,99,posto,combustivel,combustível,estacionamento}'),
    (v_household, 'Saúde', 'saida', 'heart-pulse', '#E64980', '{farmacia,farmácia,drogaria,drogasil,raia,hospital,clinica}'),
    (v_household, 'Lazer', 'saida', 'popcorn', '#7950F2', '{netflix,spotify,cinema,ingresso}'),
    (v_household, 'Compras', 'saida', 'shopping-bag', '#D6336C', '{mercado livre,amazon,shopee,magalu}'),
    (v_household, 'Pix enviado', 'saida', 'send', '#15AABF', '{pix enviad,transferência enviada,transferencia enviada}'),
    (v_household, 'Outras saídas', 'saida', 'circle', '#868E96', '{}');

  insert into public.lanes (household_id, name, color, position) values
    (v_household, 'Recados', '#0078C8', 1),
    (v_household, 'Compras', '#37B24D', 2),
    (v_household, 'Cozinha', '#F76707', 3),
    (v_household, 'Projetos pessoais', '#7950F2', 4);

  return v_household;
end
$$;

revoke all on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;

-- A segunda pessoa entra com o laranja, que contrasta com o azul da primeira.
create or replace function public.join_household(p_invite_code text, p_display_name text)
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
  values (v_household, v_user, trim(p_display_name), '#E8590C');

  return v_household;
end
$$;

revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.join_household(text, text) to authenticated;
