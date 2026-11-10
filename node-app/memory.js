import { DatabaseSync } from 'node:sqlite';
import { chmodSync } from 'node:fs';
export function openMemory(path) {
 const db = new DatabaseSync(path);
 if (path !== ':memory:' && process.platform !== 'win32') chmodSync(path,0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS conversations(id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT 'New chat', created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS turns(id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, sources TEXT NOT NULL DEFAULT '[]');
 CREATE VIRTUAL TABLE IF NOT EXISTS turn_search USING fts5(content, content='turns', content_rowid='id');
 CREATE TRIGGER IF NOT EXISTS turns_ai AFTER INSERT ON turns BEGIN INSERT INTO turn_search(rowid,content) VALUES(new.id,new.content); END;
 CREATE TRIGGER IF NOT EXISTS turns_ad AFTER DELETE ON turns BEGIN INSERT INTO turn_search(turn_search,rowid,content) VALUES('delete',old.id,old.content); END;`);
 return db;
}
export function createSession(db, now = new Date().toISOString()) { return Number(db.prepare('INSERT INTO conversations(created_at) VALUES (?)').run(now).lastInsertRowid); }
export function saveTurn(db,id,role,content,sources=[],now=new Date().toISOString()) {
 const stmt=db.prepare('INSERT INTO turns(conversation_id,role,content,created_at,sources) VALUES (?,?,?,?,?)');
 const row=Number(stmt.run(id,role,content,now,JSON.stringify(sources)).lastInsertRowid);
 if(role==='user') db.prepare("UPDATE conversations SET title=? WHERE id=? AND title='New chat'").run(content.split(/\s+/).slice(0,5).join(' ').slice(0,80),id);
 return row;
}
export function recent(db,id) { return db.prepare('SELECT id,role,content,created_at FROM (SELECT id,role,content,created_at FROM turns WHERE conversation_id=? ORDER BY id DESC LIMIT 12) ORDER BY id').all(id); }
export function recall(db, query, start, end) {
 let rows=[];
 if(start && end) rows=db.prepare("SELECT id,conversation_id,role,content,created_at FROM turns WHERE created_at>=? AND created_at<? ORDER BY id LIMIT 80").all(start,end);
 else {
  const terms=[...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(w=>!['what','when','about','asked','from','that','this','have','since','last','the','any','with','were','your','changed'].includes(w)))].slice(0,8);
  if(terms.length) rows=db.prepare("SELECT t.id,t.conversation_id,t.role,t.content,t.created_at FROM turn_search f JOIN turns t ON t.id=f.rowid WHERE turn_search MATCH ? AND t.role='user' ORDER BY rank LIMIT 12").all(terms.map(t=>'"'+t+'"').join(' OR '));
 }
 const seen=new Set(), results=[];
 for(const row of rows) {
  if(!seen.has(row.id)){seen.add(row.id);results.push(row);}
  if(row.role==='user') { const next=db.prepare("SELECT id,conversation_id,role,content,created_at FROM turns WHERE conversation_id=? AND id>? ORDER BY id LIMIT 1").get(row.conversation_id,row.id); if(next && next.role==='assistant' && !seen.has(next.id)){seen.add(next.id);results.push(next);} }
 }
 return results.slice(0,40).map(r=>({...r,content:r.content.slice(0,2200)}));
}
export function importLegacy(db,path) {
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='metadata'").get() && db.prepare("SELECT value FROM metadata WHERE key='legacy_import'").get()) return 0;
 const old=new DatabaseSync(path,{readOnly:true});
 try {
  const has=name=>!!old.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if(!has('messages'))return 0;
  const hasSessions=has('sessions')&&has('session_messages'), hasSources=has('message_sources');
  const sessions=hasSessions?old.prepare('SELECT id,title,created_at FROM sessions ORDER BY id').all():[];
  const mappings=new Map();let count=0;
  db.exec('BEGIN');try{
   db.exec('CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
   for(const s of sessions) mappings.set(s.id,Number(db.prepare('INSERT INTO conversations(title,created_at) VALUES (?,?)').run(s.title,s.created_at).lastInsertRowid));
   const rows=old.prepare(`SELECT m.role,m.content,m.created_at,${hasSessions?'sm.session_id':'NULL AS session_id'},${hasSources?"COALESCE(ms.sources,'[]') AS sources":"'[]' AS sources"} FROM messages m ${hasSessions?'LEFT JOIN session_messages sm ON sm.message_id=m.id':''} ${hasSources?'LEFT JOIN message_sources ms ON ms.message_id=m.id':''} ORDER BY m.id`).all();
   let legacyId; for(const row of rows){let id=mappings.get(row.session_id);if(!id){if(!legacyId)legacyId=Number(db.prepare('INSERT INTO conversations(title,created_at) VALUES (?,?)').run('Earlier conversations',new Date().toISOString()).lastInsertRowid);id=legacyId;}db.prepare('INSERT INTO turns(conversation_id,role,content,created_at,sources) VALUES (?,?,?,?,?)').run(id,row.role,row.content,row.created_at,row.sources);count++;}
   db.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES ('legacy_import','done')").run();db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return count;
 }finally{old.close();}
}

export function citedSources(answer, sources) {
 const urls = new Set((answer.match(/https?:\/\/[^\s<>"']+/g)||[]).map(url=>url.replace(/[.,;!\])}]+$/g,'')));
 return sources.filter(source=>urls.has(source.url));
}
