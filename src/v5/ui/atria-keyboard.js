import {correctEverydayBeforeSpace} from './clinical-autocomplete.js';
/** ATRIA's in-game keyboard. Text editing only: no clinical executor or chat transport. */
export const LETTER_ROWS=Object.freeze(['qwertyuiop','asdfghjklñ','zxcvbnm']);
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
 const rows=[];
 function makeKey(label,value,wide=false){
  const key=document.createElement('button');key.type='button';key.className='atria-key';
  if(wide)key.classList.add('wide');
  key.textContent=label;key.dataset.key=value;
  key.setAttribute('aria-label',value==='backspace'?'Borrar':value==='shift'?'Mayúsculas':
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
 function setOpen(value){if(disposed)return;open=!!value;paint();}
 function onKey(event){
  const button=event.target.closest('button[data-key]');if(!button||!root.contains(button))return;
  const key=button.dataset.key;
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
  }
 }
 function onClick(event){
  const button=event.target.closest('button[data-key]');
  if(button&&Date.now()-(handledTouch.get(button)||0)<950)return;
  onKey(event);
 }
 const onToggle=()=>setOpen(!open);
 root.addEventListener('pointerdown',onPointerDown,{passive:false});
 root.addEventListener('click',onClick);
 toggle?.addEventListener('click',onToggle);
 host.append(root);
 setOpen(!!(window.matchMedia?.('(pointer: coarse)').matches||window.innerWidth<=700));
 return Object.freeze({isOpen:()=>open,setOpen,element:root,listenerCount:()=>disposed?0:(toggle?3:2),destroy(){
  if(disposed)return;disposed=true;
  root.removeEventListener('pointerdown',onPointerDown);root.removeEventListener('click',onClick);
  toggle?.removeEventListener('click',onToggle);root.remove();
  document.body.classList.remove('atria-keyboard-open');input.setAttribute('inputmode','text');
 }});
}
