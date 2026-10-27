-- Extend the existing server-only award RPC; historical receipts stay unchanged.
alter table public.atria_v5_progress_receipts
 add column base_xp integer check (base_xp between 0 and 10000),
 add column reward_scope text not null default 'legacy' check (reward_scope in ('legacy','random','specialty','specific')),
 add column reward_multiplier numeric(2,1) not null default 1 check (reward_multiplier in (1,1.2,1.5));
alter table public.atria_v5_progress_receipts drop constraint atria_v5_progress_receipts_check;
alter table public.atria_v5_progress_receipts add constraint atria_v5_progress_receipts_check
 check ((kind='clinical.closure' and xp_delta between 0 and 15000) or
        (kind='clinical.death' and xp_delta between -15 and 0));
CREATE OR REPLACE FUNCTION public.atria_v5_award_verified(p_actor_id text, p_room_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 a public.atria_v5_accounts%rowtype;
 g record; r jsonb; s jsonb; candidate jsonb; penalty jsonb;
 balance bigint; resolved bigint; amount integer; inserted integer;
 uid text; event_id text; case_id text; eligible boolean;
 policy jsonb; reward_scope text; factor numeric; base_amount integer;
begin
 select * into a from public.atria_v5_accounts where actor_id=p_actor_id for update;
 if not found then raise exception 'account not found' using errcode='22023'; end if;
 balance:=a.xp; resolved:=a.cases_resolved;
 for g in select room_id,state,updated_at from public.atria_clinical_guards
  where (p_room_id is null or room_id=p_room_id)
   and exists(select 1 from jsonb_array_elements(coalesce(state#>'{runtime,members}','[]'::jsonb)) m
    where m->>'id'=p_actor_id)
  order by updated_at,room_id
 loop
  -- Only a native closure actually committed in its patient session can
  -- back a claim. A death cannot be turned into a reward.
  for r in select c->1 from jsonb_array_elements(coalesce(g.state#>'{runtime,claims}','[]'::jsonb)) c
  loop
   if r->>'actorId' is distinct from p_actor_id or r->>'kind' is distinct from 'clinical.closure' or r->'closed' is distinct from 'true'::jsonb
    or coalesce(r->>'xp','') !~ '^[0-9]{1,5}$' then continue; end if;
   amount:=(r->>'xp')::integer; uid:=r->>'patientUid'; event_id:=r->>'eventId'; case_id:=r->>'caseId';
   if amount>10000 or coalesce(char_length(uid),0) not between 1 and 240
    or coalesce(event_id,'')='' or coalesce(case_id,'')='' then continue; end if;
   s:=g.state#>'{runtime,session}';
   if s#>>'{patient,uid}' is distinct from uid then
    select x->1 into s from jsonb_array_elements(coalesce(g.state#>'{runtime,sessions}','[]'::jsonb)) x
     where x->>0=uid limit 1;
   end if;
   if s is null or s#>'{patient,patientDied}'='true'::jsonb
    or s#>'{patient,closure,closed}' is distinct from 'true'::jsonb
    or s#>>'{patient,closure,eventId}' is distinct from event_id
    or s#>>'{patient,closure,patientUid}' is distinct from uid
    or s#>>'{patient,closure,caseId}' is distinct from case_id
    or s#>>'{patient,closure,xp}' is distinct from r->>'xp' then continue; end if;
   -- Scope and eligibility come exclusively from the committed server runtime.
   -- Old checkpoints have no selection: keep their original factor of one.
   base_amount:=amount; reward_scope:='legacy'; factor:=1;
   policy:=g.state#>'{runtime,guardSelection}';
   if policy is not null and policy <> 'null'::jsonb then
    if policy->'version' is distinct from '1'::jsonb
     or jsonb_typeof(policy->'caseIds') is distinct from 'array' then continue; end if;
    if not (policy->'caseIds' @> jsonb_build_array(case_id))
     or not exists(select 1 from jsonb_array_elements(coalesce(g.state#>'{runtime,shift,records}','[]'::jsonb)) rec
      where rec->>'uid'=uid and rec->>'caseId'=case_id) then continue; end if;
    reward_scope:=policy->>'scope';
    case reward_scope
     when 'random' then
      if policy->>'selection' is distinct from '' then continue; end if;
      factor:=1.5;
     when 'specialty' then
      if coalesce(length(policy->>'selection'),0)=0 then continue; end if;
      factor:=1.2;
     when 'specific' then
      if policy->>'selection' is distinct from case_id
       or jsonb_array_length(policy->'caseIds')<>1 then continue; end if;
      factor:=1;
     else continue;
    end case;
   end if;
   -- Round once, after native scoring. Never multiply death penalties.
   amount:=round(base_amount*factor)::integer;
   inserted:=null;
   insert into public.atria_v5_progress_receipts(actor_id,patient_uid,room_id,case_id,kind,event_id,xp_delta,base_xp,reward_scope,reward_multiplier)
    values(p_actor_id,uid,g.room_id,case_id,'clinical.closure',event_id,amount,base_amount,reward_scope,factor)
    on conflict(actor_id,patient_uid) do nothing returning xp_delta into inserted;
   if inserted is not null then balance:=balance+inserted; resolved:=resolved+1; end if;
  end loop;
  -- The native engine records a death penalty even when its per-patient
  -- fresh ledger has zero XP. Apply the existing 15-XP rule to the account's
  -- current verified balance, ignoring the client and per-patient amount.
  for s in select g.state#>'{runtime,session}' union all
   select x->1 from jsonb_array_elements(coalesce(g.state#>'{runtime,sessions}','[]'::jsonb)) x
  loop
   if s is null or s#>'{patient,patientDied}' is distinct from 'true'::jsonb
    or s->'deathPublished' is distinct from 'true'::jsonb
    or s#>'{patient,caseEnded}' is distinct from 'true'::jsonb
    or s#>'{patient,closure,closed}'='true'::jsonb then continue; end if;
   uid:=s#>>'{patient,uid}'; case_id:=s#>>'{patient,caseId}';
   if coalesce(char_length(uid),0) not between 1 and 240 or coalesce(case_id,'')='' then continue; end if;
   eligible:=g.state#>>'{runtime,mode}'<>'competitive' or exists(
    select 1 from jsonb_array_elements(coalesce(g.state#>'{runtime,shift,records}','[]'::jsonb)) record
    where record->>'uid'=uid and record->>'ownerId'=p_actor_id);
   if not coalesce(eligible,false) or not exists(
    select 1 from jsonb_array_elements(coalesce(s#>'{authority,patients}','[]'::jsonb)) p
    where p->>'uid'=uid and p->'closed'='true'::jsonb and p->'died'='true'::jsonb) then continue; end if;
   select p into penalty from jsonb_array_elements(coalesce(s#>'{progress,penalties}','[]'::jsonb)) p
    where p->>'patientUid'=uid and p->>'kind'='clinical.death' and coalesce(p->>'eventId','')<>'' limit 1;
   if penalty is null then continue; end if;
   amount:=-least(15,balance)::integer; inserted:=null;
   insert into public.atria_v5_progress_receipts(actor_id,patient_uid,room_id,case_id,kind,event_id,xp_delta)
    values(p_actor_id,uid,g.room_id,case_id,'clinical.death',penalty->>'eventId',amount)
    on conflict(actor_id,patient_uid) do nothing returning xp_delta into inserted;
   if inserted is not null then balance:=balance+inserted; end if;
  end loop;
 end loop;
 update public.atria_v5_accounts set xp=balance,cases_resolved=resolved,updated_at=now() where actor_id=p_actor_id;
 return jsonb_build_object('xp',balance,'casesResolved',resolved);
end;
$function$
;
revoke all on function public.atria_v5_award_verified(text,text) from public,anon,authenticated;
grant execute on function public.atria_v5_award_verified(text,text) to service_role;

