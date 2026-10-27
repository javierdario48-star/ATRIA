/** Account navigation only. Cookies and all identity decisions remain on the server. */
export function createWelcomeFlow({document,window,account,avatar,listen,prepareNew,onEnter,onLogout,clientKey}){
 const el=id=>document.getElementById(id),root=el('splash'),rememberKey='atria.v5.remembered-doctor';
 let step='loading',available=false,busy=false,name='',returning=null;
 const fitViewport=()=>{if(!window.visualViewport)return;
  root.style.height=window.visualViewport.height+'px';root.style.top=window.visualViewport.offsetTop+'px';
  if(!root.hidden&&root.contains(document.activeElement))document.activeElement.scrollIntoView({block:'nearest'});
 };
 if(window.visualViewport){listen(window.visualViewport,'resize',fitViewport);listen(window.visualViewport,'scroll',fitViewport);fitViewport();}

 const remembered=()=>{try{return JSON.parse(window.localStorage.getItem(rememberKey)||'null');}catch{return null;}};
 function remember(a,keep){try{if(keep)window.localStorage.setItem(rememberKey,JSON.stringify({name:a.name,loginName:a.loginName||a.username}));else window.localStorage.removeItem(rememberKey);}catch{}}
 function show(next,title,subtitle=''){
  step=next;root.dataset.step=next;root.hidden=false;
  el('welcomeTitle').textContent=title;el('welcomeSubtitle').textContent=subtitle;
  for(const [id,s] of [['welcomeNameForm','name'],['profileForm','avatar'],['welcomePasswordForm','password'],['welcomeLoginForm','login'],['welcomeReturning','returning'],['welcomeLoading','loading']])el(id).hidden=next!==s;
  for(const id of ['accountLoginButton','welcomeNew','welcomeBack','welcomeLogout','welcomeRetry'])el(id).hidden=true;
  el('welcomeError').hidden=true;
  el('practiceNameLabel').hidden=available;
  el('playerName').readOnly=available;
  if(next==='name')el('accountLoginButton').hidden=false;
  if(next==='avatar'||next==='password'||next==='login')el('welcomeBack').hidden=false;
  if(next==='returning'){el('accountLoginButton').hidden=false;el('accountLoginButton').textContent='Usar otra cuenta';el('welcomeNew').hidden=false;el('welcomeLogout').hidden=!returning;}
 }
 function error(e){el('welcomeError').textContent=e.message||'No se pudo continuar. Reintenta.';el('welcomeError').hidden=false;}
 async function run(fn){if(busy)return;busy=true;root.setAttribute('aria-busy','true');for(const b of root.querySelectorAll('button'))b.disabled=true;
  try{await fn();}catch(e){error(e);}finally{busy=false;root.removeAttribute('aria-busy');for(const b of root.querySelectorAll('button'))b.disabled=false;}}
 function home(){
  returning=account.read();const saved=returning||remembered();
  if(saved){show('returning',returning?'Bienvenido de nuevo, '+saved.name:'Vuelve a entrar, '+saved.name,
    returning?.needsUniqueName?'Tu acceso anterior sigue siendo «'+returning.loginName+'». Puedes elegir un nombre único desde Perfil.':returning?'Tu médico está listo para volver al hospital.':'Tu sesión venció. Ingresa tu contraseña para recuperar el progreso.');
   el('welcomeContinue').textContent=returning?'Continuar como '+saved.name:'Entrar como '+saved.name;
  }else{show('name','¿Cómo quieres que te llamen?','Tu historia en ATRIA comienza con tu nombre.');el('accountLoginButton').textContent='Ya tengo una cuenta';}
 }
 async function enter(a,fresh=false){
  show('loading',(fresh?'Bienvenido a ATRIA, ':'Bienvenido de nuevo, ')+a.name);el('hospitalLoadText').textContent='Preparando el hospital...';el('hospitalLoadProgress').value=25;
  try{await onEnter(a,{fresh,progress:value=>{el('hospitalLoadProgress').value=value;}});root.hidden=true;}
  catch(e){home();error(e);}
 }
 async function logout(){await onLogout();returning=null;remember(null,false);}
 async function newDoctor(){if(account.read())await logout();await prepareNew();name='';el('doctorName').value='';el('newDoctorPassword').value='';show('name','¿Cómo quieres que te llamen?','Tu historia en ATRIA comienza con tu nombre.');el('accountLoginButton').textContent='Ya tengo una cuenta';}
 function login(){show('login','Ya tengo una cuenta','Recupera tu médico y tu progreso desde cualquier dispositivo.');el('loginDoctorName').value=(account.read()||remembered())?.loginName||'';el('loginDoctorPassword').value='';}
 listen(el('welcomeNameForm'),'submit',e=>{e.preventDefault();void run(async()=>{
  const result=await account.call('name-status',{name:el('doctorName').value});
  if(!result.available)throw Error('Ese nombre de médico ya está ocupado. Elige otro.');
  name=result.displayName;el('playerName').value=name;show('avatar',name,'Elige tu apariencia y el color del ambo.');el('enterButton').textContent='Continuar';await avatar.repaint();
 });});
 listen(el('welcomePasswordForm'),'submit',e=>{e.preventDefault();void run(async()=>{
  const a=avatar.read();let result;
  try{result=await account.call('register',{name,password:el('newDoctorPassword').value,remember:el('rememberNewDoctor').checked,sex:a.sex,scrubColor:a.color,clientKey:clientKey(),newCharacter:true});}
  catch(e){if(e.status===409){show('name','¿Cómo quieres que te llamen?','Elige un nombre disponible.');}throw e;}
  el('newDoctorPassword').value='';remember(result.account,el('rememberNewDoctor').checked);await enter(result.account,true);
 });});
 listen(el('welcomeLoginForm'),'submit',e=>{e.preventDefault();void run(async()=>{
  if(account.read())await logout();
  const result=await account.call('login',{name:el('loginDoctorName').value,password:el('loginDoctorPassword').value,remember:el('rememberLoginDoctor').checked});
  el('loginDoctorPassword').value='';remember(result.account,el('rememberLoginDoctor').checked);await enter(result.account);
 });});
 listen(el('accountLoginButton'),'click',login);
 listen(el('welcomeContinue'),'click',()=>{if(!returning){login();return;}void run(()=>enter(returning));});
 listen(el('welcomeNew'),'click',()=>{void run(newDoctor);});
 listen(el('welcomeLogout'),'click',()=>{void run(async()=>{await logout();home();});});
 listen(el('welcomeBack'),'click',()=>{
  if(step==='password'){show('avatar',name,'Elige tu apariencia y el color del ambo.');void avatar.repaint();}
  else if(step==='avatar'){show('name','¿Cómo quieres que te llamen?');}
  else home();
 });
 async function restore(){
  show('loading','Bienvenido a ATRIA');el('hospitalLoadText').textContent='Recuperando tu cuenta...';
  try{await account.restore();available=account.enabled();
   if(!available){show('avatar','Tu médico de práctica','Esta instalación conserva el modo de práctica local.');el('enterButton').textContent='Entrar al hospital →';el('accountLoginButton').hidden=true;await avatar.repaint();return;}
   home();
  }catch(e){error(e);el('welcomeLoading').hidden=true;el('welcomeRetry').hidden=false;}
 }
 listen(el('welcomeRetry'),'click',()=>{void run(restore);});
 return Object.freeze({restore,home,login,newDoctor:()=>run(newDoctor),
  async logout(){await logout();home();},
  avatarSubmit(){if(!available)return false;el('chosenDoctorName').textContent=name;show('password','Guarda tu progreso','Tu nombre será tu cuenta.');return true;},
  enabled:()=>available});
}
