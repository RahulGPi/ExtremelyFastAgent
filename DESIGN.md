# SOLO design

SOLO answers questions about earlier conversations and checks whether those answers are still current. The primary app is JavaScript on Node.js 24+, started with `npm install` and `npm run dev`. It exposes one model-facing tool: Tavily web search.

Those commands require Node 24 and the system webview dependencies described in the README; Linux also needs WebKitGTK, GTK, libsoup and libxdo. Port 3000 must be free or configured via `PORT`. A clean Node 24 startup was tested on Linux; macOS and Windows have not been tested. Required and optional provider keys are listed in `.env.example`.

## How it works

1. A localhost server serves the chat UI to a frameless WebviewJS window, which uses the operating system's webview. The window collapses to a floating button and supports session management.
2. SQLite stores timestamped turns and returned sources. FTS5 retrieves past questions and following answers across sessions alongside recent active-session turns. Common dates and weekdays are resolved in the local time zone; a model plans other date expressions and search terms.
3. Groq supplies inference, with optional OpenRouter fallback. The model can call `web_search`; SOLO runs up to six searches by default, configurable up to twelve, and reports skipped or failed searches. It asks the model to distinguish previous records from current evidence and to cite sources.
4. SOLO checks cited URLs and uses a second model call to audit the draft against history and source excerpts. If uncertain, it returns records and links instead. The audit is fallible: a citation is not proof. History and search results are treated as untrusted input.

Protected API calls require an ephemeral token. Keys in `.env` and local SQLite history are not encrypted. Model providers receive selected conversation context; Tavily receives search queries. It can import earlier Rust-app history.

## Why this design

SQLite and bounded lexical retrieval avoid a separate database service and reduce the need to resend an entire chat. Timestamps enable date-based recall. One search tool bounds the agent's scope and search spending. WebviewJS provides a compact window without bundling Chromium, and Node meets the requested runtime. The fallback favors uncertainty over unsupported claims.

## Alternatives considered

- **Electron or a browser window:** Electron bundles a larger runtime; a browser window offered less control over the interface. WebviewJS still depends on system libraries and compositor behavior.
- **Rust/Tauri as the primary app:** the root Rust sources and `desktop/` are retained as a legacy implementation, not the current entry point. `npm run dev` runs `node-app/server.js`; the Node app does not build or launch the old Rust/Tauri app. WebviewJS uses a platform-native dependency and system webview, so startup still has the prerequisites above.
- **Full-history prompts or a vector database:** full history increases token use and latency; a separate vector store adds complexity. FTS5 can miss paraphrases.
- **Trusting any cited link:** a matching URL may not support its claim. The model audit adds latency and cost and can still make mistakes.

## With another week

First, retain supported findings individually and log why others were rejected, with dated evidence for each price change or release. Add automatically scored retrieval and research evaluations, token and cost budgets, and separate application/provider latency measurements. Improve semantic retrieval and date coverage; test packaging, shortcuts, and the native window on macOS and Windows. In the latest eight-case synthetic run, three recall cases passed and five research cases were partial, often returning links without an answer; see [the report](reports/full-memory-evaluation-2026-11-11.md).
