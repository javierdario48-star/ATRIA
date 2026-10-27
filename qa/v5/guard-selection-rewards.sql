-- Transactional acceptance using a previously completed native FECAL guard
-- from disposable QA accounts. Every fixture, receipt and XP change rolls back.
begin;
create temporary table selection_reward_results(label text,expected integer,actual integer) on commit drop;
do $test$
declare
 source_state jsonb; source_actor text; source_uid text; fixture jsonb; policy jsonb;
 native integer; scope text; mode text; room text; uid text; got integer; expected integer;
 before_xp bigint; after_xp bigint; receipts bigint;
begin
 select g.state,a.actor_id into source_state,source_actor
 from public.atria_clinical_guards g join public.atria_v5_accounts a
 on g.state#>'{runtime,members}' @> jsonb_build_array(jsonb_build_object('id',a.actor_id))
 where a.username like 'qa\_%' escape '\' and g.state#>>'{runtime,session,patient,caseId}'='FECAL-001'
 and g.state#>>'{runtime,session,patient,closure,xp}'='133' limit 1;
 if source_state is null then raise exception 'completed QA FECAL fixture required'; end if;
 source_uid:=source_state#>>'{runtime,session,patient,uid}'; native:=133;
 select xp into before_xp from public.atria_v5_accounts where actor_id=source_actor;
 for mode in select unnest(array['solo','apprentice','coop','competitive']) loop
  for scope in select unnest(array['random','specialty','specific','legacy','tampered-xp','wrong-case','invalid-scope']) loop
   room:='qa-selection-sql-'||mode||'-'||scope; uid:=room||':patient';
   fixture:=replace(source_state::text,source_uid,uid)::jsonb;
   fixture:=jsonb_set(fixture,'{runtime,mode}',to_jsonb(mode));
   policy:=jsonb_build_object('version',1,'scope',case when scope='invalid-scope' then 'forged' when scope in ('tampered-xp','wrong-case') then 'specific' else scope end,
    'selection',case when scope='random' then '' when scope='specialty' then 'Gastroenterología' when scope='wrong-case' then 'CIRR-001' else 'FECAL-001' end,
    'caseIds',jsonb_build_array('FECAL-001'),'multiplier',999,'xp',999999);
   fixture:=jsonb_set(fixture,'{runtime,guardSelection}',policy);
   if scope='legacy' then fixture:=fixture#-'{runtime,guardSelection}'; end if;
   if scope='tampered-xp' then
    fixture:=jsonb_set(fixture,'{runtime,claims,0,1,xp}','9999'::jsonb);
   end if;
   insert into public.atria_clinical_guards(room_id,state) values(room,fixture);
   perform public.atria_v5_award_verified(source_actor,room);
   select xp_delta into got from public.atria_v5_progress_receipts where actor_id=source_actor and patient_uid=uid;
   expected:=case scope when 'random' then 200 when 'specialty' then 160 when 'specific' then 133 when 'legacy' then 133 else 0 end;
   insert into selection_reward_results values(mode||':'||scope,expected,coalesce(got,0));
   select xp into after_xp from public.atria_v5_accounts where actor_id=source_actor;
   perform public.atria_v5_award_verified(source_actor,room);
   insert into selection_reward_results select mode||':'||scope||':idempotent',0,(xp-after_xp)::integer
    from public.atria_v5_accounts where actor_id=source_actor;
   if expected>0 then
    insert into selection_reward_results select mode||':'||scope||':base-preserved',native,base_xp
     from public.atria_v5_progress_receipts where actor_id=source_actor and patient_uid=uid;
   end if;
  end loop;
 end loop;
end;
$test$;
select count(*) as checks,count(*) filter(where expected=actual) as passed,
 jsonb_agg(to_jsonb(r)) filter(where expected is distinct from actual) as failures from selection_reward_results r;
rollback;
