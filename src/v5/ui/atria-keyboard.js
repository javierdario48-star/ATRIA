import {correctEverydayBeforeSpace} from './clinical-autocomplete.js';
/** ATRIA's in-game keyboard. Text editing only: no clinical executor or chat transport. */
export const LETTER_ROWS=Object.freeze(['qwertyuiop','asdfghjklñ','zxcvbnm']);
export const ACCENTED_KEYS=Object.freeze({a:'á',e:'é',i:'í',o:'ó',u:'ú'});
const SYMBOL_ROWS=Object.freeze([['1','2','3','4','5','6','7','8','9','0'],
 ['@','#','$','%','&','-','+','(',')','/'],
 ['¿','?','!',';',':','á','é','í','ó','ú']]);
export function editKeyboardText(value,start,end,key,maxLength=500){
 const text=String(value),a=Math.max(0,Math.min(start,text.length)),b=Math.max(a,Math.min(end,text.length));
 if(key==='backspace'){
  if(a!==b)return {value:text.slice(0,a)+text.slice(b),cursor:a};
  const removed=Array.from(text.slice(0,a)).at(-1)?.length||0;
  return {value:text.slice(0,a-removed)+text.slice(b),cursor:a-removed};
 }
 const chunk=key==='space'?' ':key;
 if(text.length-(b-a)+chunk.length>maxLength)return {value:text,cursor:a};
 return {value:text.slice(0,a)+chunk+text.slice(b),cursor:a+chunk.length};
}
export function createAtriaKeyboard({document,window,input,host,onSubmit,onRecipient,onNurse}){
 if(!host||!input)throw Error('ATRIA keyboard needs a dock and input');
 const root=document.createElement('section');
 root.id='atriaKeyboard';root.className='atria-keyboard';root.setAttribute('aria-label','Teclado ATRIA');
 const toggle=document.getElementById('keyboardToggleButton');
 let open=false,symbols=false,shift=false,disposed=false;
 let lastAutocorrection=null,pendingAccent=null;
 function cancelAccentHold(){
  if(pendingAccent){window.clearTimeout(pendingAccent.timer);pendingAccent=null;}
 }
 const rows=[];
 function makeKey(label,value,wide=false){
  const key=document.createElement('button');key.type='button';key.className='atria-key';
  if(wide)key.classList.add('wide');
  key.textContent=label;key.dataset.key=value;
  if(ACCENTED_KEYS[value]){
   key.dataset.accent=ACCENTED_KEYS[value];
   key.title='Mantener presionada para '+ACCENTED_KEYS[value];
  }
  key.setAttribute('aria-label',ACCENTED_KEYS[value]?
   label+', mantener para '+ACCENTED_KEYS[value]:value==='backspace'?'Borrar':value==='shift'?'Mayúsculas':
   value==='space'?'Espacio':value==='send'?'Enviar mensaje':value==='recipient'?'Cambiar interlocutor':
   value==='symbols'?'Alternar símbolos':value==='nurse'?'Dirigirse a enfermera':label);
  return key;
 }
 for(let row=0;row<4;row++){const div=document.createElement('div');div.className='atria-key-row row-'+row;root.append(div);rows.push(div);}
 function paint(){
  const rowData=symbols?SYMBOL_ROWS:LETTER_ROWS.map(x=>Array.from(x));
  for(let i=0;i<3;i++){
   rows[i].replaceChildren();
   if(i===2)rows[i].append(makeKey(shift?'⇧':'⇧','shift',true));
   for(const key of rowData[i])rows[i].append(makeKey(shift?key.toUpperCase():key,key));
   if(i===2)rows[i].append(makeKey('⌫','backspace',true));
  }
  rows[3].replaceChildren(makeKey(symbols?'ABC':'123','symbols',true),makeKey('Enf.','nurse',true),
   makeKey('ATRIA','space',true),makeKey('.','.'),makeKey('➤','send',true));
  rows[3].querySelector('[data-key="space"]').classList.add('space');
  rows[3].querySelector('[data-key="send"]').classList.add('send');
  rows[3].querySelector('[data-key="nurse"]').classList.add('recipient');
  root.hidden=!open;document.body.classList.toggle('atria-keyboard-open',open);
  input.setAttribute('inputmode',open?'none':'text');
  if(toggle){toggle.setAttribute('aria-pressed',String(open));toggle.setAttribute('aria-label',open?'Ocultar teclado ATRIA':'Mostrar teclado ATRIA');}
 }
 function setOpen(value){if(disposed)return;cancelAccentHold();open=!!value;paint();}
 function onKey(event){
  const button=event.target.closest('button[data-key]');if(!button||!root.contains(button))return;
  const key=button.dataset.key;
  if(key==='backspace'&&lastAutocorrection&&
   input.value===lastAutocorrection.after&&input.selectionStart===lastAutocorrection.cursor&&
   input.selectionEnd===lastAutocorrection.cursor){
   input.value=lastAutocorrection.before;
   const restored=lastAutocorrection.start;
   input.setSelectionRange(restored,restored);lastAutocorrection=null;
   input.dispatchEvent(new window.Event('input',{bubbles:true}));return;
  }
  lastAutocorrection=null;
  if(key==='send'){onSubmit?.();return;}
  if(key==='recipient'){onRecipient?.();return;}
  if(key==='nurse'){onNurse?.();return;}
  if(key==='symbols'){symbols=!symbols;shift=false;paint();return;}
  if(key==='shift'){shift=!shift;paint();return;}
  if(document.activeElement!==input)input.focus({preventScroll:true});
  const chosen=shift&&key.length===1?key.toUpperCase():key;
  const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;
  const fix=key==='space'&&start===end?correctEverydayBeforeSpace(input.value,start):null;
  const change=editKeyboardText(fix?.value??input.value,fix?.cursor??start,
   fix?.cursor??end,chosen,input.maxLength>0?input.maxLength:500);
  if(fix&&key==='space')lastAutocorrection={
   before:input.value,after:change.value,cursor:change.cursor,start:start
  };
  input.value=change.value;input.setSelectionRange(change.cursor,change.cursor);
  input.dispatchEvent(new window.Event('input',{bubbles:true,inputType:'insertText'}));
  if(shift){shift=false;paint();}
 }
 // Physical touch registration cannot depend on a subsequent synthetic click:
 // a slight finger movement may cancel click on Android.
 const handledTouch=new WeakMap();
 function onPointerDown(event){
  const button=event.target.closest('button[data-key]');
  if(!button||!root.contains(button))return;
  event.preventDefault();
  if(event.pointerType==='touch'||event.pointerType==='pen'){
   handledTouch.set(button,Date.now());
   onKey(event);
   const base=button.dataset.key;
   if(ACCENTED_KEYS[base]){
    const cursor=input.selectionStart??0,expected=input.value,pressed=event.pointerId;
    pendingAccent={
     pointerId:pressed,startX:event.clientX,startY:event.clientY,
     timer:window.setTimeout(()=>{
      if(!pendingAccent||pendingAccent.pointerId!==pressed)return;
      pendingAccent=null;
      if(input.value!==expected||input.selectionStart!==cursor||
       input.selectionEnd!==cursor||cursor<1)return;
      const source=input.value.slice(cursor-1,cursor);
      if(source.toLowerCase()!==base)return;
      const accent=source===source.toUpperCase()?
       ACCENTED_KEYS[base].toUpperCase():ACCENTED_KEYS[base];
      const result=editKeyboardText(input.value,cursor-1,cursor,accent,
       input.maxLength>0?input.maxLength:500);
      input.value=result.value;input.setSelectionRange(result.cursor,result.cursor);
      input.dispatchEvent(new window.Event('input',{bubbles:true,inputType:'insertReplacementText'}));
     },440)
    };
   }
  }
 }
 function onPointerMove(event){
  if(pendingAccent&&pendingAccent.pointerId===event.pointerId&&
   Math.hypot(event.clientX-pendingAccent.startX,event.clientY-pendingAccent.startY)>16)
   cancelAccentHold();
 }
 function onPointerEnd(event){
  if(event.pointerType==='touch'||event.pointerType==='pen'){
   const button=event.target.closest?.('button[data-key]');
   if(button&&root.contains(button))handledTouch.set(button,Date.now());
  }
  if(pendingAccent&&pendingAccent.pointerId===event.pointerId)cancelAccentHold();
 }
 function onClick(event){
  const button=event.target.closest('button[data-key]');
  if(button&&Date.now()-(handledTouch.get(button)||0)<950)return;
  onKey(event);
 }
 const onToggle=()=>setOpen(!open);
 root.addEventListener('pointerdown',onPointerDown,{passive:false});
 root.addEventListener('pointermove',onPointerMove);
 root.addEventListener('pointerup',onPointerEnd);
 root.addEventListener('pointercancel',onPointerEnd);
 root.addEventListener('click',onClick);
 toggle?.addEventListener('click',onToggle);
 host.append(root);
 setOpen(!!(window.matchMedia?.('(pointer: coarse)').matches||window.innerWidth<=700));
 return Object.freeze({isOpen:()=>open,setOpen,element:root,listenerCount:()=>disposed?0:(toggle?3:2),destroy(){
  if(disposed)return;disposed=true;
  cancelAccentHold();
  root.removeEventListener('pointerdown',onPointerDown);
  root.removeEventListener('pointermove',onPointerMove);
  root.removeEventListener('pointerup',onPointerEnd);
  root.removeEventListener('pointercancel',onPointerEnd);
  root.removeEventListener('click',onClick);
  toggle?.removeEventListener('click',onToggle);root.remove();
  document.body.classList.remove('atria-keyboard-open');input.setAttribute('inputmode','text');
 }});
}
