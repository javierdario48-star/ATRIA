/**
 * Sole DOM owner for chat history. Clinical, acoustic and nurse guidance
 * policies are upstream and provide already-filtered rows. This module
 * never decides who can hear a doctor, administer therapy, or earn XP.
 */
export const PATIENT_FOLLOW_UPS=Object.freeze([
 Object.freeze({label:'Inicio',question:'¿Desde cuándo empezaron los síntomas?'}),
 Object.freeze({label:'Síntomas',question:'¿Qué otros síntomas tiene?'}),
 Object.freeze({label:'Antecedentes',question:'¿Qué antecedentes personales tiene?'})
]);
export function patientFollowUps(text){
 return /no entend[ií] la pregunta\.\s*pod[eé]s preguntarme por el inicio, s[ií]ntomas o antecedentes\./i.test(String(text))?
  PATIENT_FOLLOW_UPS:[];
}
export function createChatTranscript({document,element,history,maxRows=300}){
 if(!document?.createElement||!document?.createTextNode||!element?.replaceChildren||
   !Array.isArray(history)||!Number.isSafeInteger(maxRows)||maxRows<1)
  throw Error('invalid chat transcript presentation');
 let lastView=null;
 function makeLine(name,text,{role,system=false,id}={}){
  const el=document.createElement('div');
  el.className='line'+(role==='patient'||role==='nurse'?' '+role:system?' system':'');
  if(id!==undefined){el.dataset.messageId=id;if(role!==undefined)el.dataset.role=role;}
  const label=document.createElement('b');label.textContent=String(name)+':';
  el.append(label,document.createTextNode(String(text)));
  if(role==='patient'&&patientFollowUps(text).length){
   const options=document.createElement('div');options.className='chat-followups';
   for(const suggestion of PATIENT_FOLLOW_UPS){
    const button=document.createElement('button');button.type='button';
    button.dataset.patientFollowup=suggestion.question;button.textContent=suggestion.label;
    button.setAttribute('aria-label','Preguntar al paciente: '+suggestion.question);
    options.append(button);
   }
   el.append(options);
  }
  return el;
 }
 function append(name,text,system=false){
  lastView=null;
  history.push({name,text,system});
  if(history.length>maxRows)history.shift();
  element.append(makeLine(name,text,{system}));
  while(element.children.length>maxRows)element.firstChild.remove();
  element.scrollTop=element.scrollHeight;
 }
 function replace(rows,previews=[]){
  const view=[...rows,...previews].slice(-maxRows).map(({id,role,name,text})=>({id,role,name,text}));
  const signature=JSON.stringify(view);
  if(signature===lastView)return;
  const scrollTop=element.scrollTop;
  const follow=lastView===null||element.scrollHeight-scrollTop-element.clientHeight<=16;
  const fragment=document.createDocumentFragment();
  history.length=0;
  for(const row of view){
   history.push({name:row.name,text:row.text,system:!!row.role&&row.role!=='player'});
   fragment.append(makeLine(row.name,row.text,{role:row.role,id:row.id}));
  }
  element.replaceChildren(fragment);
  element.scrollTop=follow?element.scrollHeight:scrollTop;
  lastView=signature;
 }
 function clear(){lastView=null;history.length=0;element.replaceChildren();}
 return Object.freeze({append,replace,clear});
}
