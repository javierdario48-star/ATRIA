import {awaitAbortable} from '../core/abortable-operation.js';

// Patient-selection/lifecycle guard for the private Vega hint. A fee event is
// sent only after the verified instruction was actually rendered and painted.
const same=(a,b)=>!!a&&!!b&&['roomId','encounterId','patientUid','actorId','selectionRevision']
 .every(key=>(a[key]??0)===(b[key]??0));
export function createClinicalHintPresenter({context,request,show,hide,notify,paint=()=>Promise.resolve(),visible=()=>true,
 id=()=>crypto.randomUUID(),onCount=()=>{},pending=()=>{}}){
 let generation=0,active=null;
 const current=(g,b)=>generation===g&&same(context(),b);
 function cancel(){generation++;const old=active;active=null;hide();
  if(old?.awaiting)pending(false);
  if(old?.offerId)void request({...old.binding,op:'cancel',requestId:id(),offerId:old.offerId}).catch(()=>{});
 }
 async function present(binding,g,deadline){
  const call=(op,offerId,extra={})=>request({...binding,op,requestId:id(),...(offerId?{offerId}:{}),...extra});
  deadline.throwIfAborted();
  const prepared=await awaitAbortable(call('prepare',null,{verify:true}),deadline);
  if(!current(g,binding))return;
  if(prepared.status==='stale')return 'stale';
  if(!['prepared','verified'].includes(prepared.status)){
   notify('No hay una pista disponible para esta atención. No se descontó XP.');return;
  }
  active.offerId=prepared.offerId;
  const verified=prepared.status==='verified'?prepared:await awaitAbortable(call('revalidate',prepared.offerId),deadline);
  if(!current(g,binding))return;
  if(verified.status==='stale')return 'stale';
  if(verified.status!=='verified'||!same(verified,binding)||!verified.text)return 'rejected';
  pending(false);
  if(!visible()||show(verified)===false)return;
  await awaitAbortable(paint(),deadline);
  if(!current(g,binding)||!visible()){if(current(g,binding))hide();return;}
  const receipt=await awaitAbortable(call('displayed',prepared.offerId),deadline);
  if(!current(g,binding))return;
  if(receipt?.status==='displayed'){delete active.offerId;onCount(receipt.hintCount);return;}
  hide();return receipt?.status||'rejected';
 }
 return Object.freeze({
  cancel,
  maintain(){if(active&&!same(context(),active.binding))cancel();},
  async reveal(){
   const binding=context();
   if(active?.awaiting&&same(active.binding,binding))return;
   cancel();const g=generation;if(!binding)return;
   active={binding,awaiting:true};pending(true);
   try{
    const deadline=AbortSignal.timeout(20000);
    let status=await present(binding,g,deadline);
    if(status==='stale'&&current(g,binding)&&visible()){
     // A receipt can change the next action between verification and paint.
     // Refresh once within the original tap and keep the original deadline.
     delete active.offerId;pending(true);
     status=await present(binding,g,deadline);
    }
    if(status&&current(g,binding))notify('El estado de la atención cambió. Esta pista no se cobró.');
   }catch{if(current(g,binding)){hide();notify('No se pudo confirmar la pista. Revisa la conexión.');}}
   finally{if(generation===g){active.awaiting=false;pending(false);}}
  }
 });
}

export function createVegaHintCard({document,portraitUrl}){
 const root=document.createElement('section');root.className='vega-clinical-hint';root.id='vegaClinicalHint';
 root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const portrait=document.createElement('img');portrait.src=portraitUrl;portrait.alt='';portrait.className='vega-hint-portrait';
 const body=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),bed=document.createElement('small');
 title.textContent='Dr. Vega — Pista clínica';body.append(title,bed,text);
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Cerrar pista clínica');
 root.append(portrait,body,close);document.body.append(root);
 return Object.freeze({root,close,
  show(hint,patientLabel){
   if(document.visibilityState==='hidden')return false;
   text.textContent=hint.text;bed.textContent=patientLabel||'Paciente seleccionado';
   root.dataset.patientUid=hint.patientUid;root.dataset.encounterId=hint.encounterId;root.hidden=false;
   return root.isConnected;
  },
  position(hudBottom){
   if(!root.hidden&&Number.isFinite(hudBottom))root.style.top=Math.max(8,Math.ceil(hudBottom)+8)+'px';
  },
  hide(){root.hidden=true;delete root.dataset.patientUid;delete root.dataset.encounterId;},
  destroy(){root.remove();}
 });
}
