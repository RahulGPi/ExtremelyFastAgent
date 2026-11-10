# SOLO

SOLO is a small desktop chat agent with web search, local conversation history, and an optional terminal interface. The desktop app uses Rust and Tauri; Groq is the primary model provider, Tavily supplies web search, and OpenRouter can be used as a backup.

**Status:** Linux has been built and smoke-tested on COSMIC Wayland. **macOS and Windows have not been built or tested**; the instructions below are intended starting points, not a compatibility guarantee. SOLO currently runs from source; installers and signed releases are not available.

## What you need

- The project source on your computer and an internet connection to build and use the agent.
- A recent stable [Rust toolchain](https://www.rust-lang.org/tools/install), including Cargo. The project was built with Rust 1.95.
- A Groq API key and a Tavily API key. An OpenRouter API key is optional for fallback.
- Platform-specific Tauri dependencies described below. See [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/) for other Linux distributions and up-to-date instructions.

## Linux

On Ubuntu, Pop!_OS, or another Debian-based system, install the build dependencies:

```bash
sudo apt update
sudo apt install build-essential pkg-config curl wget file libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

Install Rust if necessary, then open a terminal in the project directory and run:

```bash
cd /path/to/mim_agent
cargo run --manifest-path desktop/Cargo.toml
```

For the local checkout on Rahul's laptop, the first command is `cd ~/Global_Programming/mim_agent`. The first build downloads and compiles dependencies and may take several minutes.

## macOS — untested

1. Install [Rust](https://www.rust-lang.org/tools/install).
2. Install Apple's command-line developer tools in Terminal:

   ```bash
   xcode-select --install
   ```

3. In Terminal, go to your copy of the project and run:

   ```bash
   cd /path/to/mim_agent
   cargo run --manifest-path desktop/Cargo.toml
   ```

macOS development, shortcut behavior, signing, and packaging have not been verified. You may need to install additional prerequisites listed in the Tauri documentation.

## Windows — untested

1. Install [Rust](https://www.rust-lang.org/tools/install) using the Windows installer.
2. Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++**, and install the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if it isn't already present.
3. Open PowerShell in your project directory and run:

   ```powershell
   cd C:\path\to\mim_agent
   cargo run --manifest-path desktop/Cargo.toml
   ```

Windows development, shortcut behavior, file permissions, and packaging have not been verified. If Cargo isn't recognized after installing Rust, reopen PowerShell.

## Configure API keys

1. Open the desktop app and select **Settings**.
2. Enter your **Groq** and **Tavily** keys. Enter an **OpenRouter** key if you want a backup provider.
3. Select **Save keys**. Saved keys are not displayed again. Leaving a field blank keeps its existing value.

Environment variables take precedence over saved settings. In a development checkout, settings are saved in `.env` in the project directory. The file is ignored by Git, but anyone who can read it can read the keys: don't post it or commit it. Data and keys are stored locally **without encryption**; on Unix the app restricts key-file and database permissions. Windows ACL behavior has not been verified.

When the app is run outside a source checkout, its default data directory is:

| Platform | Directory |
| --- | --- |
| Linux | `$XDG_CONFIG_HOME/SOLO`, or `~/.config/SOLO` if unset |
| macOS | `~/Library/Application Support/SOLO` |
| Windows | `%APPDATA%\SOLO` |

The database is named `mim.db`. Set `MIM_DB` to override its location. Your messages, timestamps, and saved source excerpts are stored there.

## Using SOLO

- Type a question and press **Enter** to send; **Shift+Enter** inserts a new line.
- **Sessions** lets you search, open, rename, and delete conversations. Every app launch starts a new session. The app creates a short title from the first question; if title generation fails, it keeps a local fallback. Reopened sessions currently display up to 200 messages.
- Select an answer passage to inspect any source explicitly linked to it, or select **View all search sources**. A citation does not guarantee a claim is correct; unlinked passages are unverified.
- **Stop** cancels a request locally. A provider may already have received or billed it.
- Use the collapse button to shrink the window and click **SOLO** to reopen it. Alt+A toggles the window while it has focus. A top-center notch and automatic global shortcut setup are not yet implemented.

On COSMIC, a global shortcut can be configured manually in **Settings → Keyboard → Shortcuts**. Bind Alt+A to the absolute path of the built desktop executable followed by `--toggle`. For the debug build on Rahul's laptop:

```text
/home/rahulpai/Global_Programming/mim_agent/desktop/target/debug/mim-desktop --toggle
```

The global shortcut is not tested on macOS, Windows, or other Linux desktops.

## Optional terminal interface

From the project directory:

```bash
cargo run --release
```

The CLI requires the same Groq and Tavily keys in `.env` or environment variables. Use `/help`, `/history`, `/history search words`, and `/quit`. To print timing diagnostics on Linux or macOS:

```bash
MIM_PROFILE=1 cargo run --release
```

In PowerShell, use `$env:MIM_PROFILE="1"` before running Cargo.

## Providers and reliability

Groq is the default provider. If an OpenRouter key is configured, SOLO can switch to it after certain Groq failures. The default backup model is `openrouter/free`; its availability and rate limits can vary. Configure `GROQ_MODEL` or `OPENROUTER_MODEL` through environment variables to override models. A paid OpenRouter model may incur charges. Conversation context and search results are sent to the selected model provider; search queries go to Tavily.

The agent can still produce incorrect or incomplete answers. Source-link checks are not claim-level fact verification. There are no built-in monetary budgets yet. A 429 error means the provider's rate limit was reached; SOLO retries some short waits, but longer limits may require waiting or changing the provider/account limits.

## Development checks

From the project directory:

```bash
cargo test
cargo test --manifest-path desktop/Cargo.toml
cargo clippy --manifest-path desktop/Cargo.toml --all-targets -- -D warnings
cargo build --manifest-path desktop/Cargo.toml
```

If Node.js is installed, run the source-link matching test with `node desktop/tests/sources.test.cjs`. Node.js is not required to run the current desktop app.

For architecture, data handling, known gaps, and benchmark limitations, see [design.md](design.md). Development notes are in [WORKLOG.md](WORKLOG.md).
