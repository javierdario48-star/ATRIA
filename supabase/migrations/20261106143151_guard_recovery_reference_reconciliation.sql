-- Account pointers are not proof that a guard or participation still exists.
-- Reuse the existing private guard, membership, release and session records.
create or replace function public.atria_v5_guard_recovery(
 p_actor_id text,p_session_id uuid,p_operation text default 'inspect',p_room_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare
 a public.atria_v5_accounts%rowtype;
 guard_state jsonb; reason text; ended boolean:=false; participating boolean:=true;
begin
 if p_operation is null or p_operation not in ('inspect','take-control','release') then
  raise exception 'invalid recovery operation' using errcode='22023';
 end if;
 select * into a from public.atria_v5_accounts where actor_id=p_actor_id for update;
 if not found or not atria_private.account_session_active(a.auth_user_id,p_session_id) then
  raise exception 'active account session required' using errcode='42501';
 end if;
 -- A delayed action for A cannot take over or release a newer guard B.
 if a.active_guard_id is not null and p_room_id is not null and a.active_guard_id<>p_room_id then
  return jsonb_build_object('status','changed','roomId',a.active_guard_id);
 end if;
 if a.active_guard_id is null then return jsonb_build_object('status','none','roomId',null); end if;
 select state into guard_state from public.atria_clinical_guards where room_id=a.active_guard_id;
 if not found then reason:='missing';
 elsif exists(select 1 from public.atria_v5_released_guards where actor_id=p_actor_id and room_id=a.active_guard_id) then reason:='released';
 elsif jsonb_typeof(guard_state#>'{runtime,members}') is distinct from 'array' then
  -- An incompatible/unreadable checkpoint is not evidence of nonexistence.
  return jsonb_build_object('status','unavailable','roomId',a.active_guard_id);
 elsif not exists(select 1 from jsonb_array_elements(guard_state#>'{runtime,members}') m where m->>'id'=p_actor_id) then reason:='not-member';
 end if;
 if reason is not null then
  update public.atria_v5_accounts set active_guard_id=null,controller_session_id=null,updated_at=now() where actor_id=p_actor_id;
  return jsonb_build_object('status','none','roomId',null,'reason',reason);
 end if;
 if p_operation='take-control' then
  if not public.atria_v5_take_control(p_actor_id,p_session_id) then
   raise exception 'guard control could not be confirmed' using errcode='42501';
  end if;
 end if;
 if jsonb_typeof(guard_state#>'{runtime,turn,participantIds}')='array' then
  participating:=(guard_state#>'{runtime,turn,participantIds}') ? p_actor_id;
 end if;
 if p_operation='release' then
  -- The native authority, not this RPC, records leave and turn consensus.
  if participating then return jsonb_build_object('status','participating','roomId',a.active_guard_id); end if;
  if a.controller_session_id is distinct from p_session_id then
   return jsonb_build_object('status','changed','roomId',a.active_guard_id);
  end if;
  if not public.atria_v5_set_active_guard(p_actor_id,null,p_session_id) then
   raise exception 'guard release could not be confirmed' using errcode='42501';
  end if;
  return jsonb_build_object('status','none','roomId',null,'reason','released');
 end if;
 if jsonb_typeof(guard_state#>'{runtime,shift,elapsedSeconds}')='number' and
    jsonb_typeof(guard_state#>'{runtime,shift,durationSeconds}')='number' then
  ended:=(guard_state#>>'{runtime,shift,elapsedSeconds}')::numeric >= (guard_state#>>'{runtime,shift,durationSeconds}')::numeric;
 end if;
 return jsonb_build_object('status','available','roomId',a.active_guard_id,'mode',guard_state#>>'{runtime,mode}',
  'turnEnded',ended,'participating',participating);
end;
$function$;
revoke all on function public.atria_v5_guard_recovery(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.atria_v5_guard_recovery(text,uuid,text,text) to service_role;
