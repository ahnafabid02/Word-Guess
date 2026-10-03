const app=document.querySelector('#app'),notice=document.querySelector('#notice');
let session=null,state=null,stream=null,busy=false,kind='letter',network=true;
try{session=JSON.parse(localStorage.getItem('word-guess-seat'));}catch{}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function say(message){notice.textContent=message;setTimeout(()=>{if(notice.textContent===message)notice.textContent='';},6000);}
async function api(data){const response=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...session,match:state?.match,...data})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
function connect(){stream?.close();stream=new EventSource(`/events?room=${session.code}&token=${session.token}`);stream.onmessage=e=>{network=true;state=JSON.parse(e.data);render();};stream.onerror=()=>{network=false;render();};}
async function submit(data){if(busy)return;busy=true;render();try{const result=await api(data);state=result.state;session={code:state.code,token:result.token};localStorage.setItem('word-guess-seat',JSON.stringify(session));if(!stream)connect();}catch(e){say(e.message);}finally{busy=false;render();}}
const button=(text,disabled=false)=>`<button ${disabled?'disabled':''}>${text}</button>`;

let renderedScreen = null;
let draftTurn=null;const guessDrafts=new Map();
// Patch an existing screen so live room updates never detach a typing field.
function updateApp(markup, screen) {
 if (screen !== renderedScreen) {
  const hadScreen = renderedScreen !== null;
  const changedStage = renderedScreen?.split(':').filter((_,i)=>i!==4).join(':') !== screen.split(':').filter((_,i)=>i!==4).join(':');
  app.innerHTML = markup;
  renderedScreen = screen;
  if (hadScreen && changedStage) app.querySelector('h1')?.focus();
  return;
 }
 const template = document.createElement('template');
 template.innerHTML = markup;
 patchChildren(app, template.content);
}
function patchChildren(current, next) {
 const incoming = [...next.childNodes];
 for (let i = 0; i < incoming.length; i++) {
  const fresh = incoming[i], existing = current.childNodes[i];
  if (!existing) { current.appendChild(fresh.cloneNode(true)); continue; }
  if (existing.nodeType !== fresh.nodeType || existing.nodeName !== fresh.nodeName) {
   existing.replaceWith(fresh.cloneNode(true)); continue;
  }
  if (fresh.nodeType === Node.TEXT_NODE) {
   if (existing.nodeValue !== fresh.nodeValue) existing.nodeValue = fresh.nodeValue;
  } else if (fresh.nodeType === Node.ELEMENT_NODE) {
   for (const attribute of [...existing.attributes]) {
    if ((existing.tagName === 'INPUT' && attribute.name === 'value') || (existing.tagName === 'DETAILS' && attribute.name === 'open')) continue;
    if (!fresh.hasAttribute(attribute.name)) existing.removeAttribute(attribute.name);
   }
   for (const attribute of fresh.attributes) {
    if ((existing.tagName === 'INPUT' && attribute.name === 'value') || (existing.tagName === 'DETAILS' && attribute.name === 'open')) continue;
    if (existing.getAttribute(attribute.name) !== attribute.value) existing.setAttribute(attribute.name, attribute.value);
   }
   patchChildren(existing, fresh);
  }
 }
 while (current.childNodes.length > incoming.length) current.lastChild.remove();
}

