window.setSoloCollapsed=collapsed=>{document.body.classList.toggle('collapsed',collapsed);if(!collapsed)document.querySelector('#input').focus();};
if(new URLSearchParams(location.search).has('desktop')){
 const closeButton=document.querySelector('#close-window'),collapseButton=document.querySelector('#collapse-window');
 closeButton.hidden=false;collapseButton.hidden=false;
 const toggle=()=>api('/api/toggle',{method:'POST'}).catch(e=>{document.querySelector('#status').textContent=e.message});
 closeButton.onclick=()=>api('/api/quit',{method:'POST'}).catch(e=>{document.querySelector('#status').textContent=e.message});
 collapseButton.onclick=toggle;
 document.querySelector('#bubble').onclick=toggle;
 document.addEventListener('keydown',e=>{if(e.altKey && e.key.toLowerCase()==='a'){e.preventDefault();toggle();}});
}
let token,session;const messages=document.querySelector('#messages'),status=document.querySelector('#status'),input=document.querySelector('#input'),send=document.querySelector('#send');
const sidebar=document.querySelector('#sidebar'),sidebarButton=document.querySelector('#open-sidebar');
function showSessions(show){sidebar.hidden=!show;sidebarButton.setAttribute('aria-expanded',String(show));if(show)document.querySelector('#search-sessions').focus();else sidebarButton.focus();}
sidebarButton.onclick=()=>showSessions(sidebar.hidden);
document.querySelector('#close-sidebar').onclick=()=>showSessions(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sidebar.hidden)showSessions(false)});
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'content-type':'application/json','x-solo-token':token,...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
function inline(target,text){const re=/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g;let last=0;for(const m of text.matchAll(re)){target.append(document.createTextNode(text.slice(last,m.index)));const value=m[0];if(value.startsWith('**')){const el=document.createElement('strong');el.textContent=value.slice(2,-2);target.append(el)}else if(value.startsWith('`')){const el=document.createElement('code');el.textContent=value.slice(1,-1);target.append(el)}else{const parts=value.startsWith('[')?value.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/):null;const href=parts?parts[2]:value.replace(/[.,;!]+$/,'');try{const u=new URL(href);if(!['http:','https:'].includes(u.protocol))throw Error();const el=document.createElement('a');el.href=u.href;el.target='_blank';el.rel='noopener noreferrer';el.textContent=parts?parts[1]:href;target.append(el);if(!parts)target.append(document.createTextNode(value.slice(href.length)));}catch{target.append(document.createTextNode(value));}}last=m.index+value.length}target.append(document.createTextNode(text.slice(last)));}
function inspectSource(line,sources){const urls=new Set((line.match(/https?:\/\/[^\s<>"']+/g)||[]).map(u=>u.replace(/[.,;!\])}]+$/g,'')));const matching=sources.filter(s=>urls.has(s.url));const panel=document.querySelector('#source-panel'), detail=document.querySelector('#source-detail');detail.replaceChildren();if(!matching.length){detail.textContent='No source linked to this passage; it is unverified.'}for(const source of matching){const item=document.createElement('p'), title=document.createElement('a'), excerpt=document.createElement('p');title.href=source.url;title.target='_blank';title.rel='noopener noreferrer';title.textContent=source.title||source.url;excerpt.textContent=source.content||'';item.append(title,excerpt);detail.append(item)}panel.hidden=false;}
document.querySelector('#close-sources').onclick=()=>document.querySelector('#source-panel').hidden=true;
function render(role,content,sources=[]){const box=document.createElement('div');box.className='turn';const label=document.createElement('div');label.className='role';label.textContent=role==='user'?'You':'SOLO';const text=document.createElement('div');if(role==='user')text.textContent=content;else {let list=null;for(const line of content.split('\n')){if(!line.trim()){list=null;continue}const bullet=line.match(/^\s*(?:[-*]\s+|\d+[.)]\s+)(.*)$/);let el;if(bullet){if(!list){list=document.createElement(/^\s*\d/.test(line)?'ol':'ul');text.append(list)}el=document.createElement('li');list.append(el);inline(el,bullet[1])}else{list=null;const heading=line.match(/^#{1,4}\s+(.+)$/);el=document.createElement(heading?'h3':'p');inline(el,heading?heading[1]:line);text.append(el)}if(role!=='user'){el.className='inspectable';el.tabIndex=0;el.title='Inspect the cited source';el.onclick=e=>{if(!e.target.closest('a'))inspectSource(line,sources)};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectSource(line,sources)}}}}}box.append(label,text);for(const source of sources){try{const u=new URL(source.url);if(!['https:','http:'].includes(u.protocol))continue;const a=document.createElement('a');a.className='source';a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title||u.href;box.append(a);}catch{}}messages.append(box);messages.scrollTop=messages.scrollHeight;}

const dialog=document.querySelector('#session-dialog'), dialogInput=document.querySelector('#dialog-input');
let dialogAction=null;
function editSession(row,action){
 if(send.disabled)return; dialogAction={row,action};
 document.querySelector('#dialog-title').textContent=action==='delete'?'Delete conversation?':'Rename conversation';
 document.querySelector('#dialog-description').textContent=action==='delete'?`“${row.title}” and its messages will be deleted.`:'Choose a name for this conversation.';
 dialogInput.hidden=action==='delete';dialogInput.required=action==='rename';dialogInput.value=row.title;
 const button=document.querySelector('#dialog-confirm');button.textContent=action==='delete'?'Delete':'Save';button.classList.toggle('danger',action==='delete');
 dialog.showModal(); if(action==='rename'){dialogInput.focus();dialogInput.select();}
}
document.querySelector('#dialog-cancel').onclick=()=>dialog.close();
document.querySelector('#dialog-form').onsubmit=async e=>{e.preventDefault();const {row,action}=dialogAction||{};if(!row)return;try{if(action==='delete'){await api(`/api/sessions/${row.id}`,{method:'DELETE'});dialog.close();if(session===row.id)await newSession();else await sessions();}else{const title=dialogInput.value.trim();if(!title)return;await api(`/api/sessions/${row.id}`,{method:'PATCH',body:JSON.stringify({title})});dialog.close();await sessions();}}catch(e){status.textContent=e.message;}};
async function sessions(){
 const q=document.querySelector('#search-sessions').value;const rows=await api('/api/sessions?q='+encodeURIComponent(q));const root=document.querySelector('#sessions');root.replaceChildren();
 if(!rows.length){const empty=document.createElement('p');empty.className='empty-sessions';empty.textContent=q?'No conversations found.':'Your conversations will appear here.';root.append(empty);return;}
 for(const row of rows){
  const group=document.createElement('div'), b=document.createElement('button');group.className='session-row';group.classList.toggle('active',row.id===session);b.className='session-title';b.textContent=row.title;b.title=row.title;
  b.onclick=async()=>{if(send.disabled)return;try{session=row.id;messages.replaceChildren();for(const x of await api(`/api/sessions/${session}/messages`)){let sources=[];try{sources=JSON.parse(x.sources)}catch{}render(x.role,x.content,sources);}showSessions(false);await sessions();}catch(e){status.textContent=e.message;}};
  const rename=document.createElement('button');rename.className='session-action';rename.textContent='✎';rename.title='Rename';rename.setAttribute('aria-label',`Rename ${row.title}`);rename.onclick=()=>editSession(row,'rename');
  const del=document.createElement('button');del.className='session-action';del.textContent='×';del.title='Delete';del.setAttribute('aria-label',`Delete ${row.title}`);del.onclick=()=>editSession(row,'delete');group.append(b,rename,del);root.append(group);
 }
}
document.querySelector('#search-sessions').oninput=()=>sessions().catch(e=>status.textContent=e.message);
async function newSession(){session=(await api('/api/sessions',{method:'POST'})).id;messages.replaceChildren();await sessions();input.focus();}
document.querySelector('#new').onclick=()=>send.disabled ? undefined : newSession().catch(e=>status.textContent=e.message);
document.querySelector('#form').onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text||!session)return;input.value='';render('user',text);send.disabled=true;status.textContent='Looking through memory and checking sources…';try{const result=await api(`/api/sessions/${session}/chat`,{method:'POST',body:JSON.stringify({text})});render('assistant',result.answer,result.sources);await sessions();}catch(e){render('assistant',`Could not complete the request: ${e.message}`)}finally{send.disabled=false;status.textContent='';input.focus();}};
input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();document.querySelector('#form').requestSubmit();}};
fetch('/api/config').then(r=>r.json()).then(async c=>{token=c.token;await newSession();}).catch(e=>status.textContent=e.message);
