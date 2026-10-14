import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const css=fs.readFileSync('src/ui/atria-ux-lab.css','utf8');
const boot=fs.readFileSync('src/ui/atria-ux-lab.js','utf8');
const build=fs.readFileSync('build.js','utf8');

function select(query) {
  const attrs=new Map(), document={documentElement:{setAttribute(k,v){attrs.set(k,v)}}};
  const window={location:{search:query}};
  vm.runInNewContext(boot,{window,document,URLSearchParams,Object});
  return {variant:attrs.get('data-atria-ui'),lab:window.__ATRIA_VISUAL_LAB__};
}
assert.equal(select('').variant,undefined,'default 4.8.7 must stay unchanged');
assert.equal(select('?atria-ui=unknown').variant,undefined,'invalid variants must be inert');
assert.equal(select('?atria-ui=immersive').variant,'immersive');
assert.equal(select('?atria-ui=tactical').variant,'tactical');
assert.equal(select('?atria-ui=%3Cscript%3E').variant,undefined);
for(const name of ['immersive','tactical'])assert(css.includes('html[data-atria-ui="'+name+'"]'),'missing variant '+name);
assert(css.includes('body.keyboardOpen #chatDock'),'Gboard composer treatment required');
assert(css.includes('display:none!important'),'keyboard must not show the empty transcript');
assert(css.includes('font:500 16px/1.35'),'mobile keyboard must use readable font');
assert(css.includes('historyExpanded'),'chat history must remain navigable');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'balanced CSS blocks');
for(const asset of ['atria-ux-lab.css','atria-ux-lab.js']) {
  assert(build.includes("'src/ui/'+asset"),'build must copy sources unchanged');
  assert(build.includes('"/'+asset+'"'),'built html must link '+asset);
}
assert(!/replace\s*\(/.test(build),'keep build free of runtime string patches');
console.log('ATRIA UX lab: baseline isolation, variants, keyboard and build contract OK');
