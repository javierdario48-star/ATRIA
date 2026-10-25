/**
 * Sole DOM owner for chat history. Clinical, acoustic and nurse guidance
 * policies are upstream and provide already-filtered rows. This module
 * never decides who can hear a doctor, administer therapy, or earn XP.
 */
export function createChatTranscript({document,element,history,maxRows=300}){
 if(!document?.createElement||!document?.createTextNode||!element?.replaceChildren||
   !Array.isArray(history)||!Number.isSafeInteger(maxRows)||maxRows<1)
  throw Error('invalid chat transcript presentation');
 function makeLine(name,text,{role,system=false,id}={}){
  const el=document.createElement('div');
  el.className='line'+(role==='patient'||role==='nurse'?' '+role:system?' system':'');
  if(id!==undefined){el.dataset.messageId=id;if(role!==undefined)el.dataset.role=role;}
  const label=document.createElement('b');label.textContent=String(name)+':';
  el.append(label,document.createTextNode(String(text)));
  return el;
 }
 function append(name,text,system=false){
  history.push({name,text,system});
  if(history.length>maxRows)history.shift();
  element.append(makeLine(name,text,{system}));
  while(element.children.length>maxRows)element.firstChild.remove();
  element.scrollTop=element.scrollHeight;
 }
 function replace(rows,previews=[]){
  const fragment=document.createDocumentFragment();
  history.length=0;
  for(const row of rows){
   history.push({name:row.name,text:row.text,system:row.role!=='player'});
   fragment.append(makeLine(row.name,row.text,{role:row.role,id:row.id}));
  }
  for(const preview of previews){
   history.push({name:preview.name,text:preview.text,system:false});
   fragment.append(makeLine(preview.name,preview.text,{id:preview.id}));
  }
  element.replaceChildren(fragment);
  element.scrollTop=element.scrollHeight;
 }
 function clear(){history.length=0;element.replaceChildren();}
 return Object.freeze({append,replace,clear});
}
