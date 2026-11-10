# Work log

## Initial implementation
- Chose Rust, SQLite, Groq and Tavily for a small local CLI and a single search tool.
- Inputs: user messages and provider credentials from environment. Outputs: chat answers, source links, token usage and local timestamped history. Credentials are not logged.
- Known gaps and next work are recorded in design.md.
- Validation: `cargo test` could not download dependencies because crates.io DNS was unavailable; `cargo test --offline` also failed because reqwest was not cached. Compilation and live provider behavior remain unverified.
- Retried with network access: dependencies downloaded and `cargo test` passed (2 tests). Live provider calls remain unverified.
- Push to the configured GitHub remote was blocked by automatic approval review pending confirmation of the destination and exported contents.

## Local testing
- `cargo test`: five tests pass, including bounded chronological history, UTC timestamps, and terminal control filtering.
- CLI smoke test: `/history` and `/quit` work with an empty temporary database; database permissions were 600 on Linux.
- `cargo clippy` and `cargo fmt` are unavailable in the installed toolchain. Live inference, search, and end-to-end verification remain untested without provider credentials.

## Tooling
- Installed matching Clippy and rustfmt binaries locally under ignored `.tools/` from the system distribution packages.
- Formatted the Rust source; `cargo fmt -- --check`, `cargo clippy --all-targets -- -D warnings`, and all five tests pass using `.tools/usr/bin` on PATH.

## Live provider test
- Both API keys are present; `.env` permissions are 600. No credentials were logged.
- Groq's original default model returned 404 and was absent from the account's model list; switched default to available `openai/gpt-oss-20b`.
- Groq issued search calls and Tavily returned results, which reached the next Groq request. The full answer remains unverified: the final request returned 429 (rate limit). Corrected the final-round tool configuration after a 400 response.
- Five unit tests, Clippy and formatting checks pass after the changes.

## Latency investigation
- One live debug-build search turn took 3.37 s wall time and 11,868 KiB peak RSS; three model calls and two search rounds occurred. It returned an incorrect stale Rust release and malformed citation markers (official releases list shows 1.99.1, not 1.92.0).
- Three standalone fresh-connection Tavily fast searches took 0.318, 0.319 and 0.421 s. Three standalone small Groq requests took 0.473, 0.837 and 0.604 s. These are small samples and not a stage-by-stage breakdown of the live turn.
- Inspection: search calls in each round run serially, responses are not streamed, search results accumulate into repeated model context, and each HTTP request has a 20-second timeout. Further profiling should measure per-stage timing in the CLI and test under realistic histories.

## Context control
- Three research agents assessed retrieval, compression and token budgeting. Implemented a 24,000-byte recent-history limit and at most three 800-byte search excerpts per call, with UTF-8-safe truncation. Original history is retained in SQLite. Byte caps are not token caps; retrieval of older relevant messages and token-accurate budgets remain future work.
- Seven unit tests and Clippy pass, including history size and Unicode boundaries. A live search had 194 input tokens initially and 913 after its first search (a prior run had 1,563 at that stage, but results and model decisions vary). The final model request returned HTTP 400, so answer quality and full-turn latency remain unverified. The `cargo run` timing included compilation and is not a valid runtime/RSS benchmark.

## Long-history and inference research
- A synthetic temporary SQLite database of 100,000 repetitive messages used 9.76 MiB; adding an external-content FTS5 index increased it to 14.51 MiB. Two warm ranked searches with terms present in every message took 61 and 72 ms. This is not a representative benchmark or a comparison with a production corpus.
- Recommended SQLite external-content FTS5 for lexical recall and Cerebras as the first inference alternative to benchmark. Neither has been integrated or live-tested; provider access and pricing remain to be checked.

