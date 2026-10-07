export function afterChatSend({input,hideKeyboard=true}={}){if(input){input.value='';input.blur?.()}if(hideKeyboard&&typeof document!=='undefined'&&document.activeElement?.blur)document.activeElement.blur()}
export function clearTransientSpeech(root=document){for(const el of root.querySelectorAll?.('[data-atria-transient-speech]')||[])el.remove()}
export const RETURN_TO_LOBBY_LABEL='Volver al lobby';
