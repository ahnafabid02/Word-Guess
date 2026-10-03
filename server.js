import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {create,join,identify,view,action,rooms} from './game.js';
const clients=new Map();
function broadcast(room){for(const client of clients.get(room.code)||[]) client.res.write(`data: ${JSON.stringify(view(room,client.player))}\n\n`);}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
 try {
  if(url.pathname==='/events') {
   const {room,player}=identify(url.searchParams.get('room'),url.searchParams.get('token'));
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write(': connected\n\n');
   const client={res,player}; if(!clients.has(room.code))clients.set(room.code,new Set()); clients.get(room.code).add(client);player.connections++;broadcast(room);
   const timer=setInterval(()=>res.write(': heartbeat\n\n'),15000);
   req.on('close',()=>{clearInterval(timer);clients.get(room.code)?.delete(client);player.connections--;broadcast(room);});return;
  }
  if(url.pathname==='/api'&&req.method==='POST') {
   if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`)throw new Error('Invalid origin.');
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw new Error('Request too large.');}const data=JSON.parse(raw);
   let session;
   if(data.action==='create')session=create(data.name);
   else if(data.action==='join')session=join(data.code,data.name);
   else {session=identify(data.code,data.token);if(data.action!=='resume')action(session.room,session.player,data);}
   broadcast(session.room);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({token:session.player.token,state:view(session.room,session.player)}));return;
  }
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg'};const file=files[url.pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await readFile(new URL(`./public/${file}`,import.meta.url)));
 }catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
setInterval(()=>{for(const [code,room]of rooms)if(Date.now()-room.updated>86400000&&!room.players.some(p=>p.connections))rooms.delete(code);},60000).unref();
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Word Guess listening on port '+server.address().port));
