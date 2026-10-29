// Pure presentation routing for authenticated user gestures.
export function uiSoundForTarget(target){
 const button=target?.closest?.('button');
 if(!button||button.disabled)return null;
 const id=button.id||'',action=button.dataset?.action||'';
 if(button.closest?.('.atria-keyboard'))return null;
 if(['audioButton','musicToggleButton'].includes(id))return 'uiTap';
 if(['avatarPreviousColor','avatarNextColor'].includes(id)||button.dataset?.avatarSex)return 'uiChange';
 if(action==='invite-friend'||action==='start-guard'||id==='guardButton')return 'uiInvite';
 if(['coopInviteAccept','friendRequestAccept'].includes(id)||
   ['join-coop','accept-friend','save-profile'].includes(action))return 'uiAccept';
 if(['coopInviteDecline','friendRequestDecline','modalClose'].includes(id)||
   ['close','return-lobby'].includes(action))return 'uiBack';
 if(id==='enterButton'||button.dataset?.mode||button.dataset?.patientAction||
   button.dataset?.destination||id==='receptionButton'||
   button.closest?.('#modal,#hud,#patientWheel,#patientClinicalActions,.avatar-creator,#coopInviteNotice,#friendRequestNotice'))
   return 'uiTap';
 return 'uiTap';
}

// Native selects and checkboxes fire one change after their click. Their click
// target is not a button, so this cannot duplicate the delegated button cue.
export function uiSoundForChange(target){
 if(target?.disabled)return null;
 return target?.tagName==='SELECT'||target?.tagName==='INPUT'&&
  ['checkbox','radio'].includes(target.type)?'uiChange':null;
}
