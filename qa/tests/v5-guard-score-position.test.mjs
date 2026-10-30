import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/v5/web/game.css',import.meta.url),'utf8');
const px=(rule)=>Number(rule.match(/top:calc\((\d+)px \+ env\(safe-area-inset-top\)\)/)?.[1]);
test('guard score is raised and remains above the prior guard offsets',()=>{
 // The mobile media block also contains the clock's rules. Stopping at its
 // first closing brace incorrectly reported the existing score rule missing.
 const [desktop,mobile]=[...css.matchAll(/body\[data-phase="guard"\] \.guard-scoreboard\{[^}]*\}/g)].map(x=>x[0]);
 assert.ok(desktop,'guard-specific desktop score position missing');
 assert.ok(mobile,'guard-specific mobile score position missing');
 assert.ok(px(desktop)>=121&&px(desktop)<141);
 assert.ok(px(mobile)>=112&&px(mobile)<130);
 assert.ok(px(mobile)<px(desktop));
});
test('guard scoreboard is read-only and remains horizontally centered',()=>{
 assert.match(css,/\.guard-scoreboard\{[^}]*left:50%;transform:translateX\(-50%\)/);
 assert.match(css,/\.guard-scoreboard\{[^}]*pointer-events:none/);
});
