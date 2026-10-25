// Direct and rewritten Vercel API entrypoints share one signaling owner.
export function isSignalingEndpoint({path='',route=''}={}){
 const normalize=value=>String(value||'').replace(/^\/+/, '').replace(/^api\//,'').replace(/\/+$/,'');
 return normalize(route||path)==='lobby-sync';
}
