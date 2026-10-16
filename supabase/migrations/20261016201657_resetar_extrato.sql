-- Resetar extrato: apaga lançamentos por mês e/ou por conta (ou tudo).
--
-- p_account_id nulo = todas as contas; p_month nulo = todos os meses.
-- Transferências levam o outro lado junto (senão o saldo da outra conta
-- ficaria torto). Contas, saldos iniciais, categorias e contas fixas não são
-- tocados: o saldo de cada conta volta ao saldo inicial.
-- SECURITY INVOKER: a RLS vale, então só alcança a casa de quem chama.
-- Com p_dry_run = true só conta, sem apagar (para mostrar antes de confirmar).

create function public.reset_statement(
  p_account_id uuid default null,
  p_month date default null,
  p_dry_run boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_count integer;
begin
  if p_month is not null and extract(day from p_month) <> 1 then
    raise exception 'O mês precisa ser o primeiro dia do mês.';
  end if;

  select array_agg(distinct t2.id) into v_ids
  from public.transactions t
  join public.transactions t2
    on t2.id = t.id
    or (t.transfer_group is not null and t2.transfer_group = t.transfer_group)
  where (p_account_id is null or t.account_id = p_account_id)
    and (
      p_month is null
      or (t.occurred_on >= p_month and t.occurred_on < (p_month + interval '1 month')::date)
    );

  v_count := coalesce(cardinality(v_ids), 0);
  if p_dry_run or v_count = 0 then
    return v_count;
  end if;

  delete from public.transactions where id = any (v_ids);

  -- Importações que ficaram sem nenhum lançamento saem da lista.
  delete from public.import_batches b
  where not exists (select 1 from public.transactions t where t.import_batch_id = b.id);

  return v_count;
end
$$;

revoke all on function public.reset_statement(uuid, date, boolean) from public, anon;
grant execute on function public.reset_statement(uuid, date, boolean) to authenticated;
