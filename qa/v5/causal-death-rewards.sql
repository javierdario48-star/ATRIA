-- Private disposable QA accounts only. Every state/balance/receipt rolls back.
begin;
create temporary table causal_death_results(label text,expected bigint,actual bigint) on commit drop;
do $test$
declare
 actors text[]; actor text; room text; uid text; source text; phase text;
 fixture jsonb; session jsonb; wanted bigint; balance bigint; i integer;
begin
 select array_agg(actor_id order by actor_id) into actors from
  (select actor_id from public.atria_v5_accounts where username like 'qa\_%' escape '\' or name like 'QA %' limit 2) a;
 if coalesce(array_length(actors,1),0)<2 then raise exception 'two disposable QA accounts required'; end if;
 foreach phase in array array['disease','treatment-contributed','wrong-patient','unconfirmed-source'] loop
  room:='qa-causal-death-'||phase;uid:=room||':patient';source:=room||':dose';
  update public.atria_v5_accounts set xp=100 where actor_id=any(actors);
  session:=jsonb_build_object('deathPublished',true,'patient',jsonb_build_object(
   'uid',uid,'caseId','CIRR-001','patientDied',true,'caseEnded',true,
   'deathAttribution',jsonb_build_object('classification',case when phase='disease' then 'disease' else 'treatment-contributed' end,
    'sourceEventIds',jsonb_build_array(case when phase='unconfirmed-source' then source||':missing' else source end)),
   'administrationLog',jsonb_build_array(jsonb_build_object('id','fluid','actorId',actors[2],
    'patientUid',case when phase='wrong-patient' then 'another-patient' else uid end,'sourceEventId',source))),
   'authority',jsonb_build_object('patients',jsonb_build_array(jsonb_build_object('uid',uid,'closed',true,'died',true))),
   'progress',jsonb_build_object('penalties',jsonb_build_array(jsonb_build_object('kind','clinical.death',
    'patientUid',uid,'eventId',room||':death','actorId',actors[2],'loss',0))));
  fixture:=jsonb_build_object('schemaVersion',1,'roomId',room,'epoch',1,'lease',null,
   'runtime',jsonb_build_object('roomId',room,'mode','coop','members',jsonb_build_array(
    jsonb_build_object('id',actors[1]),jsonb_build_object('id',actors[2])),
    'claims','[]'::jsonb,'session',session,'sessions','[]'::jsonb));
  insert into public.atria_clinical_guards(room_id,state) values(room,fixture);
  for i in 1..2 loop
   actor:=actors[i];wanted:=case when phase='treatment-contributed' and i=2 then 85 else 100 end;
   perform public.atria_v5_award_verified(actor,room);
   select xp into balance from public.atria_v5_accounts where actor_id=actor;
   insert into causal_death_results values(phase||':'||i,wanted,balance);
   perform public.atria_v5_award_verified(actor,room);
   select xp into balance from public.atria_v5_accounts where actor_id=actor;
   insert into causal_death_results values(phase||':'||i||':replay',wanted,balance);
  end loop;
 end loop;
end;
$test$;
select count(*) as checks,count(*) filter(where expected=actual) as passed,
 jsonb_agg(to_jsonb(r)) filter(where expected is distinct from actual) as failures from causal_death_results r;
rollback;