## Application-only latency
- Added an opt-in local release-mode benchmark (`cargo test --release profile_history_and_request_construction -- --ignored --nocapture`). With 10,000 synthetic 1 KB messages in an in-memory SQLite database, 1,000 iterations averaged 7.3 µs for bounded history reads and 9.2 µs for JSON request construction and serialization. Warm synthetic measurements, not production percentiles.
- Separately, 30 SQLite autocommit writes of 1 KB to /tmp via a Python harness had median 3.17 ms and p95 4.41 ms; filesystem and durability settings strongly affect results. These were not measurements of the Rust app's database path.
- No provider calls included. Local code observations: synchronous durable writes occur twice per successful turn, the JSON tree is cloned and serialized on each model round, result arrays are cloned, searches are serial, and no response streaming is implemented. The last two affect end-to-end or perceived time but require separate measurement. Current local timings do not justify weakening durability.

## Live timing breakdown
- Release build, three sequential prompts, local temporary database: no-search answer total 1147.93 ms, HTTP 1137.69 ms, remainder 10.24 ms; SQLite search total 3472.78 ms, HTTP 3468.18 ms, remainder 4.60 ms; Python documentation search total 3083.66 ms, HTTP 3076.19 ms, remainder 7.47 ms.
- Both search turns failed with HTTP 400 after two model requests; they are failed-turn measurements, not end-to-end successful search benchmarks. Provider HTTP includes transport and provider time, not just remote inference. Remainder includes all other wall time including disk, scheduling and terminal output. Small sample, not percentiles.
- Added optional `MIM_PROFILE` instrumentation. Seven tests and Clippy pass. The model/tool error and citation verification remain unresolved.

## Chat interface and memory retrieval
- Added an inline chat-first terminal layout, help and searchable history, simple local `.env` loading, web-search progress and non-interactive output.
- Added transactional FTS5 migration and triggers; relevant older questions are injected as timestamped historical context within the existing byte limit.
- Eight tests pass, including backfill, update and delete index behavior; Clippy and a piped command smoke test pass. Live provider search remains affected by the previously observed HTTP 400 and was not retested. No full-screen navigation, semantic retrieval or comprehensive UI accessibility testing has been implemented.

## Request failure investigation
- Reproduced Groq 400: the previous default model requested a tool when tool choice was disabled after the search limit. Switched default to qwen/qwen3.8-27b, added explicit final-round instruction, and report provider error messages.
- Another live request failed tool schema validation (missing query). Added one bounded retry for that specific error. Four searches with Qwen succeeded, one failed prior to the retry implementation; a subsequent live search passed. Small sample; no guarantee of reliability or citation support.
- Eight unit tests and Clippy pass; citation verification remains outstanding.

## Terminal experience
- Added terminal line editing with in-session input history, clear help, request cancellation, and quieter token diagnostics. Piped input retains line-oriented behavior; no separate history file stores inputs.
- Eight tests and Clippy pass. PTY smoke test confirmed startup and help; the test environment's terminal did not support reliable arrow-key verification. No live provider calls were needed for this change.

## Pokémon filler regression
- The model answered the user's request without searching and fabricated episode numbers and titles. Added explicit search routing for find/search cues, stricter source instructions, and a check that blocks search-based answers without an actual returned URL.
- Live Qwen tests hit malformed tool calls and short-term output-token limits; an alternative model produced another fabricated list despite searching. After the source-link check, a live test returned source links instead of the uncited fabricated answer. This is not claim-level verification and search quality is still unresolved.
- Ten tests and Clippy pass. One bounded short rate-limit retry added; longer rate limits surface to the user.

## Tauri desktop prototype
- Added a Tauri window with a chat form, status, source text and searchable question history backed by the existing agent. Added an application icon and Linux build configuration.
- GTK3 and WebKitGTK build dependencies were installed by the user. `cargo build --manifest-path desktop/Cargo.toml` passes; CLI tests and JavaScript syntax check pass. A sandboxed GUI launch could not access GTK; an unsandboxed timed launch produced no startup error, but interaction was not verified.
- The requested notch overlay, global shortcut, cancellation, actual link handling, proper shared backend and cross-platform tests remain outstanding. This is a prototype, not the complete planned desktop experience.

