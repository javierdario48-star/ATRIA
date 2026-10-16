import test from 'node:test';
import assert from 'node:assert/strict';
import {LETTER_ROWS,editKeyboardText} from './atria-keyboard.js';

test('compact four-row layout retains Spanish ñ and complete alphabet',()=>{
 assert.equal(LETTER_ROWS.length,3);
 assert.equal(LETTER_ROWS[0],'qwertyuiop');
 assert(LETTER_ROWS[1].includes('ñ'));
 assert.equal(new Set(LETTER_ROWS.join('').split('')).size,27);
});
test('keyboard inserts at caret and replaces only selection',()=>{
 assert.deepEqual(editKeyboardText('Ringer',3,3,' '),{value:'Rin ger',cursor:4});
 assert.deepEqual(editKeyboardText('abc def',1,5,'ñ'),{value:'añef',cursor:2});
 assert.deepEqual(editKeyboardText('',0,0,'space'),{value:' ',cursor:1});
});
test('backspace handles selections and surrogate pairs without corruption',()=>{
 assert.deepEqual(editKeyboardText('casa',1,3,'backspace'),{value:'ca',cursor:1});
 assert.deepEqual(editKeyboardText('a😀b',3,3,'backspace'),{value:'ab',cursor:1});
 assert.deepEqual(editKeyboardText('x',0,0,'backspace'),{value:'x',cursor:0});
});
test('maxlength is enforced for accented text and medical orders',()=>{
 assert.deepEqual(editKeyboardText('abcd',4,4,'x',4),{value:'abcd',cursor:4});
 assert.deepEqual(editKeyboardText('cef',3,3,'triaxona 1 g',50),
  {value:'ceftriaxona 1 g',cursor:15});
});
