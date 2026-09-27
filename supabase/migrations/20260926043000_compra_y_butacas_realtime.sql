-- 1. Función que crea la compra y las entradas
create or replace function public.confirmar_compra(
  p_funcion_id uuid,
  p_butaca_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid;
  v_compra_id uuid;
  v_subtotal numeric(10, 2);
  v_cantidad_butacas integer;
begin
  v_usuario_id := auth.uid();

  if v_usuario_id is null then
    raise exception 'Debes iniciar sesión para comprar';
  end if;

  if coalesce(cardinality(p_butaca_ids), 0) = 0 then
    raise exception 'Debes seleccionar al menos una butaca';
  end if;

  if cardinality(p_butaca_ids) <>
    (
      select count(distinct butaca_id)
      from unnest(p_butaca_ids) as butaca_id
    )
  then
    raise exception 'La selección contiene butacas repetidas';
  end if;

  select
    count(*),
    sum(
      case
        when b.tipo = 'vip'
          then coalesce(f.precio_vip, f.precio)
        else f.precio
      end
    )
  into v_cantidad_butacas, v_subtotal
  from public.funciones f
  join public.butacas b
    on b.sala_id = f.sala_id
  where f.id = p_funcion_id
    and b.id = any(p_butaca_ids);

  if v_cantidad_butacas <> cardinality(p_butaca_ids) then
    raise exception
      'Una o más butacas no pertenecen a la sala de esta función';
  end if;

  insert into public.compras (
    usuario_id,
    subtotal,
    total
  )
  values (
    v_usuario_id,
    v_subtotal,
    v_subtotal
  )
  returning id into v_compra_id;

  insert into public.entradas (
    compra_id,
    funcion_id,
    butaca_id,
    qr_code
  )
  select
    v_compra_id,
    p_funcion_id,
    butaca_id,
    gen_random_uuid()::text
  from unnest(p_butaca_ids) as butaca_id;

  return v_compra_id;

exception
  when unique_violation then
    raise exception 'Una de las butacas ya fue comprada';
end;
$$;

revoke all
on function public.confirmar_compra(uuid, uuid[])
from public;

grant execute
on function public.confirmar_compra(uuid, uuid[])
to authenticated;


-- 2. Función que devuelve los IDs de las butacas ocupadas
create or replace function public.obtener_butacas_ocupadas(
  p_funcion_id uuid
)
returns table (
  butaca_id uuid
)
language sql
security definer
set search_path = public
as $$
  select e.butaca_id
  from public.entradas e
  where e.funcion_id = p_funcion_id
    and e.estado in ('valida', 'usada');
$$;

revoke all
on function public.obtener_butacas_ocupadas(uuid)
from public;

grant execute
on function public.obtener_butacas_ocupadas(uuid)
to authenticated;


-- 3. Trigger que avisa cambios de ocupación en tiempo real
create or replace function public.notificar_cambio_entrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_funcion_id uuid;
begin
  v_funcion_id :=
    coalesce(new.funcion_id, old.funcion_id);

  perform realtime.send(
    '{}'::jsonb,
    'ocupacion_cambio',
    'funcion:' || v_funcion_id::text,
    false
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_notificar_cambio_entrada
on public.entradas;

create trigger trigger_notificar_cambio_entrada
after insert or update or delete
on public.entradas
for each row
execute function public.notificar_cambio_entrada();