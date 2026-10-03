import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const files = {};
for(const [path,file,type] of [['/','index.html','text/html'],['/app.js','app.js','text/javascript'],['/style.css','style.css','text/css'],['/favicon.svg','favicon.svg','image/svg+xml']]) {
 files[path]={body:await readFile(`public/${file}`,'utf8'),type};
}
const game=(await readFile('game.js','utf8')).replace("import { randomBytes } from 'node:crypto';",`function randomBytes(n){const bytes=crypto.getRandomValues(new Uint8Array(n));return {toString(){return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');}};}`).replaceAll('export ','');
const worker=await readFile('worker/index.js','utf8');
await writeFile('dist/server/index.js',`const assets=${JSON.stringify(files)};\n${game}\n${worker}`);
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json','utf8'));
console.log('Built standalone Worker with embedded browser assets.');
