const database = {
 async load(db,code){return db.prepare('SELECT body, revision FROM rooms WHERE code = ?').bind(code).first();},
 async insert(db,room){return db.prepare('INSERT INTO rooms (code, body, revision, updated) VALUES (?, ?, 0, ?)').bind(room.code,JSON.stringify(room),room.updated).run();},
 async save(db,room,revision){return db.prepare('UPDATE rooms SET body = ?, revision = revision + 1, updated = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(room),room.updated,room.code,revision).run();}
};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function handleAPI(data,env,attempt=0){
 let room,player,record,write=false;
 const code=String(data.code||'').toUpperCase();
 if(data.action==='create'){
  ({room,player}=create(data.name));rooms.delete(room.code);write=true;
 }else{
  if(!/^[A-F0-9]{6}$/.test(code))return json({error:'Room not found. Check your code.'},400);
  record=await database.load(env.DB,code);
  if(!record)return json({error:'Room not found. Check your code.'},400);
  room=JSON.parse(record.body);
  rooms.set(code,room);
  try{
   if(data.action==='join'){({player}=join(code,data.name));write=true;}
   else {
    ({player}=identify(code,data.token));
    if(data.action!=='resume'&&data.action!=='sync'){action(room,player,data);write=true;}
   }
  }finally{rooms.delete(code);}
 }
 if(Date.now()-(player.lastSeen||0)>4000){player.lastSeen=Date.now();write=true;}
 room.updated=Date.now();
 if(write){
  if(data.action==='create')await database.insert(env.DB,room);
  else {const saved=await database.save(env.DB,room,record.revision);if(!saved.meta.changes){if(attempt<3)return handleAPI(data,env,attempt+1);return json({error:'The room changed. Please try again.'},409);}}
 }
 for(const p of room.players)p.connections=Date.now()-(p.lastSeen||0)<12000?1:0;
 return json({token:player.token,state:{...view(room,player),revision:record?record.revision+(write?1:0):0}});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api'){
   if(request.method!=='POST')return json({error:'Use POST.'},405);
   if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin.'},403);
   try{
    const raw=await request.text();if(raw.length>4096)return json({error:'Request too large.'},413);
    return await handleAPI(JSON.parse(raw),env);
   }catch(error){
    if(/D1_|SQLITE|database|binding/i.test(error.message)){console.error('Room storage unavailable');return json({error:'The game server is temporarily unavailable. Please try again.'},503);}
    return json({error:error.message},400);
   }
  }
  const asset=assets[url.pathname];
  if(!asset)return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type+'; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'}});
 }
};
