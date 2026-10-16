// ATRIA V5 structural guard. Read-only source inspection, no legacy execution.
// A passing legacy test suite does NOT certify these features are migrated.
import fs from 'node:fs/promises';
import path from 'node:path';

const root='src/v5',sources=[];
async function visit(dir){
 for(const x of await fs.readdir(dir,{withFileTypes:true})){
  const p=path.posix.join(dir,x.name);
  if(x.isDirectory())await visit(p);
  else if(p.endsWith('.js')&&!p.endsWith('.test.js'))sources.push(p);
 }
}
await visit(root);
const forbidden=[
 ['old HTML/string patchers',/\b(?:apply487|replaceOnce|document\.write)\s*\(/],
 ['dynamic source evaluation',/\b(?:eval|new\s+Function)\s*\(/],
 ['unowned interval loop',/\bsetInterval\s*\(/],
 ['unowned delayed action',/\bsetTimeout\s*\(/]
];
const errors=[];
for(const filename of sources){
 const code=await fs.readFile(filename,'utf8');
 for(const [description,regex] of forbidden)if(regex.test(code))errors.push(filename+': '+description);
 if(filename!=='src/v5/app/application.js'&&/\brequestAnimationFrame\s*\(/.test(code))
  errors.push(filename+': a second animation loop outside the application owner');
 if(filename.startsWith('src/v5/ui/')&&
   /from\s*['"]\.\.\/(?:adapters\/|core\/room-authority|clinical\/(?:cirr-care|app-care|guard-session))/.test(code))
  errors.push(filename+': UI importing the clinical executor or authority');
 if(/(?:from\s*['"]|import\s*\(['"])(?:\.\.\/)+integration\//.test(code))
  errors.push(filename+': direct dependency on a legacy patch bundle');
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log('V5 structural boundary OK: '+sources.length+' production modules; one RAF owner, no string patcher, new timer or second clinical executor in UI.');
