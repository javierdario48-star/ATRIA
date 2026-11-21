// Immutable, retrievable clinical/mode contracts. Export a historical version,
// never mutate the repository or infer rules from the newest runtime.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function loadAtriaRules(version='1.0.0'){
 if(!/^\\d+\\.\\d+\\.\\d+$/.test(version))throw Error('invalid rule version');
 const file=resolve(repo,'docs/contracts/ATRIA-V5-RULES-v'+version+'.json');
 const rule=JSON.parse(readFileSync(file,'utf8'));
 if(rule.schema!=='atria.v5.extractable-rules.v1'||rule.version!==version||
  Object.keys(rule.modes||{}).sort().join(',')!=='apprentice,competitive,coop,solo'||
  rule.clinical?.physiologyOwner!=='existing native clinical physiology and nursing-time engine')
  throw Error('invalid ATRIA rules snapshot');
 return rule;
}
export function exportAtriaRules(version='1.0.0',destination='out-v5/contracts'){
 const rule=loadAtriaRules(version);
 const out=resolve(destination,'ATRIA-V5-RULES-v'+version+'.json');
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify(rule,null,2)+'\n');
 return out;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const versionArg=process.argv.indexOf('--version'),outArg=process.argv.indexOf('--out');
 const version=versionArg<0?'1.0.0':process.argv[versionArg+1];
 const out=outArg<0?'out-v5/contracts':process.argv[outArg+1];
 if(!version||!out)throw Error('usage: node scripts/export-atria-v5-rules.mjs --version 1.0.0 --out /tmp/export');
 console.log(exportAtriaRules(version,out));
}
