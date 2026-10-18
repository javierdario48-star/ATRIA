-- Installed in Supabase project atria-clinical on 2026-10-18.
-- This checked-in migration is for reproducibility; do not apply a second time
-- unless migrating a new dedicated project. No public client has table access.
create table if not exists public.atria_clinical_guards (
  room_id text primary key check (room_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  revision bigint not null default 1 check (revision > 0),
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.atria_clinical_guards enable row level security;
revoke all on public.atria_clinical_guards from public, anon, authenticated;
grant select, insert, update on public.atria_clinical_guards to service_role;
create or replace function public.atria_guard_cas(p_room_id text,p_expected_revision bigint,p_state jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v_revision bigint;
begin
 if p_room_id is null or p_room_id !~ '^[A-Za-z0-9_-]{1,100}$'
    or p_state is null or jsonb_typeof(p_state)<>'object'
 then raise exception 'invalid clinical guard payload' using errcode='22023'; end if;
 if p_expected_revision is null then
  insert into public.atria_clinical_guards(room_id,revision,state)
  values(p_room_id,1,p_state) on conflict(room_id) do nothing returning revision into v_revision;
 elsif p_expected_revision>0 then
  update public.atria_clinical_guards set revision=revision+1,state=p_state,updated_at=now()
  where room_id=p_room_id and revision=p_expected_revision returning revision into v_revision;
 else raise exception 'invalid expected revision' using errcode='22023';
 end if;
 return v_revision;
end;
$$;
revoke all on function public.atria_guard_cas(text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.atria_guard_cas(text,bigint,jsonb) to service_role;
