import {createAccountGateway} from '../../src/v5/server/account-gateway.js';
import {createV5QaSocialServer} from '../../src/v5/social/room-membership-store.js';
export function accountGatewayFixture(){
 const canonical=x=>String(x).normalize('NFKD').replace(/\p{M}/gu,'').trim().replace(/\s+/g,' ').toLowerCase();
 const data=new Map(),storage={get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)};
 const legacy=createV5QaSocialServer(storage),rows=new Map(),sessions=new Map();let serial=0;
 const backend={
  byActor:async id=>[...rows.values()].find(x=>x.actor_id===id)||null,
  byAuth:async id=>rows.get(id)||null,
  byUsername:async u=>[...rows.values()].find(x=>x.username===u)||null,
  nameStatus:async name=>({available:![...rows.values()].some(x=>canonical(x.name)===canonical(name)||canonical(x.username)===canonical(name)),key:canonical(name),displayName:name}),
  resolveLogin:async name=>{const list=[...rows.values()].filter(x=>canonical(x.name)===canonical(name)||canonical(x.username)===canonical(name));return list.length===1?list[0]:null;},
  async createIdentity(username,password){return {id:'auth-'+(++serial)};},
  async passwordSession(username,password){const row=await this.byUsername(username);if(!row||password!=='safe-test-password-123')throw Object.assign(Error('invalid credentials'),{status:401});
   const token='access-'+(++serial),sessionId='session-'+serial;sessions.set(token,{userId:row.auth_user_id,sessionId});return {access_token:token,refresh_token:'refresh-'+serial,expires_in:3600};},
  async validateSession(tokens){const s=sessions.get(tokens.access_token);if(!s)throw Object.assign(Error('expired'),{status:401});return {...s,tokens};},
  async logout(tokens){sessions.delete(tokens.access_token);},
  async insertAccount(row){if(await this.byActor(row.actor_id)||await this.byUsername(row.username)||!(await this.nameStatus(row.name)).available)throw Object.assign(Error('conflict'),{status:409});row.character_name_key=canonical(row.name);rows.set(row.auth_user_id,structuredClone(row));return row;},
  async updateAccount(id,change){const r=rows.get(id);Object.assign(r,change);return structuredClone(r);},
  async award(actorId){const r=await this.byActor(actorId);return {xp:r.xp,casesResolved:r.cases_resolved};},
  async rpc(){return true;}
 };
 const gate=createAccountGateway({backend,legacy,storage});
 const request=(path,body,headers={})=>gate.route({method:body?'POST':'GET',path,body:body||{},headers});
 return {data,storage,legacy,rows,sessions,backend,gate,request};
}
