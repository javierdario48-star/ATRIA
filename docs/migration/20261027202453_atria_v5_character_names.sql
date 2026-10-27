-- One authoritative public name namespace on the existing account actor.
create extension if not exists unaccent with schema extensions;
alter table public.atria_v5_accounts add column character_name_key text unique;
create function public.atria_v5_name_key(p_name text) returns text
language sql stable set search_path='' as $$
 select lower(extensions.unaccent('extensions.unaccent',normalize(regexp_replace(btrim(p_name),'\s+',' ','g'),NFKD)));
$$;
create table public.atria_v5_name_keys(
 name_key text primary key check(char_length(name_key) between 1 and 128),
 actor_id text references public.atria_v5_accounts(actor_id),
 kind text not null check(kind in ('legacy','character','conflict')),
 check((actor_id is null)=(kind='conflict'))
);
alter table public.atria_v5_name_keys enable row level security;
revoke all on public.atria_v5_name_keys from public,anon,authenticated;
grant select,insert,update on public.atria_v5_name_keys to service_role;

-- Preserve old login aliases first. Never reassign a login to another actor.
insert into public.atria_v5_name_keys(name_key,actor_id,kind)
 select public.atria_v5_name_key(username),actor_id,'legacy' from public.atria_v5_accounts;
insert into public.atria_v5_name_keys(name_key,actor_id,kind)
 select public.atria_v5_name_key(name),case when count(*)=1 then min(actor_id) else null end,
  case when count(*)=1 then 'character' else 'conflict' end
 from public.atria_v5_accounts where char_length(public.atria_v5_name_key(name)) between 1 and 128
 group by public.atria_v5_name_key(name)
 on conflict(name_key) do nothing;
update public.atria_v5_accounts a set character_name_key=public.atria_v5_name_key(a.name)
 where exists(select 1 from public.atria_v5_name_keys n where n.name_key=public.atria_v5_name_key(a.name) and n.actor_id=a.actor_id)
 and (select count(*) from public.atria_v5_accounts b where public.atria_v5_name_key(b.name)=public.atria_v5_name_key(a.name))=1;

create function public.atria_v5_prepare_character_name() returns trigger
language plpgsql set search_path='' as $$
begin
 -- Unresolved legacy names remain intact on appearance-only updates.
 if TG_OP='UPDATE' and NEW.name is not distinct from OLD.name then return NEW; end if;
 NEW.name:=normalize(regexp_replace(btrim(NEW.name),'\s+',' ','g'),NFC);
 if char_length(NEW.name) not between 2 and 32
  or NEW.name !~ '^[[:alpha:]][[:alpha:][:digit:] ._''’-]+$' then
  raise exception 'invalid character name' using errcode='22023';
 end if;
 NEW.character_name_key:=public.atria_v5_name_key(NEW.name);
 return NEW;
end;
$$;
create function public.atria_v5_reserve_character_name() returns trigger
language plpgsql set search_path='' as $$
declare reserved text;
begin
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
create trigger atria_v5_prepare_character_name before insert or update of name on public.atria_v5_accounts
 for each row execute function public.atria_v5_prepare_character_name();
create trigger atria_v5_reserve_character_name after insert or update of name on public.atria_v5_accounts
 for each row execute function public.atria_v5_reserve_character_name();

create function public.atria_v5_name_status(p_name text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('key',public.atria_v5_name_key(p_name),'displayName',normalize(regexp_replace(btrim(p_name),'\s+',' ','g'),NFC),
  'available',not exists(select 1 from public.atria_v5_name_keys where name_key=public.atria_v5_name_key(p_name)));
$$;
create function public.atria_v5_resolve_login(p_name text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('username',a.username) from public.atria_v5_name_keys n
 join public.atria_v5_accounts a on a.actor_id=n.actor_id where n.name_key=public.atria_v5_name_key(p_name);
$$;
revoke all on function public.atria_v5_name_key(text),public.atria_v5_prepare_character_name(),
 public.atria_v5_reserve_character_name(),public.atria_v5_name_status(text),public.atria_v5_resolve_login(text)
 from public,anon,authenticated;
grant execute on function public.atria_v5_name_key(text),public.atria_v5_prepare_character_name(),
 public.atria_v5_reserve_character_name(),public.atria_v5_name_status(text),public.atria_v5_resolve_login(text)
 to service_role;
