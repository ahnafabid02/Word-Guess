import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../dist/server/index.js';
function db(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE rooms (code TEXT PRIMARY KEY, body TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL)');return {prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args);},async run(){return {meta:sqlite.prepare(sql).run(...args)};}};}};},close(){sqlite.close();}};}
test('hosted database: atomic seats, turns, persistence, secrets and rematches',async()=>{
 const DB=db(),env={DB};
 async function call(data,status=200){const response=await worker.fetch(new Request('https://game.example/api',{method:'POST',headers:{Origin:'https://game.example'},body:JSON.stringify(data)}),env);assert.equal(response.status,status,await response.clone().text());return response.json();}
 try{
  const red=await call({action:'create',name:'Alex'}),code=red.state.code;
  const joins=await Promise.all(['Sam','Third'].map(name=>worker.fetch(new Request('https://game.example/api',{method:'POST',body:JSON.stringify({action:'join',code,name})}),env)));
  assert.deepEqual(joins.map(r=>r.status).sort(),[200,400]);const blue=await joins.find(r=>r.status===200).json();
  const r={code,token:red.token,match:1},b={code,token:blue.token,match:1};
  await call({...r,action:'secret',value:'apple'});await call({...b,action:'secret',value:'pepper'});
  const concurrent=await Promise.all([1,2].map(()=>worker.fetch(new Request('https://game.example/api',{method:'POST',body:JSON.stringify({...r,action:'guess',kind:'letter',value:'p',round:1})}),env)));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400]);
  const snapshot=await call({...r,action:'resume'});assert.equal(snapshot.state.history.length,1);assert.equal(snapshot.state.history[0].feedback,'3 Ps');assert.ok(!JSON.stringify(snapshot.state).includes('PEPPER'));assert.equal(snapshot.state.words,undefined);
  await call({...b,action:'guess',kind:'length',value:6,round:1});
  await call({...r,action:'guess',kind:'word',value:'pepper',round:2});
  const waiting=await call({...b,action:'sync'});assert.equal(waiting.state.phase,'playing');assert.equal(waiting.state.words,undefined);
  const result=await call({...b,action:'guess',kind:'word',value:'apple',round:2});assert.equal(result.state.result,'draw');
  await call({...r,action:'rematch'});const fresh=await call({...b,action:'rematch'});assert.equal(fresh.state.match,2);assert.equal(fresh.state.history.length,0);
  await call({...r,action:'secret',value:'delayed'},400);
  await call({...r,match:2,action:'secret',value:'fresh'});
  const otherInstance=(await import('../dist/server/index.js?fresh-instance')).default;
  const resumed=await otherInstance.fetch(new Request('https://game.example/api',{method:'POST',body:JSON.stringify({...r,action:'resume'})}),env);
  assert.equal((await resumed.json()).state.players[0].ready,true);
  const body=JSON.parse((await DB.prepare('SELECT body, revision FROM rooms WHERE code = ?').bind(code).first()).body);body.players[1].lastSeen=Date.now()-20000;
  await DB.prepare('UPDATE rooms SET body = ?, revision = revision + 1, updated = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(body),Date.now(),code,fresh.state.revision+1).run();
  const disconnected=await call({...r,action:'sync'});assert.equal(disconnected.state.players[1].online,false);
  assert.equal((await call({...b,action:'resume'})).state.players[1].online,true);
  const badOrigin=await worker.fetch(new Request('https://game.example/api',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),env);assert.equal(badOrigin.status,403);
  assert.match(await (await worker.fetch(new Request('https://game.example/'),env)).text(),/Word Guess/);
 }finally{DB.close();}
});
