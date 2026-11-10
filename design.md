# SOLO design

## Runtime and interfaces

The primary implementation is JavaScript on Node.js 22.13+, started with `npm install` and `npm run dev`. The local HTTP server binds to 127.0.0.1 and serves a browser chat interface. State-changing API calls require an ephemeral local token. The app has no npm dependencies and uses Node's experimental `node:sqlite` module. `.env.example` lists required and optional provider keys.

The browser creates a fresh session on page load. Users can search, rename, delete, and reopen sessions. User messages are saved before inference so failed requests are still remembered; assistant messages and their source results are persisted after successful responses. The existing Rust/Tauri app is retained as legacy source and is not a runtime dependency.

## Memory and search

SQLite stores sessions, ordered timestamped turns, and search sources. FTS5 retrieves relevant user messages from all sessions and their following assistant messages. When a question refers to a specific day, a model interprets it against current time and the system time zone, and the database selects that UTC range. Recent messages from the active session are added separately. Retrieval is bounded and lexical; ambiguous dates, paraphrases, many matching messages, and model date interpretation can cause misses. Existing `mim.db` conversations and sources are imported once into `solo-node.db` when present, without changing the old file.

A model request receives recent turns and retrieved records with timestamps. A single exposed tool, `web_search`, calls Tavily. Groq is primary; OpenRouter is optional fallback. Current-information cues request web search; results are bounded and citations are checked against returned URLs. If no returned URL is cited, the app supplies retrieved records and source links instead of presenting the unsupported model answer. This is not claim-level verification: a cited page may not support a claim. Search results and recalled content are untrusted and must not override instructions.

## Configuration, privacy, and limits

See `.env.example` and README for keys and configuration. SQLite and keys are not encrypted; Unix database permissions are restricted. Requests send context to the chosen model provider and search queries to Tavily. OpenRouter's free router can change models and may be rate-limited. There are no cost budgets or guaranteed latency targets yet. Source excerpts are stored with answers. The browser is local-only, and links are rendered with DOM APIs rather than HTML injection.

## Validation and known gaps

`npm test` covers cross-session topic recall, date ranges, safe FTS syntax, legacy import, and URL matching. A Linux live smoke test with synthetic 3 November history retrieved the earlier question and answer, performed web search, and returned a comparison; it is not a comprehensive accuracy benchmark. macOS and Windows have not been tested. Node's SQLite API is experimental.

Known gaps include exact token counting, automatic budget limits, comprehensive deterministic date evaluation and DST tests, semantic retrieval, per-claim evidence verification, provider-stage progress in the browser, streaming, full Markdown support, richer UI tests, and production-grade multi-user isolation. The former native top-edge notch and global shortcut are not part of this Node/browser version.
