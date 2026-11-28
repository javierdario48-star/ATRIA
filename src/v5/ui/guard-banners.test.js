import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../server/content.js';
import {stagedV2Candidates} from '../content/packs/v2-staging-candidates.js';
import {guardMenuModel,pathologyLabel,renderGuardBanners} from './guard-banners.js';
import {eligibleGuardCases,guardScopeMultiplier} from '../clinical/guard-selection-policy.js';
const cases=clinicalContent.cases.map(c=>stagedV2Candidates.find(v=>v.id===c.id)||c),ids=cases.map(c=>c.id);
test('all 55 disease titles, four V2 labels and four systems use the actual eligibility pools',()=>{
 const m=guardMenuModel(cases,ids);assert.equal(m.pathology.length,55);assert.equal(m.revisions.length,4);
 assert.equal(m.groups.length,4);assert.equal(m.groups.reduce((n,g)=>n+g.count,0),55);
 for(const c of m.pathology){assert.notEqual(pathologyLabel(c),c.selector);assert.equal(pathologyLabel(c).endsWith(' · V2'),c.clinicalRevision==='v2-candidate');}
 for(const g of m.groups)assert.equal(eligibleGuardCases(cases,ids,'specialty',g.name).length,g.count);
 assert(eligibleGuardCases(cases,ids,'specialty','Gastroenterología').some(c=>c.id==='VARIX-001'));
 assert.deepEqual(['random','specialty','specific'].map(guardScopeMultiplier),[1.5,1.2,1]);
 const html=renderGuardBanners(cases,ids,{offline:true});
 assert.match(html,/Casos aleatorios/);assert.match(html,/×1,5 XP/);assert.match(html,/×1,2 XP/);assert.match(html,/modo conectado/);
 assert.equal((html.match(/class="guard-v2"/g)||[]).length,4);assert.equal((html.match(/data-guard-system=/g)||[]).length,4);
 assert.equal((html.match(/data-guard-case=/g)||[]).length,4);
});
test('V1 menu never claims V2 and playable filtering is exact',()=>{
 const original=clinicalContent.cases,m=guardMenuModel(original,['CIRR-001','CARD-08']);
 assert.equal(m.revisions.length,0);assert.equal(m.pathology.length,2);
 assert(!renderGuardBanners(original,['CIRR-001']).includes('NUEVAS REVISIONES'));
 assert.match(pathologyLabel(original.find(c=>c.id==='CIRR-001')),/Cirrosis descompensada/);
});
