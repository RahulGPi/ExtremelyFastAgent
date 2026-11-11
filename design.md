# SOLO design

## Runtime and interfaces

The primary implementation is JavaScript on Node.js 24+, started with `npm install` and `npm run dev`. The local HTTP server binds to 127.0.0.1 and serves a chat interface displayed in a frameless WebviewJS native window. State-changing API calls require an ephemeral local token. The native shell uses the system webview rather than bundling Chromium; the app uses Node's experimental `node:sqlite` module. `.env.example` lists required and optional provider keys.

The webview creates a fresh session on page load. Users can search, rename, delete, and reopen sessions. User messages are saved before inference so failed requests are still remembered; assistant messages and their source results are persisted after successful responses. The existing Rust/Tauri app is retained as legacy source and is not a runtime dependency.

## Memory and search

SQLite stores sessions, ordered timestamped turns, and search sources. FTS5 retrieves relevant user messages from all sessions and their following assistant messages. Common day-month dates and past weekdays are resolved locally in the system time zone, including daylight-saving changes. Other date expressions use model interpretation. The database selects the resulting UTC range. Recent messages from the active session are added separately. Retrieval is bounded and lexical; ambiguous dates, paraphrases, many matching messages, and model date interpretation can cause misses. Existing `mim.db` conversations and sources are imported once into `solo-node.db` when present, without changing the old file.

A model request receives recent turns and retrieved records with timestamps. A single exposed tool, `web_search`, calls Tavily. Groq is primary; OpenRouter is optional fallback. Current-information cues request web search; the loop executes up to six searches by default (configurable from one to twelve), in batches of three, and returns tool responses for skipped and failed calls. Results are bounded and citations are checked against returned URLs. It retries a truncated answer concisely and makes one citation-repair attempt if no returned URL was cited. If no returned URL is cited, the app supplies retrieved records and source links instead of presenting the unsupported model answer. A second model call audits the draft against prior records and the excerpts of cited results; missing or uncertain support leads to an evidence-only fallback. This audit is fallible and can reject useful answers or miss errors; it is not proof that a cited page supports a claim. Search results and recalled content are untrusted and must not override instructions.

## Configuration, privacy, and limits

See `.env.example` and README for keys and configuration. SQLite and keys are not encrypted; Unix database permissions are restricted. Requests send context to the chosen model provider and search queries to Tavily. OpenRouter's free router can change models and may be rate-limited. There are no cost budgets or guaranteed latency targets yet. Source excerpts are stored with answers. The server is local-only, and links are rendered with DOM APIs rather than HTML injection.

## Validation and known gaps

`npm test` covers cross-session topic recall, date ranges including a daylight-saving transition, safe FTS syntax, legacy import, and URL matching. A Linux live smoke test with synthetic 3 November history retrieved the earlier question and answer, performed web search, and returned a comparison; it is not a comprehensive accuracy benchmark. macOS and Windows have not been tested. Node's SQLite API is experimental.

Known gaps include exact token counting, monetary budget limits, comprehensive date-expression evaluation, semantic retrieval, reliable per-claim verification beyond the fallible model audit, ensuring each item in a multi-product shortlist is checked, provider-stage progress in the browser, streaming, full Markdown support, richer UI tests, and production-grade multi-user isolation. The window can collapse into a compact button. Alt+A is handled when focused; a system-wide shortcut requires a desktop binding to the supplied toggle command. Wayland controls window positioning and always-on-top behavior, so top-center anchoring is not guaranteed.
