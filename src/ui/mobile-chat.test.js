import assert from'node:assert/strict';import{afterChatSend,clearTransientSpeech,RETURN_TO_LOBBY_LABEL}from'./mobile-chat.js';
let n=0;const input={value:'x',blur(){n++}};afterChatSend({input,hideKeyboard:false});assert.equal(input.value,'');assert.equal(n,1);assert.equal(RETURN_TO_LOBBY_LABEL,'Volver al lobby');
let removed=0;const root={querySelectorAll(sel){assert.equal(sel,'[data-atria-transient-speech]');return[{remove(){removed++}},{remove(){removed++}}]}};clearTransientSpeech(root);assert.equal(removed,2,'mode/lobby transition must clear stale speech bubbles');
console.log('mobile chat OK');
