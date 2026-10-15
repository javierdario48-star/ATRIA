const abort=new AbortController();
try{
 // The bootstrap has no static import graph: a failed dependency is caught here.
 const [{loadContent},{createApplication}]=await Promise.all([
  import('../content/load.js'),import('./application.js')]);
 const content=await loadContent(undefined,abort.signal);
 const application=await createApplication({document,window,content,signal:abort.signal});
 // Explicit read-only diagnostics, rather than mutable historical game globals.
 Object.defineProperty(window,'atriaV5',{value:application,writable:false,configurable:false});
 document.body.dataset.boot='ready';
}catch(error){
 abort.abort();document.body.dataset.boot='failed';
 document.getElementById('fatalText').textContent=error.message;
 document.getElementById('fatal').hidden=false;
 console.error('ATRIA 5 boot failed',error);
}
