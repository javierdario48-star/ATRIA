-- Retire device-key write access to claimed accounts, including older previews.
-- Both public gates delegate to the SAME existing atomic CAS implementation.
do $$ begin
 if to_regprocedure('atria_private.guard_cas_atomic(text,bigint,jsonb)') is null then
  alter function public.atria_guard_cas(text,bigint,jsonb) set schema atria_private;
  alter function atria_private.atria_guard_cas(text,bigint,jsonb) rename to guard_cas_atomic;
 end if;
end $$;
revoke all on function atria_private.guard_cas_atomic(text,bigint,jsonb) from public,anon,authenticated;
grant execute on function atria_private.guard_cas_atomic(text,bigint,jsonb) to service_role;

create or replace function atria_private.guard_has_account(s jsonb)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from jsonb_array_elements(coalesce(s#>'{runtime,members}','[]'::jsonb)) m
  join public.atria_v5_accounts a on a.actor_id=m->>'id');
$$;
revoke all on function atria_private.guard_has_account(jsonb) from public,anon,authenticated;
grant execute on function atria_private.guard_has_account(jsonb) to service_role;

create or replace function public.atria_guard_cas(p_room_id text,p_expected_revision bigint,p_state jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare previous jsonb;
begin
 select state into previous from public.atria_clinical_guards where room_id=p_room_id;
 if atria_private.guard_has_account(previous) or atria_private.guard_has_account(p_state) then
  raise exception 'account session required for claimed guard' using errcode='42501';
 end if;
 return atria_private.guard_cas_atomic(p_room_id,p_expected_revision,p_state);
end;
$$;
create or replace function public.atria_v5_guard_cas(p_room_id text,p_expected_revision bigint,p_state jsonb,p_actor_id text,p_session_id uuid)
returns bigint language plpgsql security invoker set search_path='' as $$
declare previous jsonb; a public.atria_v5_accounts%rowtype;
begin
 select * into a from public.atria_v5_accounts where actor_id=p_actor_id;
 if not found or not atria_private.account_session_active(a.auth_user_id,p_session_id) then
  raise exception 'active account session required' using errcode='42501';
 end if;
 select state into previous from public.atria_clinical_guards where room_id=p_room_id;
 if atria_private.guard_has_account(previous) or atria_private.guard_has_account(p_state) then
  if not exists(select 1 from jsonb_array_elements(coalesce(p_state#>'{runtime,members}','[]'::jsonb)) m where m->>'id'=p_actor_id)
   or (previous is not null and not exists(select 1 from jsonb_array_elements(coalesce(previous#>'{runtime,members}','[]'::jsonb)) m where m->>'id'=p_actor_id)) then
   raise exception 'account is not a guard member' using errcode='42501';
  end if;
 end if;
 return atria_private.guard_cas_atomic(p_room_id,p_expected_revision,p_state);
end;
$$;
revoke all on function public.atria_guard_cas(text,bigint,jsonb),public.atria_v5_guard_cas(text,bigint,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.atria_guard_cas(text,bigint,jsonb),public.atria_v5_guard_cas(text,bigint,jsonb,text,uuid) to service_role;

