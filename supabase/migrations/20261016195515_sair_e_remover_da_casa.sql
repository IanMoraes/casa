-- Quem criou a casa (pode remover pessoas), sair da casa e remover pessoas.

alter table public.households
  add column owner_id uuid references auth.users (id) on delete set null;

-- Casas existentes: o primeiro membro é quem criou.
update public.households h
set owner_id = (
  select m.user_id from public.household_members m
  where m.household_id = h.id
  order by m.created_at
  limit 1
)
where owner_id is null;

-- Casas novas já nascem com o dono.
create or replace function private.set_household_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is null then
    new.owner_id := (select auth.uid());
  end if;
  return new;
end
$$;

create trigger households_set_owner
  before insert on public.households
  for each row execute function private.set_household_owner();

-- Sair da casa. Se quem sai é o dono, a casa passa para o membro mais antigo.
-- Se for a última pessoa, a casa e todos os dados dela são apagados.
-- As contas e contas fixas de quem sai vão junto (pertencem a essa pessoa).
create function public.leave_household()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_household uuid;
  v_next uuid;
begin
  if v_user is null then
    raise exception 'Faça login para sair da casa.';
  end if;

  select household_id into v_household from public.household_members where user_id = v_user;
  if v_household is null then
    raise exception 'Você não faz parte de nenhuma casa.';
  end if;

  select user_id into v_next
  from public.household_members
  where household_id = v_household and user_id <> v_user
  order by created_at
  limit 1;

  if v_next is null then
    delete from public.households where id = v_household;
    return 'casa_apagada';
  end if;

  update public.households
  set owner_id = v_next
  where id = v_household and (owner_id = v_user or owner_id is null);

  update public.tasks set assignee_id = null
  where household_id = v_household and assignee_id = v_user;

  delete from public.household_members where household_id = v_household and user_id = v_user;
  return 'saiu';
end
$$;

-- Remover outra pessoa da casa. Só quem criou a casa pode.
create function public.remove_household_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_household uuid;
begin
  if v_user is null then
    raise exception 'Faça login para remover pessoas.';
  end if;
  if p_user_id = v_user then
    raise exception 'Para sair você mesmo, use Sair da casa.';
  end if;

  select id into v_household from public.households
  where owner_id = v_user
    and id = (select household_id from public.household_members where user_id = v_user);
  if v_household is null then
    raise exception 'Só quem criou a casa pode remover pessoas.';
  end if;

  if not exists (
    select 1 from public.household_members where household_id = v_household and user_id = p_user_id
  ) then
    raise exception 'Essa pessoa não faz parte da casa.';
  end if;

  update public.tasks set assignee_id = null
  where household_id = v_household and assignee_id = p_user_id;

  delete from public.household_members where household_id = v_household and user_id = p_user_id;
end
$$;

revoke all on function private.set_household_owner() from public, anon, authenticated;
revoke all on function public.leave_household() from public, anon;
revoke all on function public.remove_household_member(uuid) from public, anon;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
