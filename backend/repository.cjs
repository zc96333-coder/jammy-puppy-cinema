const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');

// Persistence boundary: the business service does not use filesystem or SQL.
// A cloud implementation must preserve transaction + optimistic-version semantics.
function createRepository(filename=':memory:'){
 if(filename!==':memory:')fs.mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec(`CREATE TABLE IF NOT EXISTS documents(bucket TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,version INTEGER NOT NULL,PRIMARY KEY(bucket,id));
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 const getRow=db.prepare('SELECT body,version FROM documents WHERE bucket=? AND id=?');
 const scan=db.prepare('SELECT body,version FROM documents WHERE bucket=? ORDER BY rowid');
 const insert=db.prepare('INSERT INTO documents(bucket,id,body,version) VALUES(?,?,?,1)');
 const update=db.prepare('UPDATE documents SET body=?,version=version+1 WHERE bucket=? AND id=? AND version=?');
 const remove=db.prepare('DELETE FROM documents WHERE bucket=? AND id=?');let depth=0;
 return {
  get(bucket,id){const row=getRow.get(bucket,String(id));return row?{...JSON.parse(row.body),version:row.version}:null;},
  list(bucket){return scan.all(bucket).map(r=>({...JSON.parse(r.body),version:r.version}));},
  put(bucket,id,data,expected){const current=getRow.get(bucket,String(id));const body={...data,id:String(id)};delete body.version;
   if(current){if(expected!==undefined&&current.version!==expected)throw Object.assign(Error('记录已在其他页面更新，请刷新后重试。'),{status:409});const result=update.run(JSON.stringify(body),bucket,String(id),current.version);if(!result.changes)throw Object.assign(Error('更新冲突，请重试。'),{status:409});}
   else{if(expected!==undefined)throw Object.assign(Error('记录不存在。'),{status:404});insert.run(bucket,String(id),JSON.stringify(body));}return this.get(bucket,id);},
  remove(bucket,id){remove.run(bucket,String(id));},
  meta(key,value){if(value===undefined)return db.prepare('SELECT value FROM meta WHERE key=?').get(key)?.value;db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(value));},
  transaction(fn){if(depth)return fn();db.exec('BEGIN IMMEDIATE');depth++;try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}finally{depth--;}},
  close(){db.close();}
 };
}
module.exports={createRepository};
