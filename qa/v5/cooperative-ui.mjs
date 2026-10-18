// Public-UI helpers shared by the independently launched 2/3/4-browser runs.
export const state=p=>p.evaluate(()=>atriaV5.snapshot());
export const clinical=async p=>(await state(p)).clinical;
export async function send(p,text){const before=(await clinical(p)).room.transcript.length;
 await p.locator('#dieInput').fill(text);await p.locator('#chatForm [type="submit"]').click();await p.locator('#dieInput').blur();
 await p.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);
}
export async function walk(p,lastX=144){
 for(const [x,y] of [[496,1200],[496,1080],[496,960],[496,840],[496,720],[400,580],[250,470],[lastX,420]]){
  await p.waitForFunction(()=>{const s=atriaV5.snapshot(),c=atriaV5.diagnostics().renderer.camera;return Math.abs(c.x-s.player.x)<1&&Math.abs(c.y-s.player.y)<1;});
  const r=await p.evaluate(()=>atriaV5.diagnostics().renderer),point={x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY};
  await p.locator('#game').click({position:point});await p.waitForFunction(()=>atriaV5.snapshot().player.moving);await p.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
}
export async function study(p,id){await p.locator('#peopleButton').click();await p.locator('[data-action="studies"]').click();await p.locator('#studyChoice').selectOption(id);await p.locator('[data-action="request-study"]').click();}
