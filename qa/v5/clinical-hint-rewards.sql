-- Existing disposable QA fixture only. All account/guard/receipt changes roll back.
begin;
create temporary table hint_reward_results(label text,expected integer,actual integer) on commit drop;
do $test$
declare
 source_state jsonb; source_actor text; source_uid text; source_room text;
 fixture jsonb; native_receipt jsonb; claim jsonb; history jsonb; policy jsonb;
 scope text; mode text; room text; uid text; encounter text; n integer;
 got integer; expected integer; after_xp bigint; f numeric;
begin
 select g.state,a.actor_id into source_state,source_actor
 from public.atria_clinical_guards g join public.atria_v5_accounts a
 on g.state#>'{runtime,members}' @> jsonb_build_array(jsonb_build_object('id',a.actor_id))
 where a.username like 'qa\_%' escape '\' and g.state#>>'{runtime,session,patient,caseId}'='FECAL-001'
 and g.state#>>'{runtime,session,patient,closure,xp}'='133' limit 1;
 if source_state is null then raise exception 'completed disposable QA FECAL fixture required'; end if;
 source_uid:=source_state#>>'{runtime,session,patient,uid}';source_room:=source_state#>>'{runtime,roomId}';
 for mode in select unnest(array['solo','apprentice','coop','competitive']) loop
  for scope in select unnest(array['specific','specialty','random']) loop
   f:=case scope when 'random' then 1.5 when 'specialty' then 1.2 else 1 end;
   foreach n in array array[0,1,5,10,15,19,20,21] loop
    room:='qa-contextual-hint-sql-'||mode||'-'||scope||'-'||n;uid:=room||':patient';encounter:=room||':care:'||uid;
    fixture:=replace(replace(source_state::text,source_uid,uid),source_room,room)::jsonb;
    fixture:=jsonb_set(fixture,'{runtime,mode}',to_jsonb(mode));
    fixture:=jsonb_set(fixture,'{runtime,session,encounterId}',to_jsonb(encounter));
    select coalesce(jsonb_agg(jsonb_build_object('actorId',source_actor,'key','hint:'||i,'offerId','offer:'||i,'requestId','display:'||i)),'[]'::jsonb)
     into history from generate_series(1,n) i;
    -- Another doctor's hints cannot reduce this physician's XP.
    history:=history||jsonb_build_array(jsonb_build_object('actorId','other-doctor','key','unrelated'));
    fixture:=jsonb_set(fixture,'{runtime,session,hints}',jsonb_build_object('version',1,'roomId',room,'encounterId',encounter,'patientUid',uid,'history',history));
    native_receipt:=fixture#>'{runtime,session,patient,closure}';
    claim:=native_receipt||jsonb_build_object('actorId',source_actor,'baseXP',133,'hintCount',n,'xp',floor(133*greatest(0,20-n)::numeric/20)::integer);
    fixture:=jsonb_set(fixture,'{runtime,claims}',jsonb_build_array(jsonb_build_array(source_actor,claim)));
    policy:=jsonb_build_object('version',1,'scope',scope,'selection',case scope when 'random' then '' when 'specialty' then 'Gastroenterología' else 'FECAL-001' end,'caseIds',jsonb_build_array('FECAL-001'));
    fixture:=jsonb_set(fixture,'{runtime,guardSelection}',policy);
    insert into public.atria_clinical_guards(room_id,state) values(room,fixture);
    perform public.atria_v5_award_verified(source_actor,room);
    select xp_delta into got from public.atria_v5_progress_receipts where actor_id=source_actor and patient_uid=uid;
    expected:=floor(round(133*f)*greatest(0,20-n)::numeric/20)::integer;
    insert into hint_reward_results values(mode||':'||scope||':'||n,expected,coalesce(got,-1));
    select xp into after_xp from public.atria_v5_accounts where actor_id=source_actor;
    perform public.atria_v5_award_verified(source_actor,room);
    insert into hint_reward_results select mode||':'||scope||':'||n||':idempotent',0,(xp-after_xp)::integer
     from public.atria_v5_accounts where actor_id=source_actor;
   end loop;
  end loop;
 end loop;
end;
$test$;
select count(*) as checks,count(*) filter(where expected=actual) as passed,
 jsonb_agg(to_jsonb(r)) filter(where expected is distinct from actual) as failures from hint_reward_results r;
rollback;
