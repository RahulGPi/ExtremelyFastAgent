# Architecture

Rust CLI with SQLite history, Groq inference and one Tavily web-search tool. Connections are reused and requests have timeouts. Search content is untrusted. Messages are timestamped in UTC and recent history is bounded to 12 messages and 24,000 content bytes (the newest message is preserved), and each search call returns at most three excerpts of 800 UTF-8 bytes each. These byte limits are not exact token limits; older messages remain in SQLite but are not yet retrieved by relevance. API keys come from environment variables, never logs. Local database permissions are restricted on Unix.

The initial implementation limits tool calls and response tokens; it displays provider-reported token usage. It does not yet enforce monetary budgets, independently verify sources, stream responses, or search older history. Answers must identify uncertainty and cite retrieved sources, but citations are not automatically validated. These are priorities for the next stage, along with provider adapters and latency benchmarks.

Use `GROQ_API_KEY`, `TAVILY_API_KEY`, optionally `GROQ_MODEL` and `MIM_DB`; run `cargo run`. `/history` shows stored user messages and timestamps; `/quit` exits. Searches and conversation text are sent to the respective providers.

Development rule: keep this document current, record concise decisions and test results in WORKLOG.md, and commit and push small coherent stages when the repository and network permissions allow. Never record secrets or private reasoning.

## Research: long history and inference alternatives

For long chat history, retain timestamped original messages in SQLite and add an external-content FTS5 index, backfilled on migration and maintained with triggers. Retrieve a small set of relevant old messages plus recent turns under a shared context budget, with timestamps; test recall and storage costs before rollout. FTS is lexical, so paraphrases may be missed. Consider embeddings only if retrieval evaluation shows a material gap; they add model, index, latency and operational costs. See https://www.sqlite.org/fts5.html.

Cerebras is a candidate alternative to Groq, with an OpenAI-compatible chat API and documented tool calling for `zai-glm-4.7`: https://inference-docs.cerebras.ai/resources/glm-47-migration. Fireworks is another candidate: https://docs.fireworks.ai/. Neither is integrated or benchmarked here. Check model access, pricing and limits for the actual account, and compare time to first token, end-to-end latency, search tool compatibility and citation accuracy before switching. Never send credentials to an arbitrary configured endpoint.

Set `MIM_PROFILE=1` to print per-turn elapsed time, time inside provider HTTP requests through response body receipt, and the remainder. The remainder includes local work, scheduling and terminal output; it is not a CPU-only measurement. Timing includes both successful and failed turns.

## Chat and memory interface

The interactive terminal displays a compact chat header and progress messages; redirected input uses plain output. `/help` lists commands and `/history [words]` searches previous user questions. API keys are read from the environment or a local `.env` file without executing it. SQLite FTS5 indexes existing and new messages; matching older questions are added with UTC timestamps within the existing history byte budget. Retrieval is lexical and can miss paraphrases. This is an inline terminal interface, not a full-screen TUI; terminal-native editing and scrolling apply.

Default Groq model is `qwen/qwen3.8-27b` (overridable via `GROQ_MODEL`). The agent retries one provider-rejected malformed tool call and enforces its existing search-round limit; provider errors are displayed without dumping raw response bodies.

Interactive input uses line editing and in-session input history on supported terminals. Ctrl+C clears input or cancels an active request; Ctrl+D exits. Piped input keeps the simple line-oriented mode. Usage counts are shown when `MIM_PROFILE` is set.

Requests explicitly asking to find or search information, plus common freshness and filler-list cues, require a web search on the first model call. For search-based answers, the CLI checks that the answer contains a returned source URL; otherwise it displays source links instead of the model's answer. This check does not verify whether a source supports individual claims. Rate-limit responses with a short Retry-After get at most one retry.

## Desktop prototype

`desktop/` contains a Tauri 2 window and static chat UI using the existing Rust agent and SQLite database. Launch from the repository root with `cargo run --manifest-path desktop/Cargo.toml`, so `.env` and `mim.db` resolve as in the CLI. GTK3 and WebKitGTK 4.1 development packages are required on Linux. This prototype is a normal always-on-top window; the top-edge notch, global Alt+A shortcut, cancellation and cross-platform packaging are not implemented. The backend is currently shared by including the CLI module and needs refactoring into a library.

Desktop responses render common Markdown without interpreting model-supplied HTML. Selecting an answer passage opens explicitly cited search results and their returned excerpts; passages without a matching citation are labeled unverified. A citation points to a returned result but is not proof the source supports the passage. The native title bar and introductory header are removed; a close control remains inside the app.

Inference 429 responses with a valid `Retry-After` of at most 20 seconds are retried once; longer or missing delays are reported to the user. This reduces transient failures but does not increase provider quotas.
