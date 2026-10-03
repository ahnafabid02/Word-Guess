import { randomBytes } from 'node:crypto';
export const rooms = new Map();
const fail = message => { throw new Error(message); };
const word = value => typeof value === 'string' && /^[a-z]{2,20}$/i.test(value);
export function create(name) {
 let code; do { code = randomBytes(4).toString('hex').slice(0,6).toUpperCase(); } while(rooms.has(code));
 const room = {code,match:1,players:[],phase:'waiting',round:1,turn:0,result:null,updated:Date.now()}; rooms.set(code,room); try{return join(code,name);}catch(error){rooms.delete(code);throw error;}
}
export function join(code,name) {
 const room=rooms.get(String(code).toUpperCase()); if(!room) fail('Room not found. Check your code.');
 if(room.players.length===2) fail('This room already has two players.');
 if(typeof name!=='string'||!name.trim()||name.trim().length>24) fail('Enter a name of 1–24 characters.');
 const player={name:name.trim(),token:randomBytes(32).toString('hex'),secret:null,history:[],solved:false,rematch:false,connections:0};
 room.players.push(player); if(room.players.length===2) room.phase='submission'; room.updated=Date.now(); return {room,player};
}
export function identify(code,token) {const room=rooms.get(String(code).toUpperCase()); const player=room?.players.find(p=>p.token===token); if(!player) fail('Your seat could not be found. Create or join a room.'); return {room,player};}
export function view(room,player) {
 const seat=room.players.indexOf(player);
 return {code:room.code,match:room.match,phase:room.phase,round:room.round,turn:room.turn,seat,finalGuess:room.phase==='playing'&&room.turn===seat&&room.players[1-seat].solved,result:room.result,history:player.history,players:room.players.map((p,i)=>({name:p.name,color:i===0?'RED':'BLUE',ready:!!p.secret,online:p.connections>0,rematch:p.rematch})),...(room.phase==='result'?{words:room.players.map(p=>p.secret)}:{})};
}
export function action(room,player,data) {
 if(data.match!==room.match) fail('This match has changed. Try again with the current match.');
 const seat=room.players.indexOf(player);
 if(data.action==='secret') {
  if(room.phase!=='submission'||player.secret) fail('Your word is already locked or this match is not accepting words.');
  if(!word(data.value)) fail('Use 2–20 English letters, with no spaces.');
  player.secret=data.value.toUpperCase(); if(room.players.every(p=>p.secret)) room.phase='playing';
 } else if(data.action==='guess') {
  if(room.phase!=='playing'||room.turn!==seat) fail('It is not your turn.');
  if(data.round!==room.round) fail('This turn has already been played.');
  if(room.players[1-seat].solved&&data.kind!=='word') fail('This is your final guess. Guess the whole word to draw.');
  const secret=room.players[1-seat].secret; let value=data.value,feedback;
  if(data.kind==='letter') {if(typeof value!=='string'||!/^[a-z]$/i.test(value)) fail('Guess exactly one English letter.'); value=value.toUpperCase(); const n=[...secret].filter(c=>c===value).length; feedback=n?`${n} ${value}${n===1?'':'s'}`:`No ${value}`;}
  else if(data.kind==='length') {if(!Number.isInteger(Number(value))||Number(value)<2||Number(value)>20) fail('Guess a length from 2 to 20.'); value=Number(value); feedback=value===secret.length?'Correct length!':'Incorrect length.';}
  else if(data.kind==='word') {if(!word(value)) fail('Guess a word of 2–20 English letters.'); value=value.toUpperCase(); player.solved=value===secret; feedback=player.solved?'Correct word!':'Incorrect word.';}
  else fail('Choose a valid guess type.');
  player.history.push({round:room.round,kind:data.kind,value,feedback});
  if(seat===0) room.turn=1;
  else {const [red,blue]=room.players; if(red.solved||blue.solved){room.phase='result';room.result=red.solved&&blue.solved?'draw':red.solved?'RED':'BLUE';}else{room.round++;room.turn=0;}}
 } else if(data.action==='rematch') {
  if(room.phase!=='result'||player.rematch) fail('Rematch vote already submitted or unavailable.'); player.rematch=true;
  if(room.players.every(p=>p.rematch)){room.match++;room.phase='submission';room.round=1;room.turn=0;room.result=null;for(const p of room.players){p.secret=null;p.history=[];p.solved=false;p.rematch=false;}}
 } else fail('Unknown action.'); room.updated=Date.now();
}
