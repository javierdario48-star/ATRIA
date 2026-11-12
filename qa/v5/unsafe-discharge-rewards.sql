-- Run against disposable QA accounts. Every row change is rolled back.
begin;
create temporary table unsafe_discharge_results(phase text,checks integer) on commit drop;
do $test$
declare
 actors text[]; doctor text; colleague text; room text; uid text; event_id text; closure_event text;
 phase text; starting_xp integer; expected_debit integer; verified boolean;
 session jsonb; fixture jsonb; disposition jsonb; closure jsonb; account jsonb;
begin
 select array_agg(actor_id order by actor_id) into actors from
  (select actor_id from public.atria_v5_accounts where username like 'qa\_%' escape '\' or name like 'QA %' limit 2) a;
 if coalesce(array_length(actors,1),0)<2 then raise exception 'two disposable QA accounts required'; end if;
 doctor:=actors[1]; colleague:=actors[2];
 foreach phase in array array['confirmed','insufficient-xp','zero-xp','wrong-actor','missing-proof','not-admitted'] loop
  room:='qa-unsafe-discharge-'||phase; uid:=room||':patient'; event_id:=room||':alta';
  starting_xp:=case phase when 'insufficient-xp' then 6 when 'zero-xp' then 0 else 40 end;
  verified:=phase in ('confirmed','insufficient-xp','zero-xp');
  expected_debit:=case when verified then least(15,starting_xp) else 0 end;
  update public.atria_v5_accounts set xp=starting_xp,cases_resolved=0 where actor_id=any(actors);
  disposition:=jsonb_build_object('kind','clinical.unsafe-discharge','closed',false,'destination','alta',
   'actorId',case when phase='wrong-actor' then colleague else doctor end,
   'patientUid',uid,'eventId',event_id,'penaltyEventId',event_id);
  session:=jsonb_build_object('patient',jsonb_build_object('uid',uid,'caseId','DIVERT-001'),
   'progress',jsonb_build_object('penalties',jsonb_build_array(jsonb_build_object(
    'kind','clinical.unsafe-discharge','patientUid',uid,'eventId',event_id,'actorId',doctor,'loss',0))),
   'port',jsonb_build_object('receipts',case when phase='missing-proof' then '[]'::jsonb else
    jsonb_build_array(jsonb_build_array(event_id,jsonb_build_object(
     'intent',jsonb_build_object('kind','case.close','id','alta'),
     'ack',jsonb_build_object('status','executed','patientUid',uid,'eventId',event_id,
      'receipt',jsonb_build_object('actorId',doctor,'disposition',disposition))))) end));
  fixture:=jsonb_build_object('schemaVersion',1,'roomId',room,'epoch',1,'lease',null,
   'runtime',jsonb_build_object('roomId',room,'mode','coop','members',
    jsonb_build_array(jsonb_build_object('id',colleague)) ||
    case when phase='not-admitted' then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id',doctor)) end,
    'claims','[]'::jsonb,'session',session,'sessions','[]'::jsonb));
  insert into public.atria_clinical_guards(room_id,state) values(room,fixture);
  account:=public.atria_v5_award_verified(doctor,room);
  if account is distinct from jsonb_build_object('xp',starting_xp-expected_debit,'casesResolved',0) then
   raise exception '%: wrong disposition balance %',phase,account;
  end if;
  if public.atria_v5_award_verified(doctor,room) is distinct from account then
   raise exception '%: replay changed the balance',phase;
  end if;
  if public.atria_v5_award_verified(colleague,room) is distinct from jsonb_build_object('xp',starting_xp,'casesResolved',0) then
   raise exception '%: an uninvolved colleague was debited',phase;
  end if;
  if (select count(*) from public.atria_v5_progress_receipts r where r.room_id=room)
     <> verified::integer then
   raise exception '%: wrong number of durable receipts',phase;
  end if;
  insert into unsafe_discharge_results values(phase,4);
  if phase='zero-xp' then
   update public.atria_v5_accounts set xp=20 where actor_id=doctor;
   if public.atria_v5_award_verified(doctor,room) is distinct from jsonb_build_object('xp',20,'casesResolved',0) then
    raise exception 'a zero debit cannot be charged again after earning XP';
   end if;
   insert into unsafe_discharge_results values('zero-xp-later-balance',1);
  end if;
  if phase='confirmed' then
   closure_event:=room||':corrected';
   closure:=jsonb_build_object('kind','clinical.closure','closed',true,'eventId',closure_event,
    'patientUid',uid,'caseId','DIVERT-001','actorId',doctor,'xp',80);
   fixture:=jsonb_set(fixture,'{runtime,session,patient,closure}',closure);
   fixture:=jsonb_set(fixture,'{runtime,claims}',jsonb_build_array(jsonb_build_array(uid,closure)));
   update public.atria_clinical_guards set state=fixture where room_id=room;
   account:=jsonb_build_object('xp',starting_xp-expected_debit+80,'casesResolved',1);
   if public.atria_v5_award_verified(doctor,room) is distinct from account
      or public.atria_v5_award_verified(doctor,room) is distinct from account then
    raise exception 'the recovered patient cannot earn one later closure';
   end if;
   if (select count(*) from public.atria_v5_progress_receipts r where r.room_id=room)<>2 then
    raise exception 'disposition debit and later closure must coexist';
   end if;
   insert into unsafe_discharge_results values('later-valid-closure',3);
  end if;
 end loop;
end;
$test$;
select count(*) as phases,sum(checks) as checks from unsafe_discharge_results;
rollback;
