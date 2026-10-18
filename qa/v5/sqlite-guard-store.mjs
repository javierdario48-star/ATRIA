import {DatabaseSync} from 'node:sqlite';
/** Real durable QA disk adapter, including cross-process atomic CAS. This is
 * NOT deployable on Vercel's ephemeral filesystem. Production uses private Blob. */
export function createSqliteGuardStore(filename){
 const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS guards (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, value TEXT NOT NULL)');
 const read=db.prepare('SELECT revision,value FROM guards WHERE id=?');
 const insert=db.prepare('INSERT INTO guards(id,revision,value) VALUES(?,1,?) ON CONFLICT(id) DO NOTHING');
 const update=db.prepare('UPDATE guards SET revision=revision+1,value=? WHERE id=? AND revision=?');
 return {async read(id){const row=read.get(id);return row?{etag:String(row.revision),value:JSON.parse(row.value)}:null;},
  async compareAndSwap(id,etag,value){
   db.exec('BEGIN IMMEDIATE');try{const result=etag===null?insert.run(id,JSON.stringify(value)):update.run(JSON.stringify(value),id,Number(etag));
    const row=result.changes?read.get(id):null;db.exec('COMMIT');return row?String(row.revision):null;
   }catch(error){db.exec('ROLLBACK');throw error;}},close:()=>db.close()};
}
