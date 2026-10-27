-- ATRIA V5 account backend. Apply once through the migration tool after
-- inspecting the target project. Requires ATRIA_SUPABASE_DB_SETUP.sql.
-- Auth keeps password hashes; no application table stores a password.
-- No anon/authenticated grants or permissive RLS policies are intentional.

create schema if not exists atria_private;
revoke all on schema atria_private from public, anon, authenticated;
grant usage on schema atria_private to service_role;

create table if not exists public.atria_v5_accounts (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 actor_id text not null unique check (actor_id ~ '^qa_[0-9a-f]{30}$'),
 username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
 name text not null check (char_length(name) between 2 and 32 and name !~ '[<>[:cntrl:]]'),
 sex text not null check (sex in ('male','female')),
 scrub_color text not null check (scrub_color in ('navy','green','gray','pink','teal','burgundy','black')),
 avatar text not null check (avatar in ('wardrobe','player-navy','player-green','player-gray','player-pink','player-teal')),
 legacy_key text not null check (legacy_key ~ '^[-a-zA-Z0-9]{20,120}$'),
 social_token text not null unique check (social_token ~ '^[0-9a-f-]{32,80}$'),
 xp bigint not null default 0 check (xp >= 0 and xp <= 9007199254740991),
 cases_resolved bigint not null default 0 check (cases_resolved >= 0 and cases_resolved <= 9007199254740991),
 legacy_progress jsonb check (legacy_progress is null or
  (jsonb_typeof(legacy_progress)='object' and legacy_progress->'unverified'='true'::jsonb)),
 active_guard_id text check (active_guard_id is null or active_guard_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 controller_session_id uuid references auth.sessions(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (avatar = case when sex='female' or scrub_color='burgundy' then 'wardrobe'
  when scrub_color='black' then 'player-navy' when scrub_color='navy' then 'player-green' else 'player-'||scrub_color end)
);
create table if not exists public.atria_v5_social (
 key text primary key check (key ~ '^qa-v1:(user|friends|requests|outgoing|invites):qa_[0-9a-f]{30}$'),
 value jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.atria_v5_progress_receipts (
 actor_id text not null references public.atria_v5_accounts(actor_id) on delete cascade,
 patient_uid text not null check (char_length(patient_uid) between 1 and 240),
 room_id text not null references public.atria_clinical_guards(room_id),
 case_id text not null,
 kind text not null check (kind in ('clinical.closure','clinical.death')),
 event_id text not null,
 xp_delta integer not null,
 created_at timestamptz not null default now(),
 primary key (actor_id,patient_uid),
 check ((kind='clinical.closure' and xp_delta between 0 and 10000) or
        (kind='clinical.death' and xp_delta between -15 and 0))
);
create index if not exists atria_v5_progress_receipts_room_idx on public.atria_v5_progress_receipts(room_id);
create index if not exists atria_v5_accounts_controller_idx on public.atria_v5_accounts(controller_session_id);

alter table public.atria_v5_accounts enable row level security;
alter table public.atria_v5_social enable row level security;
alter table public.atria_v5_progress_receipts enable row level security;
revoke all on public.atria_v5_accounts,public.atria_v5_social,public.atria_v5_progress_receipts from public,anon,authenticated;
grant select,insert,update on public.atria_v5_accounts to service_role;
grant select,insert,update,delete on public.atria_v5_social to service_role;
grant select,insert on public.atria_v5_progress_receipts to service_role;

-- A narrow definer is necessary solely for auth.sessions, a protected Auth
-- schema. It is outside exposed schemas, has an empty search_path, and only
-- the server service role can execute it. The public wrapper is an invoker.
create or replace function atria_private.account_session_active(p_auth_user_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.id=p_session_id and s.user_id=p_auth_user_id);
$$;
revoke all on function atria_private.account_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function atria_private.account_session_active(uuid,uuid) to service_role;
create or replace function public.atria_v5_session_active(p_auth_user_id uuid,p_session_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select atria_private.account_session_active(p_auth_user_id,p_session_id);
$$;
revoke all on function public.atria_v5_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.atria_v5_session_active(uuid,uuid) to service_role;

create or replace function public.atria_v5_set_active_guard(p_actor_id text,p_room_id text,p_session_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.atria_v5_accounts%rowtype;
begin
 select * into a from public.atria_v5_accounts where actor_id=p_actor_id for update;
 if not found or not atria_private.account_session_active(a.auth_user_id,p_session_id) then return false; end if;
 if p_room_id is not null and not exists(
  select 1 from public.atria_clinical_guards g,
   lateral jsonb_array_elements(coalesce(g.state#>'{runtime,members}','[]'::jsonb)) m
  where g.room_id=p_room_id and m->>'id'=p_actor_id) then return false; end if;
 -- Login from another device never steals an existing same-room controller.
 if p_room_id is not null and a.active_guard_id is not null and
  a.controller_session_id is not null and a.controller_session_id<>p_session_id then return false; end if;
 if p_room_id is null and a.active_guard_id is not null and
  a.controller_session_id is distinct from p_session_id then return false; end if;
 update public.atria_v5_accounts set active_guard_id=p_room_id,
  controller_session_id=case when p_room_id is null then null else p_session_id end,
  updated_at=now() where actor_id=p_actor_id;
 return true;
end;
$$;
create or replace function public.atria_v5_can_control_guard(p_actor_id text,p_room_id text,p_session_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.atria_v5_accounts a where a.actor_id=p_actor_id
  and a.active_guard_id=p_room_id and a.controller_session_id=p_session_id
  and atria_private.account_session_active(a.auth_user_id,p_session_id));
$$;
create or replace function public.atria_v5_take_control(p_actor_id text,p_session_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.atria_v5_accounts%rowtype;
begin
 select * into a from public.atria_v5_accounts where actor_id=p_actor_id for update;
 if not found or a.active_guard_id is null or
  not atria_private.account_session_active(a.auth_user_id,p_session_id) then return false; end if;
 if not exists(select 1 from public.atria_clinical_guards g,
  lateral jsonb_array_elements(coalesce(g.state#>'{runtime,members}','[]'::jsonb)) m
  where g.room_id=a.active_guard_id and m->>'id'=p_actor_id) then return false; end if;
 update public.atria_v5_accounts set controller_session_id=p_session_id,updated_at=now() where actor_id=p_actor_id;
 return true;
end;
$$;
revoke all on function public.atria_v5_set_active_guard(text,text,uuid),
 public.atria_v5_can_control_guard(text,text,uuid),public.atria_v5_take_control(text,uuid) from public,anon,authenticated;
grant execute on function public.atria_v5_set_active_guard(text,text,uuid),
 public.atria_v5_can_control_guard(text,text,uuid),public.atria_v5_take_control(text,uuid) to service_role;

-- The RPC accepts identifiers only, NEVER xp, level, a closure or a view.
-- The durable clinical checkpoint is the only source of clinical evidence.
-- One account-row lock serializes projections across every worker/device.
-- A unique actor/patient receipt prevents both repeat awards and penalties.
create or replace function public.atria_v5_award_verified(p_actor_id text,p_room_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 a public.atria_v5_accounts%rowtype;
 g record; r jsonb; s jsonb; candidate jsonb; penalty jsonb;
 balance bigint; resolved bigint; amount integer; inserted integer;
 uid text; event_id text; case_id text; eligible boolean;
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
   inserted:=null;
   insert into public.atria_v5_progress_receipts(actor_id,patient_uid,room_id,case_id,kind,event_id,xp_delta)
    values(p_actor_id,uid,g.room_id,case_id,'clinical.closure',event_id,amount)
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
$$;
revoke all on function public.atria_v5_award_verified(text,text) from public,anon,authenticated;
grant execute on function public.atria_v5_award_verified(text,text) to service_role;

