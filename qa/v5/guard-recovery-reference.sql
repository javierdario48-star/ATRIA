-- Only disposable QA accounts and transient guard fixtures; all changes roll back.
begin;
create temporary table recovery_results(label text,passed boolean) on commit drop;
do $test$
declare
 actors text[]; sessions uuid[]; a text; sid uuid; room text; mode text; fixture jsonb;
 result jsonb; saved_account jsonb; other_account jsonb; controller uuid; original_controller uuid:=gen_random_uuid();
begin
 select array_agg(actor_id order by actor_id),array_agg(session_id order by actor_id) into actors,sessions from
  (select distinct on(a.actor_id) a.actor_id,s.id as session_id from public.atria_v5_accounts a
   join auth.sessions s on s.user_id=a.auth_user_id where a.name like 'QA %' order by a.actor_id,s.created_at desc limit 2) qa;
 if coalesce(array_length(actors,1),0)<2 then raise exception 'two disposable authenticated QA accounts required'; end if;
 a:=actors[1];sid:=sessions[1];
 insert into auth.sessions(id,user_id,created_at,updated_at)
  select original_controller,auth_user_id,now(),now() from public.atria_v5_accounts where actor_id=a;
 select to_jsonb(x) into saved_account from public.atria_v5_accounts x where actor_id=a;
 select to_jsonb(x) into other_account from public.atria_v5_accounts x where actor_id=actors[2];
 foreach mode in array array['solo','coop','competitive'] loop
  room:='qa-recovery-'||mode||'-'||gen_random_uuid();
  fixture:=jsonb_build_object('runtime',jsonb_build_object('mode',mode,'members',jsonb_build_array(jsonb_build_object('id',a),jsonb_build_object('id',actors[2])),
   'turn',jsonb_build_object('participantIds',jsonb_build_array(a,actors[2])),
   'shift',jsonb_build_object('elapsedSeconds',1440,'durationSeconds',1440),
   'clinicalSentinel',jsonb_build_object('patientUid',room||':patient','treatments',jsonb_build_array('existing-dose'),'messages',jsonb_build_array('existing-answer'))));
  insert into public.atria_clinical_guards(room_id,state) values(room,fixture);
  update public.atria_v5_accounts set active_guard_id=room,controller_session_id=original_controller where actor_id=a;
  result:=public.atria_v5_guard_recovery(a,sid);
  insert into recovery_results values(mode||':ended-turn-is-recoverable',result->>'status'='available' and (result->>'turnEnded')::boolean);
  select controller_session_id into controller from public.atria_v5_accounts where actor_id=a;
  insert into recovery_results values(mode||':inspection-does-not-transfer-control',controller=original_controller);
  result:=public.atria_v5_guard_recovery(a,sid,'take-control',room);
  select controller_session_id into controller from public.atria_v5_accounts where actor_id=a;
  insert into recovery_results values(mode||':explicit-device-transfer',result->>'status'='available' and controller=sid);
  result:=public.atria_v5_guard_recovery(a,sid,'release',room);
  insert into recovery_results values(mode||':release-requires-native-leave',result->>'status'='participating');
  result:=public.atria_v5_guard_recovery(a,sid,'release','older-room');
  insert into recovery_results values(mode||':stale-action-cannot-release-new-guard',result->>'status'='changed');
  -- A saved leave remains recoverable; only explicit release creates a tombstone.
  update public.atria_clinical_guards set state=jsonb_set(state,'{runtime,turn,participantIds}',jsonb_build_array(actors[2])) where room_id=room;
  result:=public.atria_v5_guard_recovery(a,sid);
  insert into recovery_results values(mode||':temporary-leave-is-recoverable',result->>'status'='available' and not (result->>'participating')::boolean);
  result:=public.atria_v5_guard_recovery(a,sid,'release',room);
  insert into recovery_results values(mode||':permanent-release',result->>'status'='none' and exists(select 1 from public.atria_v5_released_guards where actor_id=a and room_id=room));
  update public.atria_v5_accounts set active_guard_id=room,controller_session_id=original_controller where actor_id=a;
  result:=public.atria_v5_guard_recovery(a,sid);
  insert into recovery_results values(mode||':released-phantom-reconciled',result->>'status'='none' and result->>'reason'='released');
  insert into recovery_results select mode||':clinical-data-preserved',state#>'{runtime,clinicalSentinel}'=fixture#>'{runtime,clinicalSentinel}' from public.atria_clinical_guards where room_id=room;
 end loop;
 update public.atria_v5_accounts set active_guard_id='qa-recovery-missing',controller_session_id=original_controller where actor_id=a;
 result:=public.atria_v5_guard_recovery(a,sid);
 insert into recovery_results values('missing-reference',result->>'status'='none' and result->>'reason'='missing');
 result:=public.atria_v5_guard_recovery(a,sid,'release','qa-recovery-missing');
 insert into recovery_results values('missing-release-is-idempotent',result->>'status'='none');
 insert into recovery_results select 'xp-and-cases-unchanged',xp=(saved_account->>'xp')::bigint and cases_resolved=(saved_account->>'cases_resolved')::bigint from public.atria_v5_accounts where actor_id=a;
 insert into recovery_results select 'other-physician-unchanged',to_jsonb(x)=other_account from public.atria_v5_accounts x where actor_id=actors[2];
 begin
  perform public.atria_v5_guard_recovery(actors[2],sid);
  insert into recovery_results values('cannot-use-another-physician-session',false);
 exception when insufficient_privilege then insert into recovery_results values('cannot-use-another-physician-session',true); end;
 insert into recovery_results values('anon-has-no-rpc-access',not has_function_privilege('anon','public.atria_v5_guard_recovery(text,uuid,text,text)','execute')),
  ('authenticated-has-no-rpc-access',not has_function_privilege('authenticated','public.atria_v5_guard_recovery(text,uuid,text,text)','execute'));
end;
$test$;
select count(*) as checks,count(*) filter(where passed) as passed,
 jsonb_agg(label) filter(where passed is distinct from true) as failures from recovery_results;
rollback;
