const invoke = window.__TAURI__.core.invoke;
const form = document.querySelector('#form'), input = document.querySelector('#input'), messages = document.querySelector('#messages'), status = document.querySelector('#status'), send = document.querySelector('#send'), evidence = document.querySelector('#evidence'), sourceList = document.querySelector('#source-list');
let active = false;
let currentProvider = 'Groq';
const progressLabel = () => currentProvider === 'OpenRouter' ? '1 · Groq unavailable  →  2 · OpenRouter' : '1 · Groq';
const progressReady = window.__TAURI__.event.listen('agent-progress', event => {
  if (!active) return;
  switch (event.payload) {
    case 'groq': currentProvider = 'Groq'; status.textContent = '1 · Groq — thinking…'; break;
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
form.addEventListener('submit', async e => { e.preventDefault(); const text = input.value.trim(); if (!text || send.disabled) return; add('You', text); input.value = ''; send.disabled = true; active = true; status.textContent = '1 · Groq — starting…'; try { await progressReady; const result = await invoke('chat', { text }); add(result.provider === 'OpenRouter backup' ? 'mim · OpenRouter backup' : 'mim', result.answer, result.sources); } catch (error) { add('Could not complete request', String(error)); } finally { active = false; send.disabled = false; status.textContent = ''; input.focus(); } });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
document.querySelector('#close-evidence').addEventListener('click', () => { evidence.hidden = true; });
document.querySelector('#close').addEventListener('click', () => invoke('close_window'));
