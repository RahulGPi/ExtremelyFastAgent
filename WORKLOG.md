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
