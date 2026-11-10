const invoke = window.__TAURI__.core.invoke;
const cancelButton = document.querySelector('#cancel');
let sessionId = null;
const panel = document.querySelector('#sessions-panel'), sessionList = document.querySelector('#sessions-list'), sessionSearch = document.querySelector('#session-search');
const ready = invoke('new_session').then(id => { sessionId = id; }).catch(e => { status.textContent = `Unable to create session: ${e}`; throw e; });
function resetMessages() { messages.replaceChildren(); const welcome = document.createElement('div'); welcome.className = 'welcome'; const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = 'SOLO'; const greeting = document.createElement('div'); greeting.textContent = 'What can I help with?'; welcome.append(brand, greeting); messages.append(welcome); evidence.hidden = true; }
async function loadSession(id) { if (active) return; const rows = await invoke('recent_messages', {sessionId:id}); sessionId = id; resetMessages(); for (const row of rows) add(row.role === 'user' ? 'You' : 'mim', row.content, row.role === 'assistant' ? row.sources : null); panel.hidden = true; input.focus(); }
async function refreshSessions() {
  const rows = await invoke('list_sessions', {query:sessionSearch.value}); sessionList.replaceChildren();
  for (const row of rows) {
    const item = document.createElement('div'); item.className = 'session-row';
    const open = document.createElement('button'); open.className = 'session-open'; open.textContent = row.title; open.title = row.created_at;
    open.onclick = () => loadSession(row.id).catch(e => status.textContent = String(e));
    const rename = document.createElement('button'); rename.textContent = 'Rename';
    rename.onclick = () => {
      if (active) return; item.replaceChildren();
      const field = document.createElement('input'); field.value = row.title; field.maxLength = 200;
      const save = document.createElement('button'); save.textContent = 'Save';
      save.onclick = async () => { try { if (!field.value.trim()) return; await invoke('rename_session', {sessionId:row.id, title:field.value}); await refreshSessions(); } catch(e) { status.textContent = String(e); } };
      const back = document.createElement('button'); back.textContent = 'Cancel'; back.onclick = () => refreshSessions();
      item.append(field,save,back); field.focus(); field.select();
    };
    const remove = document.createElement('button'); remove.textContent = 'Delete';
    remove.onclick = () => {
      if (active) return; item.replaceChildren();
      const label = document.createElement('span'); label.className = 'session-open'; label.textContent = `Delete “${row.title}”?`;
      const yes = document.createElement('button'); yes.textContent = 'Delete'; yes.className = 'danger';
      yes.onclick = async () => { try { await invoke('delete_session', {sessionId:row.id}); if (sessionId === row.id) { sessionId = await invoke('new_session'); resetMessages(); } await refreshSessions(); } catch(e) { status.textContent = String(e); } };
      const no = document.createElement('button'); no.textContent = 'Cancel'; no.onclick = () => refreshSessions();
      item.append(label,yes,no);
    };
    item.append(open,rename,remove); sessionList.append(item);
  }
}
document.querySelector('#sessions-toggle').addEventListener('click', async () => { if (active) return; panel.hidden=!panel.hidden; if (!panel.hidden) { await refreshSessions(); sessionSearch.focus(); } });
document.querySelector('#sessions-close').addEventListener('click', () => panel.hidden=true);
sessionSearch.addEventListener('input', () => refreshSessions().catch(e => status.textContent=String(e)));
document.querySelector('#new-session').addEventListener('click', async () => { if (active) return; try { await ready; sessionId=await invoke('new_session'); resetMessages(); panel.hidden=true; input.focus(); } catch(e) { status.textContent=String(e); } });
cancelButton.addEventListener('click', () => { cancelButton.disabled = true; status.textContent = 'Cancelling…'; invoke('cancel').catch(e => {status.textContent = String(e);}); });
const form = document.querySelector('#form'), input = document.querySelector('#input'), messages = document.querySelector('#messages'), status = document.querySelector('#status'), send = document.querySelector('#send'), evidence = document.querySelector('#evidence'), sourceList = document.querySelector('#source-list');
let active = false;
let currentProvider = 'Groq';
const progressLabel = () => currentProvider === 'OpenRouter' ? '1 · Groq unavailable  →  2 · OpenRouter' : '1 · Groq';
const progressReady = window.__TAURI__.event.listen('agent-progress', event => {
  if (!active) return;
  switch (event.payload) {
    case 'groq': cancelButton.disabled = false; currentProvider = 'Groq'; status.textContent = '1 · Groq — thinking…'; break;
    case 'retry': status.textContent = `${progressLabel()} — retrying an invalid tool call…`; break;
    case 'rate_limit': status.textContent = `${progressLabel()} — rate limited, waiting to retry…`; break;
    case 'fallback': currentProvider = 'OpenRouter'; status.textContent = '1 · Groq unavailable  →  2 · OpenRouter — thinking…'; break;
    case 'search': status.textContent = `${progressLabel()} — searching the web…`; break;
    case 'answer': status.textContent = `${progressLabel()} — preparing answer…`; break;
  }
});
function showSources(sources) {
  sourceList.replaceChildren();
  if (!sources.length) { sourceList.textContent = 'No source was linked to this passage. It has not been verified.'; }
  else { const note = document.createElement('p'); note.textContent = 'Search results and excerpts; a citation does not guarantee this claim is supported.'; sourceList.append(note); }
  for (const source of sources) {
    const row = document.createElement('div'); row.className = 'source';
    const link = document.createElement('button'); link.type = 'button'; link.textContent = source.title || source.url;
    link.addEventListener('click', () => invoke('open_source', {url: source.url}).catch(e => {status.textContent = String(e);}));
    const url = document.createElement('p'); url.textContent = source.url;
    const excerpt = document.createElement('p'); excerpt.textContent = source.content || 'No excerpt available.';
    row.append(link, url, excerpt); sourceList.append(row);
  }
  evidence.hidden = false;
}
function inline(target, text) {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g;
  let last = 0; for (const match of text.matchAll(pattern)) {
    target.append(document.createTextNode(text.slice(last, match.index))); const value = match[0];
    if (value.startsWith('**')) { const strong = document.createElement('strong'); strong.textContent = value.slice(2,-2); target.append(strong); }
    else if (value.startsWith('`')) { const code = document.createElement('code'); code.textContent = value.slice(1,-1); target.append(code); }
    else { const span = document.createElement('span'); span.textContent = value.startsWith('[') ? value.slice(1,value.indexOf(']')) : value; target.append(span); }
    last = match.index + value.length;
  } target.append(document.createTextNode(text.slice(last)));
}
function add(role, value, sources = null) {
  document.querySelector('.welcome')?.remove(); const el = document.createElement('article'); el.className = 'message';
  const label = document.createElement('strong'); label.className = 'label'; label.textContent = role; el.append(label);
  let list = null, codeBlock = null;
  for (const line of value.split('\n')) {
    if (line.trim().startsWith('```')) {
      if (codeBlock) { codeBlock = null; } else { const pre = document.createElement('pre'); codeBlock = document.createElement('code'); pre.append(codeBlock); el.append(pre); }
      list = null; continue;
    }
    if (codeBlock) { codeBlock.append(document.createTextNode(line + '\n')); continue; }
    if (!line.trim()) { list = null; continue; }
    const bullet = line.match(/^\s*(?:[-*]\s+|\d+[.)]\s+)(.*)$/);
    let block;
    if (bullet) { if (!list) { list = document.createElement(/^\s*\d/.test(line) ? 'ol' : 'ul'); el.append(list); } block = document.createElement('li'); list.append(block); inline(block, bullet[1]); }
    else { list = null; const heading = line.match(/^#{1,4}\s+(.+)$/); block = document.createElement(heading ? 'h3' : 'p'); inline(block, heading ? heading[1] : line); el.append(block); }
    if (sources !== null) {
      const matching = sourceMatching.matchingSources(line, sources); block.className = 'source-block'; block.tabIndex = 0;
      block.title = matching.length ? 'Show cited source' : 'No source linked to this passage';
      const open = () => showSources(matching); block.addEventListener('click', open); block.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
  }
  if (sources !== null) {
    const note = document.createElement('div'); note.className = 'source-note'; note.textContent = 'Select a passage for its cited sources. Unlinked passages are unverified.'; el.append(note);
    if (sources.length) { const all = document.createElement('button'); all.type = 'button'; all.className = 'sources-button'; all.textContent = `View all ${sources.length} search sources`; all.addEventListener('click', () => showSources(sources)); el.append(all); }
  }
  messages.append(el); messages.scrollTop = messages.scrollHeight;
}
form.addEventListener('submit', async e => { e.preventDefault(); const text = input.value.trim(); if (!text || send.disabled) return; add('You', text); panel.hidden = true; input.value = ''; send.disabled = true; cancelButton.hidden = false; cancelButton.disabled = true; active = true; status.textContent = '1 · Groq — starting…'; try { await ready; await progressReady; const result = await invoke('chat', { text, sessionId }); add(result.provider === 'OpenRouter backup' ? 'mim · OpenRouter backup' : 'mim', result.answer, result.sources); } catch (error) { add('Could not complete request', String(error)); } finally { active = false; cancelButton.hidden = true; send.disabled = false; status.textContent = ''; input.focus(); } });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
document.querySelector('#close-evidence').addEventListener('click', () => { evidence.hidden = true; });
document.querySelector('#close').addEventListener('click', () => invoke('close_window'));

async function setCollapsed(collapsed) {
  try { await invoke('resize_panel', {collapsed}); document.body.classList.toggle('collapsed', collapsed); document.querySelector('#expand-notch').hidden = !collapsed; if (!collapsed) input.focus(); }
  catch (error) { status.textContent = `Could not resize window: ${error}`; }
}
document.querySelector('#collapse').addEventListener('click', () => setCollapsed(true));
document.querySelector('#expand-notch').addEventListener('click', () => setCollapsed(false));
document.addEventListener('keydown', e => { if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); setCollapsed(!document.body.classList.contains('collapsed')); } });

