import test from 'node:test';
import assert from 'node:assert/strict';
import {caseDebriefHTML} from './case-debrief.js';

test('debrief separates clinical deductions from the credited case XP and hint cost',()=>{
 const closure={destination:'alta',quality:{score:86},xp:105,baseXP:100,rewardMultiplier:1.5,
  hintCount:6,hintPenaltyPercent:30,debrief:{earned:[],deductions:[{label:'Estudios innecesarios',points:-4}],missing:[],unnecessary:[]}};
 const html=caseDebriefHTML(closure);
 assert.match(html,/Puntuación clínica: 86\/100/);
 assert.match(html,/XP base del caso<\/span><b>100 XP/);
 assert.match(html,/Modalidad de selección<\/span><b>×1,5/);
 assert.match(html,/XP antes de pistas<\/span><b>150 XP/);
 assert.match(html,/Pistas nuevas utilizadas<\/span><b>6/);
 assert.match(html,/Penalización por pistas<\/span><b[^>]*>−30% · −45 XP/);
 assert.match(html,/XP final obtenida<\/span><b[^>]*>105 XP/);
 assert.match(html,/Te descontaron.*Estudios innecesarios/);
});
test('0 XP and no hints are explicit; an unconfirmed reward is never displayed as earned',()=>{
 const raw={quality:{score:86},xp:100};
 assert.match(caseDebriefHTML(raw),/Pistas nuevas utilizadas<\/span><b>0/);
 assert.match(caseDebriefHTML({...raw,baseXP:100,hintCount:20,hintPenaltyPercent:100,xp:0}),/XP final obtenida<\/span><b[^>]*>0 XP/);
 assert.doesNotMatch(caseDebriefHTML({...raw,creditStatus:'pending'}),/XP final obtenida/);
 assert.match(caseDebriefHTML({...raw,creditStatus:'pending'}),/pendiente de acreditación/i);
 assert.match(caseDebriefHTML({...raw,creditStatus:'ineligible'}),/tu cuenta no recibe XP/i);
});
