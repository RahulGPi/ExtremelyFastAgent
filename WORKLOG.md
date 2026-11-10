# Work log

## Initial implementation
- Chose Rust, SQLite, Groq and Tavily for a small local CLI and a single search tool.
- Inputs: user messages and provider credentials from environment. Outputs: chat answers, source links, token usage and local timestamped history. Credentials are not logged.
- Known gaps and next work are recorded in design.md.
- Validation: `cargo test` could not download dependencies because crates.io DNS was unavailable; `cargo test --offline` also failed because reqwest was not cached. Compilation and live provider behavior remain unverified.
- Retried with network access: dependencies downloaded and `cargo test` passed (2 tests). Live provider calls remain unverified.
- Push to the configured GitHub remote was blocked by automatic approval review pending confirmation of the destination and exported contents.
