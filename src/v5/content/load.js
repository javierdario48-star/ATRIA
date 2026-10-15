const names={map:'hospital',cases:'cases',algorithms:'algorithms',examSegments:'exam-segments',
 therapies:'therapies',defaultDoses:'default-doses',beds:'beds',colors:'colors',assets:'assets'};
export async function loadContent(base=new URL('./',import.meta.url),signal){
 const values=await Promise.all(Object.entries(names).map(async([key,name])=>{
  const response=await fetch(new URL(name+'.json',base),{signal});
  if(!response.ok)throw Error('No se pudo cargar '+name+' ('+response.status+')');
  return [key,await response.json()];
 }));
 const content=Object.fromEntries(values);
 content.assetUrls=Object.fromEntries(Object.entries(content.assets).map(([key,asset])=>[key,new URL(asset.path,base).href]));
 return content;
}
