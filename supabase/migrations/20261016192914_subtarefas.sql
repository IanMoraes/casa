-- Subtarefas (checklist) dentro de cada tarefa, e etiqueta colorida na tarefa.

alter table public.tasks
  add column label_color text check (label_color is null or label_color ~ '^#[0-9A-Fa-f]{6}$');

create table public.task_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  position double precision not null,
  created_at timestamptz not null default now()
);

create index task_items_task_idx on public.task_items (task_id, position);
create index task_items_household_idx on public.task_items (household_id);

alter table public.task_items enable row level security;

create policy "membros da casa" on public.task_items
  for all to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

revoke all on public.task_items from anon, authenticated;
grant select, insert, update, delete on public.task_items to authenticated;
