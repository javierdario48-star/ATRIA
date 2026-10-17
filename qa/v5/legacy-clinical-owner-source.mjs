// Characterization ONLY: isolate the exact effective V4 generated fluid writers.
// Never import this script, VM, generated source, or HTML into the V5 runtime.
import {readFileSync} from 'node:fs';
import {apply487} from '../../src/integration/apply-487.js';
const source=apply487(readFileSync(new URL('../../vendor/atria-4.8.6/index.html',import.meta.url),'utf8'));
for(const name of ['initialPhysiology','applyImmediatePhysiology','updatePhysiologyState',
 'progressionOffsets','medicationSafetyOffsets']){
 const re=new RegExp('^function '+name+'\\([^\\n]*$','m');
 const match=re.exec(source);
 if(!match){console.log('ATRIA_LEGACY_WRITER '+name+' NOT_FOUND');continue;}
 const start=match.index,stop=source.indexOf('\n}',start);
 const snippet=stop>start?source.slice(start,stop+2):source.slice(start,start+4500);
 console.log('ATRIA_LEGACY_WRITER '+name+' '+JSON.stringify({
  length:snippet.length,source:snippet.slice(0,14500)
 }));
}
