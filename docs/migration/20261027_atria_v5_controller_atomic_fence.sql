-- Lock the account and validate its controller in the SAME transaction as
-- both lease acquisition and final guard CAS. A preflight HTTP check alone
-- cannot fence an in-flight worker after a second device takes control.
create or replace function public.atria_v5_guard_cas(
 p_room_id text,p_expected_revision bigint,p_state jsonb,
 p_actor_id text,p_session_id uuid)
returns bigint language plpgsql security invoker set search_path='' as $$
declare previous jsonb; a public.atria_v5_accounts%rowtype; revision bigint;
begin
 select * into a from public.atria_v5_accounts where actor_id=p_actor_id for update;
 if not found or not atria_private.account_session_active(a.auth_user_id,p_session_id) then
  raise exception 'active account session required' using errcode='42501';
 end if;
 if a.active_guard_id is not null and (a.active_guard_id<>p_room_id or
  (a.controller_session_id is not null and a.controller_session_id<>p_session_id)) then
  raise exception 'guard controlled by another session or active guard' using errcode='42501';
 end if;
 select state into previous from public.atria_clinical_guards where room_id=p_room_id;
 if not exists(select 1 from jsonb_array_elements(coalesce(p_state#>'{runtime,members}','[]'::jsonb)) m where m->>'id'=p_actor_id)
  or (previous is not null and not exists(select 1 from jsonb_array_elements(coalesce(previous#>'{runtime,members}','[]'::jsonb)) m where m->>'id'=p_actor_id)) then
  raise exception 'account is not a guard member' using errcode='42501';
 end if;
 revision:=atria_private.guard_cas_atomic(p_room_id,p_expected_revision,p_state);
 if revision is not null then
  update public.atria_v5_accounts set active_guard_id=p_room_id,
   controller_session_id=p_session_id,updated_at=now() where actor_id=p_actor_id;
 end if;
 return revision;
end;
$$;
revoke all on function public.atria_v5_guard_cas(text,bigint,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.atria_v5_guard_cas(text,bigint,jsonb,text,uuid) to service_role;
