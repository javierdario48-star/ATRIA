import test from 'node:test';
import assert from 'node:assert/strict';
import {speakPatientHistory} from './patient-language.js';

test('native valve realization keeps captured anatomy, severity and timing in grammatical patient language',()=>{
 const canonical='Valvulopatía mitral nativa moderada y procedimiento urinario hace 8 días; sin prótesis valvular ni dispositivo intracardíaco.';
 const {spoken}=speakPatientHistory(canonical,{domain:'pmh',source:'case.history.pmh'});
 assert.equal(spoken,'Tengo un problema moderado en mi propia válvula mitral y me hicieron un procedimiento en las vías urinarias hace 8 días; no tengo una válvula artificial ni ningún dispositivo dentro del corazón.');
});

test('unsupported anatomy, uncertainty, other speakers and physical findings cannot acquire native-valve assertions',()=>{
 for(const canonical of ['Valvulopatía aórtica protésica leve.',
  'Posible valvulopatía aórtica nativa leve.',
  'Mi madre tiene valvulopatía aórtica nativa leve.',
  'Familiar: Valvulopatía aórtica nativa leve y procedimiento urinario hace 3 semanas; sin prótesis valvular ni dispositivo intracardíaco.',
  'Valvulopatía aórtica nativa leve y procedimiento cardíaco hace 3 semanas.'])
  assert.equal(speakPatientHistory(canonical,{domain:'pmh',source:'case.history.pmh'}).spoken,canonical);
 const canonical='Valvulopatía aórtica nativa leve.';
 assert.equal(speakPatientHistory(canonical,{domain:'exam',source:'native.patient-observation'}).spoken,canonical);
});
