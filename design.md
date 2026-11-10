# Architecture

Rust CLI with SQLite history, Groq inference and one Tavily web-search tool. Connections are reused and requests have timeouts. Search content is untrusted. Messages are timestamped in UTC and recent history is bounded. API keys come from environment variables, never logs. Local database permissions are restricted on Unix.

The initial implementation limits tool calls and response tokens; it displays provider-reported token usage. It does not yet enforce monetary budgets, independently verify sources, stream responses, or search older history. Answers must identify uncertainty and cite retrieved sources, but citations are not automatically validated. These are priorities for the next stage, along with provider adapters and latency benchmarks.

Use `GROQ_API_KEY`, `TAVILY_API_KEY`, optionally `GROQ_MODEL` and `MIM_DB`; run `cargo run`. `/history` shows stored user messages and timestamps; `/quit` exits. Searches and conversation text are sent to the respective providers.

Development rule: keep this document current, record concise decisions and test results in WORKLOG.md, and commit and push small coherent stages when the repository and network permissions allow. Never record secrets or private reasoning.
