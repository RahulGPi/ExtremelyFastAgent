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
