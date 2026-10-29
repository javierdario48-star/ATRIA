import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/v5/web/game.css',import.meta.url),'utf8');
const px=(rule)=>Number(rule.match(/top:calc\((\d+)px \+ env\(safe-area-inset-top\)\)/)?.[1]);
test('guard score is raised and remains above the prior guard offsets',()=>{
 const desktop=css.match(/body\[data-phase="guard"\] \.guard-scoreboard\{[^}]*\}/)?.[0];
 const mobile=css.match(/@media\(max-width:430px\)\{[^}]*body\[data-phase="guard"\] \.guard-scoreboard\{[^}]*\}/)?.[0];
 assert.ok(desktop,'guard-specific desktop score position missing');
 assert.ok(mobile,'guard-specific mobile score position missing');
 assert.equal(px(desktop),121);
 assert.equal(px(mobile),112);
 assert.ok(px(mobile)<px(desktop));
});
test('guard scoreboard is read-only and remains horizontally centered',()=>{
 assert.match(css,/\.guard-scoreboard\{[^}]*left:50%;transform:translateX\(-50%\)/);
 assert.match(css,/\.guard-scoreboard\{[^}]*pointer-events:none/);
});
