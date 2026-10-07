export function createHistory(){return[]}
export function addHistory(history,{kind,text,source='patient',certainty='reported',at=Date.now()}){if(!kind||!text)throw new Error('kind and text required');return[...history,{kind,text,source,certainty,at}]}
export function latestByKind(history,kind){return[...history].reverse().find(x=>x.kind===kind)||null}
