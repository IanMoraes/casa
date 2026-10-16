-- Os privilégios padrão do Supabase dão ALL (inclusive TRUNCATE, que ignora a
-- RLS) para anon e authenticated em toda tabela nova do schema public.
-- Aqui ficam só as permissões que o app usa; a RLS continua decidindo as linhas.

revoke all on
  public.households, public.household_members, public.accounts, public.categories,
  public.recurring_bills, public.import_batches, public.transactions,
  public.lanes, public.tasks, public.account_balances
  from anon, authenticated;

grant select, update (name) on public.households to authenticated;
grant select on public.household_members to authenticated;
grant update (display_name, color, avatar_url) on public.household_members to authenticated;
grant select, insert, update, delete on
  public.accounts, public.categories, public.recurring_bills,
  public.import_batches, public.transactions, public.lanes, public.tasks
  to authenticated;
grant select on public.account_balances to authenticated;

-- Tabelas criadas no futuro por este usuário também nascem fechadas.
alter default privileges in schema public revoke all on tables from anon, authenticated;
