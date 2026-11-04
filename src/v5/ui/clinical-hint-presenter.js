// Patient-selection/lifecycle guard for the private Vega hint. A fee event is
// sent only after the verified instruction was actually rendered and painted.
const same=(a,b)=>!!a&&!!b&&['roomId','encounterId','patientUid','actorId','selectionRevision']
 .every(key=>(a[key]??0)===(b[key]??0));
export function createClinicalHintPresenter({context,request,show,hide,notify,paint=()=>Promise.resolve(),visible=()=>true,
 id=()=>crypto.randomUUID(),onCount=()=>{}}){
 let generation=0,active=null;
 const current=(g,b)=>generation===g&&same(context(),b);
 function cancel(){generation++;const old=active;active=null;hide();
  if(old?.offerId)void request({...old.binding,op:'cancel',requestId:id(),offerId:old.offerId}).catch(()=>{});
 }
 return Object.freeze({
  cancel,
  maintain(){if(active&&!same(context(),active.binding))cancel();},
  async reveal(){
   cancel();const binding=context(),g=generation;if(!binding)return;
   active={binding};
   const call=(op,offerId)=>request({...binding,op,requestId:id(),...(offerId?{offerId}:{})});
   try{
    const prepared=await call('prepare');
    if(!current(g,binding))return;
    if(prepared.status!=='prepared'){notify('No hay una pista disponible para esta atención. No se descontó XP.');return;}
    active.offerId=prepared.offerId;
    const verified=await call('revalidate',prepared.offerId);
    if(!current(g,binding))return;
    if(verified.status!=='verified'||!same(verified,binding)||!verified.text){
     notify('El estado del paciente cambió. Vuelve a consultar; no se descontó XP.');return;
    }
    if(!visible()||show(verified)===false)return;
    await paint();
    if(!current(g,binding)||!visible()){if(current(g,binding))hide();return;}
    const receipt=await call('displayed',prepared.offerId);
    if(!current(g,binding))return;
    if(receipt?.status==='displayed')onCount(receipt.hintCount);
    else{hide();notify('El estado de la atención cambió. Esta pista no se cobró.');}
   }catch{if(current(g,binding)){hide();notify('No se pudo confirmar la pista. Revisa la conexión.');}}
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
  hide(){root.hidden=true;delete root.dataset.patientUid;delete root.dataset.encounterId;},
  destroy(){root.remove();}
 });
}
