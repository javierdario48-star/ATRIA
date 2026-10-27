-- Keep username-based clients compatible while public character names evolve.
create or replace function public.atria_v5_reserve_character_name() returns trigger
language plpgsql set search_path='' as $$
declare reserved text;
begin
 if TG_OP='INSERT' then
  insert into public.atria_v5_name_keys(name_key,actor_id,kind)
   values(public.atria_v5_name_key(NEW.username),NEW.actor_id,'legacy')
   on conflict(name_key) do update set actor_id=excluded.actor_id
    where public.atria_v5_name_keys.actor_id=excluded.actor_id
   returning actor_id into reserved;
  if reserved is null then raise exception 'login alias occupied' using errcode='23505'; end if;
 end if;
 if NEW.character_name_key is null then return NEW; end if;
 insert into public.atria_v5_name_keys(name_key,actor_id,kind)
  values(NEW.character_name_key,NEW.actor_id,'character')
  on conflict(name_key) do update set actor_id=excluded.actor_id
   where public.atria_v5_name_keys.actor_id=excluded.actor_id
  returning actor_id into reserved;
 if reserved is null then raise exception 'character name occupied' using errcode='23505'; end if;
 return NEW;
end;
$$;
