// Follow the actual public HUD. Grouped actions must be opened through the
// visible menu; never force-click an element hidden by a collapsed details.
export async function clickHudAction(page,id){
 const action=page.locator('#'+id);
 if(!await action.isVisible())await page.locator('#hudMenu > summary').click();
 await action.click();
}

// Compact screens expose the same music channel in the public Audio dialog.
export async function musicControl(page){
 const shortcut=page.locator('#musicToggleButton');
 if(await shortcut.isVisible())return {action:shortcut,close:async()=>{}};
 await clickHudAction(page,'audioButton');
 return {action:page.locator('[data-audio-channel="music"]'),close:()=>page.locator('#modalClose').click()};
}
