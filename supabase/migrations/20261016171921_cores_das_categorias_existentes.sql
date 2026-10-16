-- Casas criadas antes dos ícones: dá ícone e cor às categorias e listas
-- padrão. Só mexe no que ainda está sem ícone e sem cor (nada personalizado).

update public.categories c
set icon = d.icon, color = d.color
from (values
  ('Salário', 'entrada', 'briefcase', '#2B8A3E'),
  ('Pix recebido', 'entrada', 'arrow-down-left', '#0CA678'),
  ('Rendimentos', 'entrada', 'trending-up', '#1C7ED6'),
  ('Outras entradas', 'entrada', 'plus', '#868E96'),
  ('Moradia', 'saida', 'house', '#4C6EF5'),
  ('Contas da casa', 'saida', 'zap', '#F59F00'),
  ('Mercado', 'saida', 'shopping-cart', '#37B24D'),
  ('Restaurantes e delivery', 'saida', 'utensils', '#F76707'),
  ('Transporte', 'saida', 'car', '#1098AD'),
  ('Saúde', 'saida', 'heart-pulse', '#E64980'),
  ('Lazer', 'saida', 'popcorn', '#7950F2'),
  ('Compras', 'saida', 'shopping-bag', '#D6336C'),
  ('Pix enviado', 'saida', 'send', '#15AABF'),
  ('Outras saídas', 'saida', 'circle', '#868E96')
) as d(name, kind, icon, color)
where c.name = d.name
  and c.kind = d.kind
  and c.icon = 'circle'
  and c.color is null;

-- Categorias criadas pelo usuário continuam com o ícone padrão, mas ganham uma cor.
update public.categories
set color = '#0078C8'
where icon = 'circle' and color is null;

update public.lanes l
set color = d.color
from (values
  ('Recados', '#0078C8'),
  ('Compras', '#37B24D'),
  ('Cozinha', '#F76707'),
  ('Projetos pessoais', '#7950F2')
) as d(name, color)
where l.name = d.name and l.color is null;

update public.lanes set color = '#0078C8' where color is null;