function render(){
 document.body.dataset.color=state?(state.phase==='playing'?state.turn:state.seat)===0?'red':'blue':'red';
 if(!state){const code=new URLSearchParams(location.search).get('room')||'';updateApp(`<section class="welcome"><div class="intro"><div class="eyebrow">THE PRIVATE WORD DUEL</div><h1 tabindex="-1">Great minds.<br><span>Secret words.</span></h1><p>Choose one word each, and take one turn at a time.<br>Outthink your friend—or meet your match.</p><div class="tiles" aria-hidden="true"><i>W</i><i>O</i><i>R</i><i>D</i><i>?</i></div><div class="rule-note"><b>How to play</b><p>Guess a letter, a length, or the whole word. Letters reveal counts, never positions. Both players get a turn before a winner is decided.</p></div></div><div class="card entry"><div class="eyebrow">LET'S PLAY</div><h2>Bring your favorite rival.</h2><label for="name">Your name</label><input id="name" maxlength="24" enterkeyhint="go" autocapitalize="words" placeholder="e.g. Alex" autocomplete="nickname"><form id="create">${button(busy?'Creating…':'Create a private room',busy)}</form><div class="divider">or join a friend</div><form id="join"><label for="code">Room code</label><div class="inline"><input id="code" maxlength="6" enterkeyhint="go" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" value="${esc(code)}" placeholder="6-character code" required>${button('Join',busy)}</div></form><small>No accounts. Just you and your friend.</small></div></section>`, "home");
 document.querySelector('#create').onsubmit=e=>{e.preventDefault();submit({action:'create',name:document.querySelector('#name').value});};document.querySelector('#join').onsubmit=e=>{e.preventDefault();submit({action:'join',code:document.querySelector('#code').value.trim(),name:document.querySelector('#name').value});};document.querySelector('#name').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();const code=document.querySelector('#code').value.trim();document.querySelector(code?'#join':'#create').requestSubmit();}};return;}
 const me=state.players[state.seat],op=state.players[1-state.seat],myTurn=state.turn===state.seat;
 const turnKey=[state.code,state.match,state.round,state.history.length].join(':');
 if(draftTurn!==turnKey){guessDrafts.clear();draftTurn=turnKey;}
 let content='';
 if(state.phase==='waiting')content=`<div class="center card"><div class="orbit">↗</div><div class="eyebrow">YOUR PRIVATE ROOM</div><h1 tabindex="-1">Save them a seat.</h1><p>Share this code or an invitation link with your friend.</p><div class="room-code">${state.code}</div><div class="share"><button id="copy-code" class="secondary">Copy code</button><button id="copy-link">Copy invitation link</button></div><p class="muted pulse">Waiting for player two…</p></div>`;
 if(state.phase==='submission')content=`<div class="center card"><div class="eyebrow">YOU ARE ${me.color}</div><h1 tabindex="-1">${me.ready?'Secret secured.':'Choose your secret.'}</h1><p>${me.ready?'Waiting for your friend to lock in their word.':'Pick a word your friend will have to figure out.'}</p>${me.ready?'<div class="orbit">✓</div>':`<form id="secret" autocomplete="off"><label for="secret-word">Your secret word</label><input id="secret-word" type="text" enterkeyhint="done" inputmode="text" autocapitalize="none" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" minlength="2" maxlength="20" pattern="[A-Za-z]{2,20}" autocomplete="off" required placeholder="Keep it clever…"><small>2–20 English letters. No spaces. No dictionary needed.</small>${button('Lock in my word',busy||!network)}</form>`}<div class="ready-list">${state.players.map(p=>`<span>${esc(p.name)} · ${p.ready?'Ready ✓':'Choosing…'}</span>`).join('')}</div></div>`;
 if(state.phase==='playing')content=`<div class="game-heading"><div><div class="eyebrow">ROUND ${state.round} · ${state.players[state.turn].color} TO PLAY</div><h1 tabindex="-1">${myTurn?'Your turn.':'Over to your opponent.'}</h1><p>${myTurn?`What can you uncover about ${esc(op.name)}’s word?`:'Waiting for your opponent. Think about your next move.'}</p></div><span class="round-badge">${String(state.round).padStart(2,'0')}</span></div><div class="game-grid"><section class="card"><div class="eyebrow">MAKE YOUR MOVE</div><div class="tabs" role="group" aria-label="Guess type">${['letter','length','word'].map(k=>`<button type="button" data-kind="${k}" class="${kind===k?'active':''}" aria-pressed="${kind===k}" ${!myTurn||busy||!network?'disabled':''}>${k==='letter'?'Aa Letter':k==='length'?'# Length':'W Word'}</button>`).join('')}</div><form id="guess"><label for="guess-value">${kind==='letter'?'Guess one letter':kind==='length'?'Guess the number of letters':'Guess the whole word'}</label><input id="guess-value" enterkeyhint="done" autocapitalize="none" autocorrect="off" spellcheck="false" ${kind==='length'?'type="number" inputmode="numeric" min="2" max="20" step="1"':`type="text" maxlength="${kind==='letter'?1:20}" pattern="[A-Za-z]{${kind==='letter'?'1':'2,20'}}"`} required autocomplete="off" placeholder="${kind==='letter'?'e.g. E':kind==='length'?'e.g. 7':'Your best guess…'}" ${!myTurn||busy||!network?'disabled':''}><p class="hint">${kind==='letter'?'You’ll learn the count, not the positions.':kind==='length'?'A wrong guess keeps the actual length secret.':'Both players finish this round before the result.'}</p>${button(busy?'Sending…':myTurn?'Submit guess →':'Waiting for your opponent',!myTurn||busy||!network)}</form></section><section class="card history"><div class="history-title"><h2>Your clues</h2><span>${state.history.length} moves</span></div>${history()}<small>Only your own guesses appear here.</small></section></div>`;
 if(state.phase==='result')content=`<div class="center card"><div class="orbit">${state.result==='draw'?'≈':state.result===me.color?'★':'✦'}</div><div class="eyebrow">ROUND ${state.round} COMPLETE</div><h1 tabindex="-1">${state.result==='draw'?'A meeting of minds.':state.result===me.color?'You cracked it!':`${esc(op.name)} cracked it!`}</h1><p>${state.result==='draw'?'You both guessed correctly in the same round. It’s a draw!':`${esc(state.players[state.result==='RED'?0:1].name)} (${state.result}) wins the duel.`}</p><div class="reveals">${state.players.map((p,i)=>`<div><span>${esc(p.name)} · ${p.color}</span><strong>${state.words[i]}</strong></div>`).join('')}</div><form id="rematch">${button(me.rematch?'Rematch requested ✓':'Play a rematch',busy||me.rematch||!network)}</form><small>${me.rematch?'Waiting for your friend to agree.':op.rematch?'Your friend wants a rematch!':'New round, new secrets. Both players must agree.'}</small><details><summary>Your guess history</summary>${history()}</details></div>`;
 updateApp(`<div class="room-bar"><span>ROOM <b>${state.code}</b></span><span class="seat ${me.color.toLowerCase()}">${esc(me.name)} · ${me.color}</span><button id="leave" class="text-button">Leave screen</button></div><div id="connection" class="connection" role="status" ${!network||(op&&!op.online)?'':'hidden'}>${!network?'Connection lost. Reconnecting automatically…':op&&!op.online?'Your opponent is disconnected. Their seat is saved; play resumes when they return.':''}</div>${content}`, [state.code,state.match,state.phase,state.round,kind,me.ready,state.history.length].join(':'));
 document.querySelector('#leave').onclick=()=>{stream?.close();stream=null;localStorage.removeItem('word-guess-seat');session=null;state=null;historyReplace();render();};
 if(document.querySelector('#secret'))document.querySelector('#secret').onsubmit=e=>{e.preventDefault();const value=document.querySelector('#secret-word').value;submit({action:'secret',value});};
 document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const input=document.querySelector('#guess-value');if(input)guessDrafts.set(kind,input.value);kind=b.dataset.kind;render();const next=document.querySelector('#guess-value');if(next){next.value=guessDrafts.get(kind)||'';next.focus();}});
 if(document.querySelector('#guess'))document.querySelector('#guess').onsubmit=e=>{e.preventDefault();const value=document.querySelector('#guess-value').value;submit({action:'guess',kind,value,round:state.round});};
 if(document.querySelector('#rematch'))document.querySelector('#rematch').onsubmit=e=>{e.preventDefault();submit({action:'rematch'});};
 for(const [id,value]of [['copy-code',state.code],['copy-link',`${location.origin}/?room=${state.code}`]])if(document.getElementById(id))document.getElementById(id).onclick=async()=>{try{await navigator.clipboard.writeText(value);say('Copied!');}catch{say(`Copy this: ${value}`);}};
}
function history(){return state.history.length?`<ol>${[...state.history].reverse().map(h=>`<li><div><span class="move">${esc(h.value)}</span><span class="muted">${h.kind} · Round ${h.round}</span></div><strong>${esc(h.feedback)}</strong></li>`).join('')}</ol>`:'<div class="empty"><span>✧</span><p>A clean slate.<br>Your clues will collect here.</p></div>';}
function historyReplace(){window.history.replaceState({},'', '/');}
if(session){try{const result=await api({action:'resume'});state=result.state;connect();}catch(e){say(e.message);session=null;localStorage.removeItem('word-guess-seat');}}render();
