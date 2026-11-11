import {performance} from 'node:perf_hooks';
export function unionDuration(intervals) {
 const ordered=intervals.map(({start,end})=>[start,end]).sort((a,b)=>a[0]-b[0]);let total=0,lastStart,lastEnd;
 for(const [start,end] of ordered){if(lastStart===undefined){lastStart=start;lastEnd=end;}else if(start<=lastEnd)lastEnd=Math.max(lastEnd,end);else{total+=lastEnd-lastStart;lastStart=start;lastEnd=end;}}
 return total+(lastStart===undefined?0:lastEnd-lastStart);
}
export function createProfiler() {
 const started=performance.now(),intervals=[],usage={model:{calls:0,input:0,output:0},audit:{calls:0,input:0,output:0}};
 return {
  async track(kind,fn){const start=performance.now();try{return await fn()}finally{intervals.push({kind,start,end:performance.now()});}},
  recordUsage(kind,value){if(!value||!usage[kind])return;const input=value.prompt_tokens,output=value.completion_tokens;if(!Number.isFinite(input)||!Number.isFinite(output))return;usage[kind].calls++;usage[kind].input+=input;usage[kind].output+=output;},
  summary(){const total=performance.now()-started,wait=unionDuration(intervals);const sum=kind=>intervals.filter(x=>x.kind===kind).reduce((n,x)=>n+x.end-x.start,0);return {reply_ms:Math.round(total),external_wait_union_ms:Math.round(wait),application_estimate_ms:Math.max(0,Math.round(total-wait)),model_call_ms:Math.round(sum('model')),audit_call_ms:Math.round(sum('audit')),search_call_ms:Math.round(sum('search')),usage};}
 };
}
