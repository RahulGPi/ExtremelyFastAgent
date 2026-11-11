import {writeFileSync} from 'node:fs';
const base=process.env.SOLO_EVAL_URL||'http://127.0.0.1:39878';
const output=process.env.SOLO_EVAL_OUTPUT||'/tmp/solo-evaluation-results.json';
const cases=[
 ['CRM shortlist','On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?'],
 ['Dated question and recheck','What did I ask you on 3 November? Is your answer still correct today?'],
 ['Postgres pricing','Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?'],
 ['Dated recall only','What did I ask on 3 November?'],
 ['VPN update','Last Friday we compared two VPNs. Have their prices changed since?'],
 ['Task tool recall','Last Thursday what task management tools did you recommend?'],
 ['Missing history','What did I ask you on 18 October 2001?'],
 ['No prior baseline','On Monday did the CRM shortlist get any major new features since our discussion?']
];
const token=(await (await fetch(base+'/api/config')).json()).token;const headers={'content-type':'application/json','x-solo-token':token};let results=[];
for(const [name,question] of cases.filter(([name])=>process.argv.length<=2 || process.argv.slice(2).includes(name))){const start=Date.now();try{const session=await (await fetch(base+'/api/sessions',{method:'POST',headers})).json();const response=await fetch(`${base}/api/sessions/${session.id}/chat`,{method:'POST',headers,body:JSON.stringify({text:question}),signal:AbortSignal.timeout(150000)});const data=await response.json();results.push({name,question,status:response.status,ms:Date.now()-start,...data});console.log(`${name}: HTTP ${response.status}; ${data.memories??0} memories; ${data.sources?.length??0} sources; ${((Date.now()-start)/1000).toFixed(1)}s`);}catch(e){results.push({name,question,error:e.message,ms:Date.now()-start});console.log(`${name}: ERROR ${e.message}`)}writeFileSync(output,JSON.stringify(results,null,2));}
