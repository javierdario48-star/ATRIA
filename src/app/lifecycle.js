export class Lifecycle {
  constructor(){this.scope=null;this.seq=0;}
  enter(name){
    this.leave();
    const id=++this.seq, cleanups=[];
    const scope={id,name,active:true,
      add(fn){cleanups.push(fn);return fn},
      interval(fn,ms){const h=setInterval(()=>scope.active&&fn(),ms);cleanups.push(()=>clearInterval(h));return h},
      timeout(fn,ms){const h=setTimeout(()=>scope.active&&fn(),ms);cleanups.push(()=>clearTimeout(h));return h},
      listen(target,type,fn,opts){target.addEventListener(type,fn,opts);cleanups.push(()=>target.removeEventListener(type,fn,opts));},
      dispose(){if(!scope.active)return;scope.active=false;for(const fn of cleanups.splice(0).reverse())try{fn()}catch{}}
    };
    this.scope=scope;return scope;
  }
  leave(){this.scope?.dispose();this.scope=null;}
}
export const lifecycle=new Lifecycle();
