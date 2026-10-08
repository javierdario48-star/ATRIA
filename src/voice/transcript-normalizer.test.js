import assert from'node:assert/strict';
import{csVoiceCleanSpeech,csMergeSpeech,csVoiceNovelText}from'./transcript-normalizer.js';
assert.equal(csVoiceCleanSpeech('algún algún hábito algún hábito algún hábito algún hábito te va algún hábito te va con cigarro'),'algún hábito te va con cigarro');
assert.equal(csVoiceCleanSpeech('Hola Hola qué Hola qué te Hola qué te pasó Hola qué te pasó'),'Hola qué te pasó');
assert.equal(csVoiceCleanSpeech('Hola hola'),'Hola hola');
assert.equal(csVoiceCleanSpeech('no no tomo medicación'),'no no tomo medicación');
assert.equal(csVoiceCleanSpeech('hemograma y lipasa hemograma y lipasa hemograma y lipasa'),'hemograma y lipasa');
assert.equal(csMergeSpeech('Hola qué','Hola qué te pasó'),'Hola qué te pasó');
assert.equal(csMergeSpeech('Pedime hemograma','hemograma y lipasa'),'Pedime hemograma y lipasa');
assert.equal(csVoiceNovelText('algún hábito','algún hábito'),'');
assert.equal(csVoiceNovelText('Hola qué te pasó','Hola qué'),'');
assert.equal(csVoiceNovelText('algún hábito','algún hábito y consumo de tabaco'),'y consumo de tabaco');
console.log('Android WebSpeech transcription anti-echo regressions OK');

for(const [raw,expected] of [['Hola Hola cómo Hola cómo estás Hola cómo estás','Hola cómo estás'],['Por Por qué Por qué estás acá','Por qué estás acá'],['tienes tienes tienes tienes alguna tienes alguna otra enfermedad','tienes alguna otra enfermedad']])assert.equal(csVoiceCleanSpeech(raw),expected,'Android screenshot '+raw);
console.log('three reported Android microphone echoes normalized OK');

assert.equal(csVoiceCleanSpeech('Hola Hola Hola probando Hola probando micrófono'),'Hola probando micrófono','latest mobile screenshot exact transcript');
