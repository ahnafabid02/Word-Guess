import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
test('HTTP authentication, private SSE snapshots, duplicate requests and reconnect',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 try{
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),5000);child.once('error',reject);child.stdout.on('data',data=>{const match=String(data).match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  const base=`http://127.0.0.1:${port}`;
  async function post(data,expected=200){const res=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(res.status,expected);return res.json();}
  const red=await post({action:'create',name:'Alex'});const code=red.state.code;
  const blue=await post({action:'join',code,name:'Sam'});
  await post({action:'join',code,name:'Third'},400);await post({action:'join',code:'INVALID',name:'Third'},400);
  await post({action:'resume',code,token:'fake'},400);
  const credentials={code,token:red.token,match:1};
  await post({...credentials,action:'secret',value:'apple'});
  await post({...credentials,action:'secret',value:'apple'},400);
  await post({code,token:blue.token,match:1,action:'secret',value:'pepper'});
  const abort=new AbortController();const stream=await fetch(`${base}/events?room=${code}&token=${red.token}`,{signal:abort.signal});assert.equal(stream.headers.get('content-type'),'text/event-stream');
  const reader=stream.body.getReader();let snapshot='';while(!snapshot.includes('data:')){const {value}=await reader.read();snapshot+=new TextDecoder().decode(value);}
  const publicState=JSON.parse(snapshot.split('data: ')[1].split('\n')[0]);assert.equal(publicState.words,undefined);assert.ok(!snapshot.includes('PEPPER'));assert.equal(publicState.players[0].online,true);
  await post({code,token:blue.token,match:1,action:'guess',round:1,kind:'word',value:'apple'},400);
  const first=await post({...credentials,action:'guess',round:1,kind:'letter',value:'p'});assert.equal(first.state.history[0].feedback,'3 Ps');
  await post({...credentials,action:'guess',round:1,kind:'letter',value:'p'},400);
  abort.abort();const resumed=await post({...credentials,action:'resume'});assert.equal(resumed.state.seat,0);assert.equal(resumed.state.history.length,1);assert.equal(resumed.state.turn,1);
 }finally{child.kill();}
});
