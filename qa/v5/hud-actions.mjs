// Follow the actual public HUD. Grouped actions must be opened through the
// visible menu; never force-click an element hidden by a collapsed details.
export async function clickHudAction(page,id){
 const action=page.locator('#'+id);
 if(!await action.isVisible())await page.locator('#hudMenu > summary').click();
 await action.click();
}
