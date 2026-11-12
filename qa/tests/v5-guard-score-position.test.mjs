import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/v5/web/game.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../../src/v5/web/index.html',import.meta.url),'utf8');
test('guard score and checklist share the upper-left rail in DOM order',()=>{
 assert.match(html,/<div class="guard-rail">\s*<aside id="guardScoreboard"[^>]*><\/aside>\s*<aside id="bedsideChecklist"/);
 const rail=css.match(/\.guard-rail\{([^}]*)\}/)?.[1]||'';
 assert.match(rail,/position:fixed/);
 assert.match(rail,/top:calc\(max\(8px,env\(safe-area-inset-top\)\) \+ 66px\)/);
 assert.match(rail,/left:max\(9px,env\(safe-area-inset-left\)\)/);
});
test('guard scoreboard stays read-only and compacts in portrait and short landscape',()=>{
 assert.match(css,/\.guard-scoreboard\{[^}]*pointer-events:none/);
 assert.match(css,/@media\(max-width:600px\),\(max-height:500px\)\{\s*\.guard-scoreboard\{[^}]*max-width:min\(190px,52vw\)/);
});
