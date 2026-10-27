-- Run against the migrated preview database. Test mutations always roll back.
begin;
do $$ declare a text; b text; begin
 if public.atria_v5_name_key('Darío')<>public.atria_v5_name_key('DARIO') then raise exception 'canonical equivalence failed'; end if;
 if exists(select 1 from public.atria_v5_accounts x left join public.atria_v5_name_keys n on n.name_key=public.atria_v5_name_key(x.username) where n.actor_id is distinct from x.actor_id) then raise exception 'legacy access lost'; end if;
 if has_function_privilege('anon','public.atria_v5_resolve_login(text)','execute') or has_table_privilege('authenticated','public.atria_v5_name_keys','insert') then raise exception 'private namespace exposed'; end if;
 select actor_id into a from public.atria_v5_accounts where username like 'qa_%' order by created_at limit 1;
 select actor_id into b from public.atria_v5_accounts where username like 'qa_%' and actor_id<>a order by created_at limit 1;
 if a is null or b is null then raise exception 'QA fixtures missing'; end if;
 begin
  update public.atria_v5_accounts set name='Darío Prueba Exclusiva' where actor_id=a;
  begin
   update public.atria_v5_accounts set name='DARIO PRUEBA EXCLUSIVA' where actor_id=b;
   raise exception 'duplicate accepted';
  exception when unique_violation then null; end;
  if (public.atria_v5_name_status('dario prueba exclusiva')->>'available')::boolean then raise exception 'reserved name available'; end if;
  raise exception 'rollback_test' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null; end;
end $$;
rollback;
