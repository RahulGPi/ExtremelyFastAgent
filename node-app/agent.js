import {citedSources} from './memory.js';

export function cleanAnswer(value) {
 let text=String(value||'').replace(/<think\b[^>]*>[\s\S]*?<\/think\s*>/gi,'');
 // Some models omit the opening tag and then repeat the public answer.
 if(/<\/think\s*>/i.test(text)) text=text.slice(text.search(/<\/think\s*>/i)).replace(/^<\/think\s*>/i,'');
 text=text.replace(/<think\b[^>]*>[\s\S]*$/i,'').replace(/<\/?think\b[^>]*>/gi,'').trim();
 const chunks=text.split(/\n\s*\n/);if(chunks.length%2===0){const half=chunks.length/2;if(chunks.slice(0,half).join('\n\n')===chunks.slice(half).join('\n\n'))text=chunks.slice(0,half).join('\n\n');}
 return text;
}

export async function runSearchLoop({messages,tool,needsSearch,memories,callModel,search,maxSearches=6}) {
 const sources=[];let searched=false,used=0,skipped=0,failed=0;
 for(let round=0;round<3;round++) {
  const m=await callModel(messages,tool,round===2?'none':round===0 && needsSearch?'required':undefined);
  if(!m.tool_calls?.length) {
   let result=m;
   if(m.finish_reason==='length') {
    try { result=await callModel([...messages,{role:'user',content:'Your previous response was cut off. Give a shorter complete answer using only the available evidence; explicitly state which items or claims remain unchecked, and cite exact source URLs.'}],tool,'none'); }
    catch { result=m; }
   }
   let answer=cleanAnswer(result.content)||'I could not produce an answer.';
   if(result.finish_reason==='length') answer+='\n\nThe response was cut off before it could be completed.';
   if((needsSearch || searched) && !citedSources(answer,sources).length) {
    const prior=memories.slice(0,8).map(m=>`- ${m.created_at} (${m.role}): ${m.content}`).join('\n');
    answer=(prior?`I found these earlier records (not independently verified):\n${prior}\n\n`:'')+'I could not verify a current answer.'+(sources.length?' Relevant search results:\n'+sources.map(s=>`- ${s.title}: ${s.url}`).join('\n'):' No usable web sources were returned.');
   }
   if(skipped || failed)answer+=`\n\nSome requested searches were ${skipped?'not run because the search budget was reached':''}${skipped&&failed?' and ':''}${failed?'unsuccessful':''}; coverage may be incomplete.`;
   return {answer,sources,memories:memories.length};
  }
  const {finish_reason: _finishReason,...assistantMessage}=m;
  messages.push(assistantMessage);
  // Every tool call receives a response, including calls beyond the budget.
  const calls=m.tool_calls;const tasks=calls.map(call=>({call,query:null,error:null}));
  for(const task of tasks){
   if(round===2 || used>=maxSearches){task.error='Search budget reached; this item was not checked.';skipped++;continue;}
   if(task.call.function?.name!=='web_search'){task.error='Unsupported tool.';failed++;continue;}
   try{const args=JSON.parse(task.call.function.arguments);if(typeof args.query!=='string'||!args.query.trim()||args.query.length>500)throw Error();task.query=args.query;used++;}catch{task.error='Invalid search request.';failed++;}
  }
  const work=tasks.filter(t=>t.query);let cursor=0;
  await Promise.all(Array.from({length:Math.min(3,work.length)},async()=>{while(cursor<work.length){const task=work[cursor++];searched=true;try{task.data=await search(task.query);}catch{task.error='Search failed; this item was not checked.';failed++;}}}));
  for(const task of tasks){for(const item of task.data||[])if(!sources.some(x=>x.url===item.url))sources.push(item);messages.push({role:'tool',tool_call_id:task.call.id,content:JSON.stringify(task.error?{error:task.error}:task.data)});}
 }
 // A provider may ignore tool_choice=none; retain evidence rather than fail.
 const prior=memories.slice(0,8).map(m=>`- ${m.created_at} (${m.role}): ${m.content}`).join('\n');
 return {answer:(prior?`I found these earlier records (not independently verified):\n${prior}\n\n`:'')+'I could not complete the research. Coverage is incomplete.'+(sources.length?' Search results:\n'+sources.map(s=>`- ${s.title}: ${s.url}`).join('\n'):''),sources,memories:memories.length};
}