window.__TAURI__.event.listen('solo-toggle', () => setCollapsed(!document.body.classList.contains('collapsed')));

const settingsPanel = document.querySelector('#settings-panel');
async function updateKeyStatus() {
  const values = await invoke('api_key_status');
  for (const name of ['groq','tavily','openrouter']) { const v=values[name]; document.querySelector(`#${name}-status`).textContent = v.environment ? '· set via environment' : v.configured ? '· configured' : '· not configured'; }
}
document.querySelector('#settings-toggle').addEventListener('click', async () => {
  settingsPanel.hidden = !settingsPanel.hidden;
  if (!settingsPanel.hidden) { panel.hidden = true; try { await updateKeyStatus(); } catch(e) { document.querySelector('#settings-message').textContent = String(e); } }
});
document.querySelector('#settings-close').addEventListener('click', () => { settingsPanel.hidden = true; for (const field of document.querySelectorAll('#api-settings input')) field.value=''; });
document.querySelector('#api-settings').addEventListener('submit', async e => {
  e.preventDefault(); const message=document.querySelector('#settings-message');
  const keys = Object.fromEntries(['groq','tavily','openrouter'].map(name => [name,document.querySelector(`#${name}-key`).value]));
  try { await invoke('save_api_keys',{keys}); for (const field of document.querySelectorAll('#api-settings input')) field.value=''; await updateKeyStatus(); message.textContent='Keys saved.'; }
  catch(error) { message.textContent=String(error); }
});
