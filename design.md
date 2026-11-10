# SOLO architecture and operation

## Platform status

SOLO is a Rust agent with a Tauri 2 desktop window and an optional terminal interface. **macOS and Windows builds, runtime behavior, keyboard shortcuts, packaging and security have not been tested.** Linux has been built and smoke-tested on COSMIC Wayland; the GUI has not had comprehensive automated end-to-end testing. Platform support is a goal, not a release guarantee.

Tauri uses WebKitGTK on Linux, WKWebView on macOS, and WebView2 on Windows. For development install Rust and the dependencies in [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Linux needs GTK3 and WebKitGTK 4.1 development libraries. macOS needs Xcode Command Line Tools; Windows needs MSVC C++ Build Tools and WebView2. The current configuration does not produce an installer or signed/notarized distribution. Build and test each platform on that platform before release.

From the project root, start the desktop app with `cargo run --manifest-path desktop/Cargo.toml`, or the CLI with `cargo run`. The desktop starts a new session each launch. Settings accepts Groq, Tavily and optional OpenRouter keys. Blank fields preserve existing keys. Environment variables override saved keys: `GROQ_API_KEY`, `TAVILY_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_MODEL`, `OPENROUTER_MODEL`, `MIM_DB`, and `MIM_PROFILE`. Do not commit `.env` or the database.

In a development checkout, `.env` and `mim.db` live in the project directory, including when the executable is launched elsewhere. Outside a checkout, data defaults to `%APPDATA%/SOLO` on Windows, `~/Library/Application Support/SOLO` on macOS, and `$XDG_CONFIG_HOME/SOLO` (or `~/.config/SOLO`) on Linux. `MIM_DB` overrides only the database path. Files are not encrypted; SQLite messages, search excerpts and API keys are sensitive. Unix database and key file permissions are restricted to the user; Windows inherits filesystem ACLs and has not been security-tested. API keys are never returned to the UI.

## Agent and data flow

The UI calls a Rust backend using Tauri commands. Groq is primary (`qwen/qwen3.8-27b` by default); OpenRouter is an optional fallback (`openrouter/free` by default). Fallback sends conversation context and search results to OpenRouter and its selected provider. Free endpoints can be unavailable or rate-limited; a paid model override can incur costs. The sole model tool is Tavily web search. Requests for search and some freshness or filler cues force a first search. Retrieved content is untrusted; the model receives bounded excerpts and should cite sources.

SQLite stores conversations, timestamps, session associations and search-source metadata. A full-text index retrieves older matching questions in the CLI; desktop context is restricted to the current session. Context limits are byte-based approximations, not token limits. Search and source metadata are stored locally with new desktop answers; historical answers without saved sources cannot regain them. Session search, rename and confirmed delete are available; the UI loads at most 200 messages per session. A new session receives a four-word local provisional title, then a separate background Groq request attempts a 2–4 word title after the first successful response. User renames are not overwritten.

The desktop displays source excerpts associated with URLs cited in a passage and can show all retrieved sources. URL matching is not claim verification: a cited source may not support a claim, and uncited or older answers can be wrong. Rate-limit retries are bounded. `MIM_PROFILE=1` prints CLI wall time, provider HTTP time and the remainder. The remainder is not CPU-only time. Stop cancels the local request but cannot guarantee that a provider stops processing or billing.

## UI, shortcuts and known limitations

The desktop uses a compact borderless window with collapsible SOLO button, sessions, masked API-key settings, a response renderer and source inspector. It is not yet a top-center notch: a Wayland layer-shell attempt was disabled after the window became invisible. Alt+A works when configured by the user as a COSMIC custom shortcut pointing to the running binary with `--toggle`; the user reported this shortcut working before the overlay regression. System-wide shortcuts on macOS, Windows, and other Linux desktops have not been implemented or tested. Closing/reopening creates a new session. Cancellation, history and source rendering need broader interactive testing.

Other unfinished work includes claim-level source verification, exact token and monetary budgets, streaming, robust markdown/tables, a shared backend library instead of including the CLI module, multi-platform packaging/signing, automated desktop integration tests and real-world latency/recall benchmarks. The current source checks and prompts do not guarantee factual accuracy or resistance to prompt injection. The UI must not describe an unsupported claim as verified.

## Validation and performance

Linux development build: `cargo test --manifest-path desktop/Cargo.toml`, `cargo clippy --manifest-path desktop/Cargo.toml --all-targets -- -D warnings`, `node desktop/tests/sources.test.cjs`, and `cargo build --manifest-path desktop/Cargo.toml`. CLI tests use `cargo test`. For local context microbenchmarks run `cargo test --release profile_history_and_request_construction -- --ignored --nocapture`.

On the current Linux machine, one warm synthetic release-mode run with 10,000 in-memory messages averaged 7.2 µs per bounded history read and 7.7 µs per request JSON construction/serialization over 1,000 iterations. One isolated debug desktop launch showed the main process at 57,412 KiB RSS after four seconds; this excludes WebKit and other child processes, and the isolated desktop services logged warnings. These are small synthetic samples, not app-wide memory, startup, p95, end-to-end or cross-platform benchmarks. Provider latency and response quality vary and are not included.

Keep this document current, log decisions and test results in `WORKLOG.md`, and make small commits. Never record credentials or private reasoning.
