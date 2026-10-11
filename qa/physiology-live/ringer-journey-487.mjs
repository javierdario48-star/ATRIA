/** QA test port for the actual generated nursing/clinical functions. Admission
 * presentation is not emulated here; the browser bootstrap binds startCase. */
import {installPhysiologyQABootstrap487} from '../../src/integration/physiology-qa-bootstrap-487.js';
import * as ownerModule from '../../src/integration/physiology-ringer-owner-487.js';
import * as observerModule from '../../src/integration/physiology-qa-observer-487.js';
export function nativeRingerPort487(r){const c=r.ctx;return {
 read:()=>({patient:c.sim,caseDef:c.C,
  mode:['coop','competitive'].includes(c.selectedPlayMode)?c.selectedPlayMode:c.sim?.playMode||c.selectedPlayMode,
  hidden:c.document.visibilityState==='hidden',shiftActive:!!c.shiftSession?.active,
  nursingBusy:!!c.nurse?.task||!!c.nurse?.queue?.length,
  nativeRate:(['dieInput','monitorMedInput'].includes(c.document.activeElement?.id)||c.document.body.classList.contains('keyboardOpen'))?.03:.12}),
 getAdministration:()=>c.recordAdministration,setAdministration:f=>{c.recordAdministration=f;},
 getUpdate:()=>c.updateSimulation,setUpdate:f=>{c.updateSimulation=f;},
 getImmediate:()=>c.applyImmediatePhysiology,setImmediate:f=>{c.applyImmediatePhysiology=f;},
 getPhysiology:()=>c.updatePhysiologyState,setPhysiology:f=>{c.updatePhysiologyState=f;},
 getProgression:()=>c.progressionOffsets,setProgression:f=>{c.progressionOffsets=f;},
 getDelivery:()=>c.addMonitorTherapy,setDelivery:f=>{c.addMonitorTherapy=f;},
 getNursing:()=>c.nurseNatural,setNursing:f=>{c.nurseNatural=f;},parseNursing:text=>c.window.csNurseVoice487.parse(text),
 getAdmission:()=>c.startCase,setAdmission:f=>{c.startCase=f;},
 resolveDelivery:text=>{const t=c.findMonitorTherapy(text);if(t)t.dose=c.parseTherapyOrder(text,t);return t;},
 rejectDelivery:reason=>c.nurseSay(reason)
};}
export async function enableNativeRinger487(r){
 const api=installPhysiologyQABootstrap487(r.ctx.window,nativeRingerPort487(r),async()=>observerModule,async()=>ownerModule);
 await api.enableRinger();return api;
}