## Response formatting and source inspection
- Removed the requested window and header chrome and footer. Added safe text-only Markdown rendering for headings, lists, bold, inline code and fenced code.
- Desktop responses now receive actual search result URLs, titles and excerpts; clicking a passage shows matching cited results, while unlinked passages show an unverified notice. This is citation association, not claim-level verification or exact extraction provenance.
- Ten CLI tests, Clippy, desktop compilation and JavaScript syntax checks pass. Interactive UI and external-link behavior have not yet been verified on the display.

## Rate-limit handling
- Increased the bounded Retry-After window from two to 20 seconds, with one retry per inference call. Missing, invalid or longer delays still surface the error; no unbounded retry is performed.
- Eleven tests, Clippy and the desktop build pass. Live rate-limit behavior was not reproduced during this change.

## OpenRouter backup
- Added OpenRouter fallback on selected Groq failures while retaining tool-call context and source checks. Uses configured key and `OPENROUTER_MODEL`, default `openrouter/free`.
- Live forced-fallback tests: the original free model slug was unavailable; a specific free endpoint returned 429; `openrouter/free` answered a simple prompt and invoked web search. The search output was rejected by the source guard and displayed links, so factual answer quality remains unverified.
- Eleven unit tests, Clippy, desktop build and JavaScript syntax check pass.

## Provider progress in desktop UI
- Added live status events from the agent to the desktop window, including Groq, retries, rate-limit waits, OpenRouter fallback, web search and answer preparation. No prompts or credentials are included in events.
- Eleven tests, Clippy, desktop build and JavaScript syntax check pass. Progress rendering and event delivery have not been exercised interactively in a GUI session.

## Source linking repair
- Replaced substring association with whole-URL matching in the desktop and backend, preventing URL-prefix matches. Added an all-search-sources control and clear distinction between explicit passage citations and search results generally. Source metadata is still not saved with historical messages; citation association is not factual verification.
- Added URL boundary and UI matching tests; 12 Rust tests, Node tests, Clippy and desktop build pass. Interactive GUI behavior was not retested.

## Persistent sources and cancellation
- New assistant answers and source metadata are committed together; the UI restores recent messages and sources. Old answers lack source metadata and remain unverified.
- Added a Stop button that cancels the in-flight request locally. Cancellation cannot guarantee a remote provider stops processing or billing.
- Desktop tests include closing and reopening a database with source metadata. Thirteen tests, desktop Clippy, JavaScript syntax and build pass. GUI cancellation and source restoration need interactive testing. Notch positioning and system-wide shortcut remain unimplemented; this session's COSMIC portal does not advertise global shortcuts.

## Desktop sessions
- Added a new session per app launch, a searchable Sessions panel, rename and confirmed deletion, and session-scoped model history. Prior messages migrate into Earlier conversations; stored citations remain linked to their messages.
- Fourteen desktop tests (including idempotent legacy migration), desktop Clippy, JavaScript syntax and desktop build pass. Session UI and destructive delete behavior have not been interactively tested; reopened views currently load up to 200 messages.

## SOLO welcome and compact window
- Added SOLO above the welcome greeting and a compact collapsed button that can reopen chat. Alt+A works within the focused webview; it is not registered globally, and top-center anchoring remains unimplemented.
- Fourteen desktop tests, Clippy, JavaScript syntax and desktop build pass. Collapse, focus, and Wayland sizing have not been interactively verified.

## Session controls and shortcut bridge
- Added in-app per-session delete confirmation and rename editing, and topic-based deterministic titles from the first prompt.
- Added Tauri single-instance handling and a `--toggle` event for binding through COSMIC custom shortcuts. The global binding is not installed automatically and the top-edge overlay remains unimplemented. `sudo -n apt-get install libgtk-layer-shell-dev` could not run because sudo requires a password.
- Fifteen desktop tests, Clippy, JavaScript syntax and desktop build pass. Single-instance event delivery, the COSMIC shortcut, and session controls still need interactive verification.
