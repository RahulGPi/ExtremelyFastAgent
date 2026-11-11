// Invoke from a desktop keyboard shortcut to toggle or start SOLO.
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const envPath=new URL('../.env',import.meta.url);
const configuredPort=existsSync(envPath)?readFileSync(envPath,'utf8').match(/^\s*(?:export\s+)?PORT\s*=\s*['\"]?(\d+)/m)?.[1]:undefined;
const port=Number(process.env.PORT||configuredPort||3000);
const url=`http://127.0.0.1:${port}`;
let config;
try { config=await fetch(`${url}/api/config`,{signal:AbortSignal.timeout(2000)}); }
catch {
 const nvm=join(process.env.NVM_DIR||join(homedir(),'.nvm'),'versions','node');
 const versions=existsSync(nvm)?readdirSync(nvm).filter(v=>/^v\d+\.\d+\.\d+$/.test(v)&&Number(v.slice(1).split('.')[0])>=24).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})):[];
 const node=Number(process.versions.node.split('.')[0])>=24?process.execPath:versions.length?join(nvm,versions[0],'bin','node'):null;
 if(!node){console.error('SOLO requires Node 24 or newer. Install it before using the shortcut.');process.exit(1);}
 const child=spawn(node,[resolve(root,'node-app/server.js')],{cwd:root,detached:true,stdio:'ignore',env:process.env});
 child.on('error',error=>console.error(`Could not start SOLO: ${error.message}`));
 child.unref();
 process.exitCode=0;
}
if(config){
 try {
  if(!config.ok)throw Error('Could not contact SOLO');
  const {token}=await config.json();
  const response=await fetch(`${url}/api/toggle`,{method:'POST',headers:{'x-solo-token':token},signal:AbortSignal.timeout(2000)});
  if(!response.ok)throw Error((await response.json()).error||'Could not toggle SOLO');
 } catch(error) {console.error(`SOLO shortcut: ${error.message}`);process.exitCode=1;}
}
